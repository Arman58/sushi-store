import { Prisma } from "@prisma/client";

import type { OrderItemPayload } from "@/app/api/order/_schema";
import { prisma } from "@/lib/prisma";
import { resolveOrderLinePrice } from "@/lib/resolve-order-line-price";

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

export type PrepareItemsResult =
    | { ok: true; items: VerifiedOrderItem[]; total: number }
    | { ok: false; message: string; httpStatus: number };

/**
 * Сверяет позиции корзины с БД, проверяет правила модификаторов
 * и возвращает items с пересчитанными ценами + готовыми snapshot-ами.
 */
export async function prepareOrderItems(
    items: OrderItemPayload[],
): Promise<PrepareItemsResult> {
    const uniqueIds = Array.from(new Set(items.map((item) => item.productId)));

    const products = await prisma.product.findMany({
        where: { id: { in: uniqueIds } },
        select: {
            id: true,
            name: true,
            price: true,
            isActive: true,
            modifierGroups: {
                orderBy: [{ position: "asc" }, { id: "asc" }],
                select: {
                    id: true,
                    name: true,
                    required: true,
                    maxChoices: true,
                    modifiers: {
                        orderBy: [{ position: "asc" }, { id: "asc" }],
                        select: { id: true, name: true, priceDelta: true },
                    },
                },
            },
        },
    });

    const productMap = new Map(products.map((p) => [p.id, p]));

    const validatedItems: VerifiedOrderItem[] = [];

    for (const item of items) {
        const product = productMap.get(item.productId);

        if (!product) {
            return {
                ok: false,
                httpStatus: 409,
                message: `Товар «${item.name}» недоступен. Удалите его из корзины.`,
            };
        }

        if (!product.isActive) {
            return {
                ok: false,
                httpStatus: 409,
                message: `Товар «${product.name}» сейчас недоступен. Удалите его из корзины.`,
            };
        }

        const priced = resolveOrderLinePrice(
            {
                id: product.id,
                price: product.price,
                modifierGroups: product.modifierGroups,
            },
            item.selectedModifierIds,
        );

        if (!priced.ok) {
            const httpStatus = priced.code === "invalid_payload" ? 400 : 422;
            return { ok: false, httpStatus, message: priced.message };
        }

        validatedItems.push({
            productId: product.id,
            name: product.name,
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
): Promise<CartLineValidation[]> {
    if (lines.length === 0) return [];

    const uniqueIds = Array.from(new Set(lines.map((l) => l.productId)));

    const products = await prisma.product.findMany({
        where: { id: { in: uniqueIds } },
        select: {
            id: true,
            name: true,
            price: true,
            isActive: true,
            modifierGroups: {
                orderBy: [{ position: "asc" }, { id: "asc" }],
                select: {
                    id: true,
                    name: true,
                    required: true,
                    maxChoices: true,
                    modifiers: {
                        orderBy: [{ position: "asc" }, { id: "asc" }],
                        select: { id: true, name: true, priceDelta: true },
                    },
                },
            },
        },
    });

    const productMap = new Map(products.map((p) => [p.id, p]));

    return lines.map((line): CartLineValidation => {
        const product = productMap.get(line.productId);

        if (!product) {
            return { cartItemId: line.cartItemId, ok: false, reason: "not_found" };
        }

        if (!product.isActive) {
            return { cartItemId: line.cartItemId, ok: false, reason: "inactive" };
        }

        const priced = resolveOrderLinePrice(
            {
                id: product.id,
                price: product.price,
                modifierGroups: product.modifierGroups,
            },
            line.selectedModifierIds ?? [],
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
