import { Prisma } from "@prisma/client";

import type { OrderItemPayload } from "@/app/api/order/_schema";
import type { InvalidCartPayloadReason } from "@/lib/backend-i18n";
import { getLocalizedField } from "@/lib/i18n-utils";
import { prisma } from "@/lib/prisma";
import {
    type ProductForOrderPricing,
    resolveOrderLinePrice,
} from "@/lib/resolve-order-line-price";
import { type ApiErrorCode } from "@/shared/lib/api-error";

const PRODUCT_BASE_SELECT = {
    id: true,
    name: true,
    price: true,
    isActive: true,
    isAvailable: true,
    minQty: true,
    maxQty: true,
} as const;

const MODIFIER_GROUP_SELECT = Prisma.validator<Prisma.ModifierGroupSelect>()({
    id: true,
    productId: true,
    name: true,
    required: true,
    maxChoices: true,
    modifiers: {
        orderBy: [{ position: "asc" }, { id: "asc" }],
        select: { id: true, name: true, priceDelta: true },
    },
});

type ModifierGroupRow = Prisma.ModifierGroupGetPayload<{
    select: typeof MODIFIER_GROUP_SELECT;
}>;

type ProductBaseRow = {
    id: number;
    name: unknown;
    price: number;
    isActive: boolean;
    isAvailable: boolean;
    minQty: number;
    maxQty: number | null;
};

type CheckoutProductRow = ProductBaseRow & {
    modifierGroups: ProductForOrderPricing["modifierGroups"];
};

/**
 * Базовые поля товара + группы модификаторов только для productId,
 * у которых группы реально есть (дешёвый groupBy вместо nested join).
 */
async function fetchCheckoutProducts(
    productIds: number[],
): Promise<Map<number, CheckoutProductRow>> {
    if (productIds.length === 0) return new Map();

    const [baseProducts, groupedProductIds] = await Promise.all([
        prisma.product.findMany({
            where: { id: { in: productIds } },
            select: PRODUCT_BASE_SELECT,
        }),
        prisma.modifierGroup.groupBy({
            by: ["productId"],
            where: { productId: { in: productIds } },
        }),
    ]);

    const idsWithGroups = groupedProductIds.map((row) => row.productId);
    const modifierGroups: ModifierGroupRow[] =
        idsWithGroups.length > 0
            ? await prisma.modifierGroup.findMany({
                  where: { productId: { in: idsWithGroups } },
                  orderBy: [{ position: "asc" }, { id: "asc" }],
                  select: MODIFIER_GROUP_SELECT,
              })
            : [];

    const groupsByProduct = new Map<number, ModifierGroupRow[]>();
    for (const group of modifierGroups) {
        const list = groupsByProduct.get(group.productId) ?? [];
        list.push(group);
        groupsByProduct.set(group.productId, list);
    }

    return new Map(
        baseProducts.map((product) => [
            product.id,
            {
                ...product,
                modifierGroups: (groupsByProduct.get(product.id) ?? []).map(
                    (group) => {
                        const { productId, ...rest } = group;
                        void productId;
                        return rest;
                    },
                ),
            },
        ]),
    );
}

function toPricingProduct(product: CheckoutProductRow): ProductForOrderPricing {
    return {
        id: product.id,
        price: product.price,
        modifierGroups: product.modifierGroups,
    };
}

function validateLineQuantity(
    line: CartLineInput,
    product: ProductBaseRow,
): CartLineValidation | null {
    if (
        line.quantity < (product.minQty ?? 1) ||
        (product.maxQty != null && line.quantity > product.maxQty)
    ) {
        return { cartItemId: line.cartItemId, ok: false, reason: "inactive" };
    }
    return null;
}

/**
 * Внутренний формат item-а после серверного пересчёта: цена и snapshot
 * пересобраны из БД, никаких клиентских значений.
 */
export type VerifiedOrderItem = {
    productId: number;
    name: string;
    price: number;
    quantity: number;
    selectedModifiers: Prisma.InputJsonValue;
};

export type PrepareItemsFailure = {
    ok: false;
    httpStatus: number;
    code: ApiErrorCode;
    params?: Record<string, string | number>;
    invalidReason?: InvalidCartPayloadReason;
};

