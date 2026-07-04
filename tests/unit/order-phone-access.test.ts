import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { phonesMatch } from "@/lib/order-status-access";
import {
    formatPhoneForDisplay,
    normalizePhoneToE164Digits,
} from "@/lib/phone";

describe("normalizePhoneToE164Digits", () => {
    it("8 локальных цифр → 374XXXXXXXX", () => {
        assert.equal(normalizePhoneToE164Digits("91 23-45-67"), "37491234567");
    });

    it("+374 с форматированием → канон", () => {
        assert.equal(
            normalizePhoneToE164Digits("+374 (91) 23-45-67"),
            "37491234567",
        );
    });

    it("невалидная длина → пустая строка", () => {
        assert.equal(normalizePhoneToE164Digits("1234"), "");
        assert.equal(normalizePhoneToE164Digits("79161234567"), "");
        assert.equal(normalizePhoneToE164Digits(""), "");
    });
});

describe("formatPhoneForDisplay", () => {
    it("канон → +374 (XX) XX-XX-XX", () => {
        assert.equal(
            formatPhoneForDisplay("37491234567"),
            "+374 (91) 23-45-67",
        );
    });

    it("неканоничный ввод возвращается как есть", () => {
        assert.equal(formatPhoneForDisplay("12345"), "12345");
    });
});

describe("phonesMatch (доступ к статусу заказа)", () => {
    it("одинаковый канон совпадает независимо от формата", () => {
        assert.ok(phonesMatch("+374 (91) 23-45-67", "37491234567"));
        assert.ok(phonesMatch("91234567", "091 23 45 67".replace("0", "")));
    });

    it("локальный (8 цифр) против E.164 (11) — совпадение по суффиксу", () => {
        assert.ok(phonesMatch("37491234567", "91234567"));
        assert.ok(phonesMatch("91234567", "37491234567"));
    });

    it("разные номера не совпадают", () => {
        assert.ok(!phonesMatch("37491234567", "37491234568"));
        assert.ok(!phonesMatch("91234567", "91234568"));
    });

    it("пустой/мусорный ввод не даёт доступ", () => {
        assert.ok(!phonesMatch("37491234567", ""));
        assert.ok(!phonesMatch("", "37491234567"));
        assert.ok(!phonesMatch("37491234567", "abc"));
    });

    it("частичный суффикс короче 8 цифр не совпадает", () => {
        // защита от перебора коротким хвостом
        assert.ok(!phonesMatch("37491234567", "234567"));
        assert.ok(!phonesMatch("37491234567", "4567"));
    });
});
