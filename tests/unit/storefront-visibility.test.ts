import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { isProductVisibleToCustomers, storefrontProductVisible } from "@/lib/storefront-visibility";

describe("isProductVisibleToCustomers", () => {
    it("активный товар в активной категории виден", () => {
        assert.equal(isProductVisibleToCustomers({ isActive: true, category: { isActive: true } }), true);
    });

    it("скрытая категория скрывает товар", () => {
        assert.equal(isProductVisibleToCustomers({ isActive: true, category: { isActive: false } }), false);
    });

    it("снятый с витрины товар не виден независимо от категории", () => {
        assert.equal(isProductVisibleToCustomers({ isActive: false, category: { isActive: true } }), false);
        assert.equal(isProductVisibleToCustomers({ isActive: false, category: null }), false);
    });

    it("товар без категории не прячем (не теряем продажи из-за ошибки данных)", () => {
        assert.equal(isProductVisibleToCustomers({ isActive: true, category: null }), true);
        assert.equal(isProductVisibleToCustomers({ isActive: true }), true);
    });
});

describe("storefrontProductVisible (Prisma where)", () => {
    it("требует активный товар и (нет категории ИЛИ категория активна)", () => {
        assert.equal(storefrontProductVisible.isActive, true);
        assert.deepEqual(storefrontProductVisible.OR, [
            { categoryId: null },
            { category: { isActive: true } },
        ]);
    });
});
