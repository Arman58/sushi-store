import assert from "node:assert/strict";
import { describe, it } from "node:test";

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
