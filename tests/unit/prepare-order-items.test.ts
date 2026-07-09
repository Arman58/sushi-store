import assert from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";

import type { OrderItemPayload } from "@/app/api/order/_schema";
import {
    prepareOrderItems,
    validateCartLinesForCheckout,
} from "@/lib/prepare-order-items";

/**
 * prisma в src/lib/prisma.ts - ленивый Proxy, который в non-production
 * берёт клиент из globalThis.prisma. Подсовываем мок до первого обращения.
 */
type MockProduct = {
    id: number;
    name: unknown;
    price: number;
    isActive: boolean;
    isAvailable: boolean | null;
    minQty: number | null;
    maxQty: number | null;
    modifierGroups: Array<{
        id: number;
        name: unknown;
        required: boolean;
        maxChoices: number;
        modifiers: Array<{ id: number; name: unknown; priceDelta: number }>;
    }>;
};

let mockProducts: MockProduct[] = [];

(globalThis as unknown as { prisma: unknown }).prisma = {
    // proxy-клиент проверяет наличие deliveryZone (staleness check)
    deliveryZone: {},
    $disconnect: async () => {},
    product: {
        findMany: async () =>
            mockProducts.map((product) => {
                const { modifierGroups: _modifierGroups, ...base } = product;
                void _modifierGroups;
                return base;
            }),
    },
    modifierGroup: {
        groupBy: async () =>
            mockProducts
                .filter((product) => product.modifierGroups.length > 0)
                .map((product) => ({ productId: product.id })),
        findMany: async () => {
            const rows: Array<{
                id: number;
                productId: number;
                name: unknown;
                required: boolean;
                maxChoices: number;
                modifiers: Array<{ id: number; name: unknown; priceDelta: number }>;
            }> = [];
            for (const product of mockProducts) {
                for (const group of product.modifierGroups) {
                    rows.push({
                        productId: product.id,
                        ...group,
                    });
                }
            }
            return rows;
        },
    },
};

function makeProduct(overrides: Partial<MockProduct> = {}): MockProduct {
    return {
        id: 1,
        name: "Филадельфия",
        price: 4500,
        isActive: true,
        isAvailable: true,
        minQty: 1,
        maxQty: null,
        modifierGroups: [],
        ...overrides,
    };
}

function makeItem(overrides: Partial<OrderItemPayload> = {}): OrderItemPayload {
    return {
        productId: 1,
        name: "Филадельфия",
        price: 4500,
        quantity: 2,
        selectedModifierIds: [],
        ...overrides,
    } as OrderItemPayload;
}

beforeEach(() => {
    mockProducts = [];
});

describe("prepareOrderItems", () => {
    it("пересчитывает total из цен БД, игнорируя клиентскую цену", async () => {
        mockProducts = [makeProduct({ price: 5000 })];
        const r = await prepareOrderItems([
            makeItem({ price: 1 /* подмена клиентом */, quantity: 2 }),
        ]);
        assert.ok(r.ok);
        assert.equal(r.total, 10000);
        assert.equal(r.items[0].price, 5000);
    });

    it("неизвестный товар → 409 ITEM_UNAVAILABLE", async () => {
        const r = await prepareOrderItems([makeItem({ productId: 999 })]);
        assert.ok(!r.ok);
        assert.equal(r.httpStatus, 409);
        assert.equal(r.code, "ITEM_UNAVAILABLE");
    });

    it("снятый с витрины товар → 409", async () => {
        mockProducts = [makeProduct({ isActive: false })];
        const r = await prepareOrderItems([makeItem()]);
        assert.ok(!r.ok);
        assert.equal(r.httpStatus, 409);
    });

    it("стоп-лист (isAvailable=false) → 409", async () => {
        mockProducts = [makeProduct({ isAvailable: false })];
        const r = await prepareOrderItems([makeItem()]);
        assert.ok(!r.ok);
        assert.equal(r.httpStatus, 409);
    });

    it("quantity ниже minQty → 409", async () => {
        mockProducts = [makeProduct({ minQty: 3 })];
        const r = await prepareOrderItems([makeItem({ quantity: 2 })]);
        assert.ok(!r.ok);
        assert.equal(r.httpStatus, 409);
    });

    it("quantity выше maxQty → 409", async () => {
        mockProducts = [makeProduct({ maxQty: 5 })];
        const r = await prepareOrderItems([makeItem({ quantity: 6 })]);
        assert.ok(!r.ok);
        assert.equal(r.httpStatus, 409);
    });

    it("модификаторы входят в цену и snapshot", async () => {
        mockProducts = [
            makeProduct({
                modifierGroups: [
                    {
                        id: 10,
                        name: "Соус",
                        required: false,
                        maxChoices: 0,
                        modifiers: [
                            { id: 101, name: "Спайси", priceDelta: 200 },
                        ],
                    },
                ],
            }),
        ];
        const r = await prepareOrderItems([
            makeItem({ selectedModifierIds: [101], quantity: 1 }),
        ]);
        assert.ok(r.ok);
        assert.equal(r.total, 4700);
        const snapshot = r.items[0].selectedModifiers as Array<{ id: number }>;
        assert.equal(snapshot[0].id, 101);
    });

    it("required группа без выбора → 422", async () => {
        mockProducts = [
            makeProduct({
                modifierGroups: [
                    {
                        id: 10,
                        name: "Соус",
                        required: true,
                        maxChoices: 1,
                        modifiers: [
                            { id: 101, name: "Спайси", priceDelta: 0 },
                        ],
                    },
                ],
            }),
        ];
        const r = await prepareOrderItems([makeItem()]);
        assert.ok(!r.ok);
        assert.equal(r.httpStatus, 422);
    });

    it("чужой модификатор → 400 invalid_payload", async () => {
        mockProducts = [makeProduct()];
        const r = await prepareOrderItems([
            makeItem({ selectedModifierIds: [999] }),
        ]);
        assert.ok(!r.ok);
        assert.equal(r.httpStatus, 400);
    });
});

describe("validateCartLinesForCheckout", () => {
    const line = {
        cartItemId: "c1",
        productId: 1,
        price: 4500,
        quantity: 1,
    };

    it("валидная строка проходит", async () => {
        mockProducts = [makeProduct()];
        const [r] = await validateCartLinesForCheckout([line]);
        assert.deepEqual(r, { cartItemId: "c1", ok: true });
    });

    it("расхождение цены → price_mismatch + серверная цена", async () => {
        mockProducts = [makeProduct({ price: 5000 })];
        const [r] = await validateCartLinesForCheckout([line]);
        assert.equal(r.ok, false);
        assert.equal(r.reason, "price_mismatch");
        assert.equal(r.serverUnitPrice, 5000);
    });

    it("не найден / снят с витрины", async () => {
        mockProducts = [makeProduct({ isActive: false, id: 2 })];
        const [notFound, inactive] = await validateCartLinesForCheckout([
            line,
            { ...line, cartItemId: "c2", productId: 2 },
        ]);
        assert.equal(notFound.reason, "not_found");
        assert.equal(inactive.reason, "inactive");
    });

    it("пустой список → пустой результат без запроса в БД", async () => {
        const r = await validateCartLinesForCheckout([]);
        assert.deepEqual(r, []);
    });
});