export type PrepareItemsResult =
    | { ok: true; items: VerifiedOrderItem[]; total: number }
    | PrepareItemsFailure;

/**
 * Сверяет позиции корзины с БД, проверяет правила модификаторов
 * и возвращает items с пересчитанными ценами + готовыми snapshot-ами.
 */
export async function prepareOrderItems(
    items: OrderItemPayload[],
    locale = "hy",
): Promise<PrepareItemsResult> {
    const uniqueIds = Array.from(new Set(items.map((item) => item.productId)));

    const productMap = await fetchCheckoutProducts(uniqueIds);

    const validatedItems: VerifiedOrderItem[] = [];

    for (const item of items) {
        const product = productMap.get(item.productId);

        if (!product) {
            return {
                ok: false,
                httpStatus: 409,
                code: "ITEM_UNAVAILABLE",
                params: { name: item.name },
            };
        }

        const productName = getLocalizedField(product.name, locale);

        if (!product.isActive || product.isAvailable === false) {
            return {
                ok: false,
                httpStatus: 409,
                code: "ITEM_UNAVAILABLE",
                params: { name: productName },
            };
        }

        if (
            item.quantity < (product.minQty ?? 1) ||
            (product.maxQty != null && item.quantity > product.maxQty)
        ) {
            return {
                ok: false,
                httpStatus: 409,
                code: "ITEM_UNAVAILABLE",
                params: { name: productName },
            };
        }

        const priced = resolveOrderLinePrice(
            toPricingProduct(product),
            item.selectedModifierIds,
            locale,
        );

        if (!priced.ok) {
            const httpStatus = priced.code === "invalid_payload" ? 400 : 422;
            return {
                ok: false,
                httpStatus,
                code: priced.apiCode,
                params: priced.params,
                invalidReason: priced.invalidReason,
            };
        }

        validatedItems.push({
            productId: product.id,
            name: productName,
            price: priced.unitPrice,
            quantity: item.quantity,
            selectedModifiers:
                priced.snapshot as unknown as Prisma.InputJsonValue,
        });
    }

    const total = validatedItems.reduce(
        (sum, item) => sum + item.price * item.quantity,
        0,
    );

    return { ok: true, items: validatedItems, total };
}

export type CartLineValidationReason =
    | "inactive"
    | "not_found"
    | "price_mismatch"
    | "invalid_payload"
    | "rule_violation";

export type CartLineValidation = {
    cartItemId: string;
    ok: boolean;
    reason?: CartLineValidationReason;
    serverUnitPrice?: number;
};

export type CartLineInput = {
    cartItemId: string;
    productId: number;
    price: number;
    quantity: number;
    selectedModifierIds?: number[];
};

/**
 * Построчная проверка корзины для чекаута (без раннего прерывания).
 */
export async function validateCartLinesForCheckout(
    lines: CartLineInput[],
    locale = "hy",
): Promise<CartLineValidation[]> {
    if (lines.length === 0) return [];

    const uniqueIds = Array.from(new Set(lines.map((l) => l.productId)));
    const productMap = await fetchCheckoutProducts(uniqueIds);

    return lines.map((line): CartLineValidation => {
        const product = productMap.get(line.productId);

        if (!product) {
            return { cartItemId: line.cartItemId, ok: false, reason: "not_found" };
        }

        if (!product.isActive || product.isAvailable === false) {
            return { cartItemId: line.cartItemId, ok: false, reason: "inactive" };
        }

        const quantityIssue = validateLineQuantity(line, product);
        if (quantityIssue) return quantityIssue;

        const priced = resolveOrderLinePrice(
            toPricingProduct(product),
            line.selectedModifierIds ?? [],
            locale,
        );

        if (!priced.ok) {
            return {
                cartItemId: line.cartItemId,
                ok: false,
                reason: priced.code,
            };
        }

        if (priced.unitPrice !== line.price) {
            return {
                cartItemId: line.cartItemId,
                ok: false,
                reason: "price_mismatch",
                serverUnitPrice: priced.unitPrice,
            };
        }

        return { cartItemId: line.cartItemId, ok: true };
    });
}
