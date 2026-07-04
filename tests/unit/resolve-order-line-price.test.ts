import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
    type ProductForOrderPricing,
    resolveOrderLinePrice,
} from "@/lib/resolve-order-line-price";
import { API_ERROR_CODES } from "@/shared/lib/api-error";

function makeProduct(
    overrides: Partial<ProductForOrderPricing> = {},
): ProductForOrderPricing {
    return {
        id: 1,
        price: 3000,
        modifierGroups: [
            {
                id: 10,
                name: "Соус",
                required: true,
                maxChoices: 2,
                modifiers: [
                    { id: 101, name: "Соевый", priceDelta: 0 },
                    { id: 102, name: "Спайси", priceDelta: 200 },
                    { id: 103, name: "Унаги", priceDelta: 300 },
                ],
            },
            {
                id: 20,
                name: "Допы",
                required: false,
                maxChoices: 0,
                modifiers: [{ id: 201, name: "Имбирь", priceDelta: 100 }],
            },
        ],
        ...overrides,
    };
}

describe("resolveOrderLinePrice", () => {
    it("база + сумма priceDelta выбранных модификаторов", () => {
        const r = resolveOrderLinePrice(makeProduct(), [102, 201]);
        assert.ok(r.ok);
        assert.equal(r.unitPrice, 3000 + 200 + 100);
        assert.deepEqual(
            r.snapshot.map((s) => s.id),
            [102, 201],
        );
    });

    it("товар без групп и без выбора → база", () => {
        const r = resolveOrderLinePrice(
            makeProduct({ modifierGroups: [] }),
            [],
        );
        assert.ok(r.ok);
        assert.equal(r.unitPrice, 3000);
    });

    it("дубль модификатора → invalid_payload/duplicate_modifier", () => {
        const r = resolveOrderLinePrice(makeProduct(), [102, 102]);
        assert.ok(!r.ok);
        assert.equal(r.code, "invalid_payload");
        assert.equal(r.invalidReason, "duplicate_modifier");
    });

    it("чужой модификатор → invalid_payload/foreign_modifier", () => {
        const r = resolveOrderLinePrice(makeProduct(), [101, 999]);
        assert.ok(!r.ok);
        assert.equal(r.invalidReason, "foreign_modifier");
    });

    it("опции для товара без групп → invalid_payload", () => {
        const r = resolveOrderLinePrice(
            makeProduct({ modifierGroups: [] }),
            [101],
        );
        assert.ok(!r.ok);
        assert.equal(r.code, "invalid_payload");
        // NB: ветка "unexpected_modifiers" недостижима — foreign_modifier
        // проверяется раньше и перехватывает этот случай.
        assert.equal(r.invalidReason, "foreign_modifier");
    });

    it("required группа без выбора → REQUIRED_MODIFIER_MISSING (422)", () => {
        const r = resolveOrderLinePrice(makeProduct(), [201]);
        assert.ok(!r.ok);
        assert.equal(r.code, "rule_violation");
        assert.equal(r.apiCode, API_ERROR_CODES.REQUIRED_MODIFIER_MISSING);
    });

    it("превышение maxChoices → MODIFIER_LIMIT_EXCEEDED", () => {
        const r = resolveOrderLinePrice(makeProduct(), [101, 102, 103]);
        assert.ok(!r.ok);
        assert.equal(r.apiCode, API_ERROR_CODES.MODIFIER_LIMIT_EXCEEDED);
    });

    it("maxChoices=0 значит без лимита", () => {
        const product = makeProduct();
        product.modifierGroups[0].maxChoices = 0;
        const r = resolveOrderLinePrice(product, [101, 102, 103]);
        assert.ok(r.ok);
        assert.equal(r.unitPrice, 3000 + 0 + 200 + 300);
    });

    it("отрицательный priceDelta уменьшает цену", () => {
        const product = makeProduct();
        product.modifierGroups[1].modifiers[0].priceDelta = -500;
        const r = resolveOrderLinePrice(product, [101, 201]);
        assert.ok(r.ok);
        assert.equal(r.unitPrice, 2500);
    });
});
