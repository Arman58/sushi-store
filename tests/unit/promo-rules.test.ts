import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { adminPromoCreateSchema, adminPromoPatchSchema, validatePromoBodySchema } from "@/lib/api-schemas";
import { computePromoDiscountAmount, getPromoRejectionCode, type PromoForEvaluation } from "@/lib/promo";
import {
    getPromoKind,
    parsePromoActions,
    parsePromoConditions,
    promoCategoryIds,
    shouldDeferNoDiscountRejection,
    validatePromoActionValues,
    validatePromoDiscount,
} from "@/lib/promo-rules";

const FREE = [{ type: "FREE_DELIVERY" }];
const CAT = [{ type: "DISCOUNT_ON_CATEGORY", categoryId: 7, discountType: "PERCENTAGE", value: 15 }];

describe("parsePromoActions / parsePromoConditions", () => {
    it("оставляет только известные и корректные записи", () => {
        assert.deepEqual(
            parsePromoActions([
                ...FREE,
                ...CAT,
                { type: "UNKNOWN" },
                { type: "DISCOUNT_ON_CATEGORY", categoryId: "x", discountType: "PERCENTAGE", value: 5 },
                { type: "DISCOUNT_ON_CATEGORY", categoryId: 1, discountType: "WEIRD", value: 5 },
                null,
                "str",
            ]),
            [...FREE, ...CAT],
        );
        assert.deepEqual(parsePromoActions(null), []);
        assert.deepEqual(parsePromoActions({ type: "FREE_DELIVERY" }), []);
    });

    it("условия: только CATEGORY_INCLUDES с положительным id", () => {
        assert.deepEqual(
            parsePromoConditions([{ type: "CATEGORY_INCLUDES", categoryId: 3 }, { type: "CATEGORY_INCLUDES", categoryId: 0 }, { type: "X" }]),
            [{ type: "CATEGORY_INCLUDES", categoryId: 3 }],
        );
    });
});

describe("getPromoKind / promoCategoryIds", () => {
    it("определяет вид акции", () => {
        assert.equal(getPromoKind({ actions: null }), "standard");
        assert.equal(getPromoKind({ actions: [] }), "standard");
        assert.equal(getPromoKind({ actions: FREE }), "free_delivery");
        assert.equal(getPromoKind({ actions: CAT }), "category");
        assert.equal(getPromoKind({ actions: [...FREE, ...CAT] }), "category");
    });

    it("собирает категории из акций и условий без дублей", () => {
        assert.deepEqual(
            promoCategoryIds({ actions: CAT, conditions: [{ type: "CATEGORY_INCLUDES", categoryId: 7 }, { type: "CATEGORY_INCLUDES", categoryId: 9 }] }).sort(),
            [7, 9],
        );
        assert.deepEqual(promoCategoryIds({}), []);
    });
});

describe("validatePromoDiscount", () => {
    it("процент больше 100 недопустим", () => {
        assert.equal(validatePromoDiscount("PERCENTAGE", 101, { hasActions: false }), "percentOutOfRange");
        assert.equal(validatePromoDiscount("PERCENTAGE", 100, { hasActions: false }), null);
    });

    it("фиксированная сумма может быть любой положительной", () => {
        assert.equal(validatePromoDiscount("FIXED", 5000, { hasActions: false }), null);
    });

    it("обычная скидка обязана быть > 0, акция с actions - может быть 0", () => {
        assert.equal(validatePromoDiscount("FIXED", 0, { hasActions: false }), "valueRequired");
        assert.equal(validatePromoDiscount("PERCENTAGE", 0, { hasActions: false }), "valueRequired");
        assert.equal(validatePromoDiscount("PERCENTAGE", 0, { hasActions: true }), null);
    });

    it("процент внутри акции на категорию тоже <= 100", () => {
        assert.equal(validatePromoActionValues(parsePromoActions(CAT)), null);
        assert.equal(
            validatePromoActionValues([{ type: "DISCOUNT_ON_CATEGORY", categoryId: 1, discountType: "PERCENTAGE", value: 150 }]),
            "percentOutOfRange",
        );
        assert.equal(
            validatePromoActionValues([{ type: "DISCOUNT_ON_CATEGORY", categoryId: 1, discountType: "FIXED", value: 150 }]),
            null,
        );
    });
});

describe("shouldDeferNoDiscountRejection (бесплатная доставка в корзине)", () => {
    const base = { deliveryKnown: false, rejectionCode: "noDiscount", promo: { actions: FREE } };

    it("откладываем только noDiscount у бесплатной доставки, когда доставка ещё неизвестна", () => {
        assert.equal(shouldDeferNoDiscountRejection(base), true);
    });

    it("чекаут (доставка известна) проверяет строго", () => {
        assert.equal(shouldDeferNoDiscountRejection({ ...base, deliveryKnown: true }), false);
    });

    it("другие причины отклонения не откладываются", () => {
        for (const rejectionCode of ["expired", "usedUp", "belowMin", "inactive", "conditionsNotMet", "notFound"]) {
            assert.equal(shouldDeferNoDiscountRejection({ ...base, rejectionCode }), false, rejectionCode);
        }
    });

    it("обычный промокод и несуществующий не откладываются", () => {
        assert.equal(shouldDeferNoDiscountRejection({ ...base, promo: { actions: null } }), false);
        assert.equal(shouldDeferNoDiscountRejection({ ...base, promo: { actions: CAT } }), false);
        assert.equal(shouldDeferNoDiscountRejection({ ...base, promo: null }), false);
    });
});

