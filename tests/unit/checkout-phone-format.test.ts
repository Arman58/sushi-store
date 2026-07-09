import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
    CHECKOUT_PHONE_PREFIX,
    formatPhone,
    resolveInitialCheckoutPhone,
} from "@/features/checkout/model/helpers";

describe("formatPhone", () => {
    it("пустой ввод → только +374", () => {
        assert.equal(formatPhone(""), CHECKOUT_PHONE_PREFIX);
        assert.equal(formatPhone("+"), CHECKOUT_PHONE_PREFIX);
    });

    it("набор национальных цифр", () => {
        assert.equal(formatPhone("7", "+374"), "+374 (7");
        assert.equal(formatPhone("77", "+374 (7"), "+374 (77)");
        assert.equal(
            formatPhone("77123456", "+374"),
            "+374 (77) 12-34-56",
        );
    });

    it("backspace по маске удаляет цифру, а не залипает", () => {
        const full = "+374 (77) 12-34-56";
        // Стерли последнюю «6» через дефис/символ маски: браузер мог убрать только «-»
        const afterMaskDelete = "+374 (77) 12-3456";
        assert.equal(formatPhone(afterMaskDelete, full), "+374 (77) 12-34-5");

        // Стерли «)» у +374 (77) — digits те же, должна уйти одна 7
        assert.equal(formatPhone("+374 (77", "+374 (77)"), "+374 (7");
    });

    it("полное стирание возвращает префикс", () => {
        assert.equal(
            formatPhone("", "+374 (77) 12-34-56"),
            CHECKOUT_PHONE_PREFIX,
        );
    });

    it("нельзя снести код страны", () => {
        assert.equal(formatPhone("+37", "+374"), CHECKOUT_PHONE_PREFIX);
        assert.equal(formatPhone("37", "+374"), CHECKOUT_PHONE_PREFIX);
    });
});

describe("resolveInitialCheckoutPhone", () => {
    it("неполный draft не восстанавливает 77", () => {
        assert.equal(
            resolveInitialCheckoutPhone("+374 (77)"),
            CHECKOUT_PHONE_PREFIX,
        );
    });

    it("полный draft форматирует", () => {
        assert.equal(
            resolveInitialCheckoutPhone("37477123456"),
            "+374 (77) 12-34-56",
        );
    });
});
