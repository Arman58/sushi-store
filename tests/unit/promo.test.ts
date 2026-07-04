import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
    computePromoDiscountAmount,
    getPromoRejectionReason,
    normalizePromoCode,
    type PromoForEvaluation,
} from "@/lib/promo";

function makePromo(
    overrides: Partial<PromoForEvaluation> = {},
): PromoForEvaluation {
    return {
        discountType: "PERCENTAGE",
        discountValue: 10,
        minOrderAmount: null,
        maxUsages: null,
        timesUsed: 0,
        expiresAt: null,
        isActive: true,
        ...overrides,
    };
}

const opts = { cartSubtotal: 10000, grandTotalBeforeDiscount: 11000 };

describe("normalizePromoCode", () => {
    it("убирает пробелы и приводит к верхнему регистру", () => {
        assert.equal(normalizePromoCode("  su shi 10 "), "SUSHI10");
    });
});

describe("getPromoRejectionReason", () => {
    it("null промокод → не найден", () => {
        assert.equal(getPromoRejectionReason(null, opts), "Промокод не найден");
    });

    it("валидный активный промокод проходит", () => {
        assert.equal(getPromoRejectionReason(makePromo(), opts), null);
    });

    it("неактивный отклоняется", () => {
        assert.match(
            getPromoRejectionReason(makePromo({ isActive: false }), opts) ?? "",
            /неактивен/,
        );
    });

    it("истёкший отклоняется", () => {
        const promo = makePromo({ expiresAt: new Date("2026-01-01") });
        assert.match(
            getPromoRejectionReason(promo, {
                ...opts,
                now: new Date("2026-02-01"),
            }) ?? "",
            /истёк/,
        );
    });

    it("ещё не истёкший проходит", () => {
        const promo = makePromo({ expiresAt: new Date("2026-03-01") });
        assert.equal(
            getPromoRejectionReason(promo, {
                ...opts,
                now: new Date("2026-02-01"),
            }),
            null,
        );
    });

    it("исчерпан лимит использований", () => {
        const promo = makePromo({ maxUsages: 5, timesUsed: 5 });
        assert.notEqual(getPromoRejectionReason(promo, opts), null);
    });

    it("minOrderAmount сравнивается с суммой позиций, не с итогом", () => {
        const promo = makePromo({ minOrderAmount: 10500 });
        // cartSubtotal 10000 < 10500, хотя grandTotal 11000 > 10500
        assert.notEqual(getPromoRejectionReason(promo, opts), null);
    });

    it("процент вне 0..100 → настроен некорректно", () => {
        const promo = makePromo({ discountValue: 150 });
        assert.match(
            getPromoRejectionReason(promo, opts) ?? "",
            /некорректно/,
        );
    });

    it("отрицательный FIXED → настроен некорректно", () => {
        const promo = makePromo({ discountType: "FIXED", discountValue: -100 });
        assert.match(
            getPromoRejectionReason(promo, opts) ?? "",
            /некорректно/,
        );
    });

    it("нулевая скидка отклоняется", () => {
        const promo = makePromo({ discountValue: 0 });
        assert.notEqual(getPromoRejectionReason(promo, opts), null);
    });
});

describe("computePromoDiscountAmount", () => {
    it("PERCENTAGE считается от cartSubtotal с округлением вниз", () => {
        const promo = makePromo({ discountValue: 15 });
        // 10005 * 15% = 1500.75 → 1500
        assert.equal(computePromoDiscountAmount(promo, 10005, 11005), 1500);
    });

    it("FIXED возвращает discountValue", () => {
        const promo = makePromo({ discountType: "FIXED", discountValue: 700 });
        assert.equal(computePromoDiscountAmount(promo, 10000, 11000), 700);
    });

    it("скидка не превышает итог до скидки (итог не уходит в минус)", () => {
        const promo = makePromo({ discountType: "FIXED", discountValue: 99999 });
        assert.equal(computePromoDiscountAmount(promo, 10000, 11000), 11000);
    });

    it("пустая корзина → 0", () => {
        assert.equal(computePromoDiscountAmount(makePromo(), 0, 0), 0);
    });
});
