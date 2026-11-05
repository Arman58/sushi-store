import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
    buildBaseWhere,
    buildOrderBy,
    buildOrdersWhere,
    type OrderFilters,
} from "../../src/app/admin/(dashboard)/orders/orders-query";

const none: OrderFilters = { delivery: "all", payment: "all", status: "all", dateRange: "all", q: "" };
const and = (where: ReturnType<typeof buildOrdersWhere>) => (where.AND ?? []) as Record<string, unknown>[];

describe("buildBaseWhere", () => {
    it("без фильтров условий нет", () => {
        assert.deepEqual(buildBaseWhere(none), {});
    });

    it("«новые» включают заказы на подтверждении (раньше экспорт их терял)", () => {
        assert.deepEqual(buildBaseWhere({ ...none, status: "new" }).status, {
            in: ["PENDING_APPROVAL", "NEW"],
        });
    });

    it("доставка, оплата и остальные статусы", () => {
        const w = buildBaseWhere({ delivery: "pickup", payment: "card", status: "in_progress" });
        assert.equal(w.delivery, "PICKUP");
        assert.equal(w.payment, "CARD");
        assert.deepEqual(w.status, { in: ["COOKING", "DELIVERING"] });
        assert.equal(buildBaseWhere({ ...none, status: "done" }).status, "DONE");
        assert.equal(buildBaseWhere({ ...none, status: "cancelled" }).status, "CANCELLED");
    });
});

describe("buildOrdersWhere: дата", () => {
    it("«сегодня» - полночь по Еревану, а не по серверу", () => {
        // 21:30 UTC = 01:30 следующих суток в Ереване: "сегодня" уже 5 ноября.
        const where = buildOrdersWhere({ ...none, dateRange: "today" }, new Date("2026-11-04T21:30:00Z"));
        const createdAt = and(where).find((c) => "createdAt" in c)?.createdAt as { gte: Date };
        assert.equal(createdAt.gte.toISOString(), "2026-11-04T20:00:00.000Z");
    });

    it("7 и 30 дней - скользящее окно", () => {
        const now = new Date("2026-11-05T12:00:00Z");
        const w7 = and(buildOrdersWhere({ ...none, dateRange: "7d" }, now)).find((c) => "createdAt" in c)
            ?.createdAt as { gte: Date };
        const w30 = and(buildOrdersWhere({ ...none, dateRange: "30d" }, now)).find((c) => "createdAt" in c)
            ?.createdAt as { gte: Date };
        assert.equal(w7.gte.toISOString(), "2026-10-29T12:00:00.000Z");
        assert.equal(w30.gte.toISOString(), "2026-10-06T12:00:00.000Z");
    });

    it("без диапазона даты в условии нет", () => {
        assert.equal(and(buildOrdersWhere(none)).some((c) => "createdAt" in c), false);
    });
});

describe("buildOrdersWhere: поиск", () => {
    const orClause = (q: string) =>
        (and(buildOrdersWhere({ ...none, q })).find((c) => "OR" in c)?.OR ?? []) as Record<string, unknown>[];

    it("текст ищется в имени (без учёта регистра) и телефоне, но не по номеру заказа", () => {
        const or = orClause("anna");
        assert.deepEqual(or[0], { name: { contains: "anna", mode: "insensitive" } });
        assert.deepEqual(or[1], { phone: { contains: "anna" } });
        assert.equal(or.some((c) => "id" in c), false);
    });

    it("цифры ищутся ещё и как точный номер заказа", () => {
        assert.deepEqual(orClause("42").find((c) => "id" in c), { id: 42 });
    });

    it("слишком длинное число не превращается в id (вышло бы за Int4 и уронило запрос)", () => {
        assert.equal(orClause("99999999999").some((c) => "id" in c), false);
    });

    it("пустой и пробельный запрос поиск не добавляет", () => {
        assert.equal(and(buildOrdersWhere({ ...none, q: "   " })).some((c) => "OR" in c), false);
    });
});

describe("buildOrderBy", () => {
    it("при сортировке по не-уникальному полю id добавляется вторым ключом", () => {
        assert.deepEqual(buildOrderBy("name", "asc"), [{ name: "asc" }, { id: "asc" }]);
        assert.deepEqual(buildOrderBy("total", "desc"), [{ totalPrice: "desc" }, { id: "desc" }]);
        assert.deepEqual(buildOrderBy("date", "desc"), [{ createdAt: "desc" }, { id: "desc" }]);
    });

    it("сортировка по id уже уникальна", () => {
        assert.deepEqual(buildOrderBy("id", "asc"), [{ id: "asc" }]);
    });
});