describe("adminPromoCreateSchema", () => {
    const ok = { code: "SPRING", discountType: "PERCENTAGE", discountValue: 10 };

    it("принимает обычную скидку", () => {
        assert.equal(adminPromoCreateSchema.safeParse(ok).success, true);
        assert.equal(adminPromoCreateSchema.safeParse({ ...ok, discountType: "FIXED", discountValue: 5000 }).success, true);
    });

    it("отклоняет процент больше 100 и нулевую обычную скидку", () => {
        assert.equal(adminPromoCreateSchema.safeParse({ ...ok, discountValue: 150 }).success, false);
        assert.equal(adminPromoCreateSchema.safeParse({ ...ok, discountValue: 0 }).success, false);
        assert.equal(adminPromoCreateSchema.safeParse({ ...ok, discountValue: -5 }).success, false);
    });

    it("принимает бесплатную доставку и скидку на категорию с discountValue 0", () => {
        assert.equal(adminPromoCreateSchema.safeParse({ ...ok, discountValue: 0, actions: FREE }).success, true);
        assert.equal(
            adminPromoCreateSchema.safeParse({
                ...ok,
                discountValue: 0,
                actions: CAT,
                conditions: [{ type: "CATEGORY_INCLUDES", categoryId: 7 }],
            }).success,
            true,
        );
    });

    it("отклоняет процент больше 100 внутри акции на категорию и неизвестные акции", () => {
        assert.equal(
            adminPromoCreateSchema.safeParse({
                ...ok,
                discountValue: 0,
                actions: [{ type: "DISCOUNT_ON_CATEGORY", categoryId: 7, discountType: "PERCENTAGE", value: 120 }],
            }).success,
            false,
        );
        assert.equal(adminPromoCreateSchema.safeParse({ ...ok, actions: [{ type: "TELEPORT" }] }).success, false);
        assert.equal(
            adminPromoCreateSchema.safeParse({ ...ok, actions: [{ type: "DISCOUNT_ON_CATEGORY", categoryId: 0, discountType: "FIXED", value: 1 }] }).success,
            false,
        );
    });
});

describe("adminPromoPatchSchema", () => {
    it("разрешает сбросить акции и условия через null", () => {
        assert.equal(adminPromoPatchSchema.safeParse({ actions: null, conditions: null }).success, true);
        assert.equal(adminPromoPatchSchema.safeParse({ actions: [] }).success, true);
    });

    it("пустое тело отклоняется", () => {
        assert.equal(adminPromoPatchSchema.safeParse({}).success, false);
    });
});

describe("validatePromoBodySchema.deliveryKnown", () => {
    const base = { code: "X", cartAmount: 1000 };

    it("по умолчанию доставка известна (чекаут проверяет строго)", () => {
        const r = validatePromoBodySchema.safeParse(base);
        assert.ok(r.success);
        assert.equal(r.data.deliveryKnown, true);
    });

    it("корзина передаёт false", () => {
        const r = validatePromoBodySchema.safeParse({ ...base, deliveryKnown: false });
        assert.ok(r.success);
        assert.equal(r.data.deliveryKnown, false);
    });
});

describe("движок скидок с видами акций из редактора", () => {
    const promo = (over: Partial<PromoForEvaluation>): PromoForEvaluation => ({
        discountType: "PERCENTAGE", discountValue: 0, minOrderAmount: null, maxUsages: null, timesUsed: 0,
        expiresAt: null, isActive: true, conditions: null, actions: null, ...over,
    });
    const ctx = (items?: Array<{ productId: number; quantity: number; price: number; categoryId: number }>) => ({
        cartSubtotal: 10000, grandTotalBeforeDiscount: 10500, deliveryAmount: 500, items,
    });

    it("бесплатная доставка снимает ровно стоимость доставки", () => {
        const p = promo({ actions: FREE });
        assert.equal(getPromoRejectionCode(p, ctx()), null);
        assert.equal(computePromoDiscountAmount(p, 10000, 10500, 500), 500);
    });

    it("бесплатная доставка при нулевой доставке - noDiscount (самовывоз / бесплатная зона)", () => {
        const p = promo({ actions: FREE });
        assert.equal(getPromoRejectionCode(p, { cartSubtotal: 10000, grandTotalBeforeDiscount: 10000, deliveryAmount: 0 })?.code, "noDiscount");
    });

    it("скидка на категорию считается только с товаров этой категории и требует их наличия", () => {
        const p = promo({
            actions: CAT,
            conditions: [{ type: "CATEGORY_INCLUDES", categoryId: 7 }],
        });
        const withCat = [
            { productId: 1, quantity: 2, price: 2000, categoryId: 7 }, // 4000
            { productId: 2, quantity: 1, price: 6000, categoryId: 3 },
        ];
        assert.equal(getPromoRejectionCode(p, ctx(withCat)), null);
        assert.equal(computePromoDiscountAmount(p, 10000, 10500, 500, withCat), 600); // 15% от 4000
        assert.equal(
            getPromoRejectionCode(p, ctx([{ productId: 2, quantity: 1, price: 10000, categoryId: 3 }]))?.code,
            "conditionsNotMet",
        );
        // без списка товаров условие по категории не проверить - именно так отклонялась корзина
        assert.equal(getPromoRejectionCode(p, ctx(undefined))?.code, "conditionsNotMet");
    });
});
