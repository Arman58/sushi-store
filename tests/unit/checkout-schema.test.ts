import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
    createCheckoutSchema,
    type SchemaMessages,
} from "@/shared/lib/create-schemas";

const messages: SchemaMessages = {
    phoneRequired: "phoneRequired",
    phoneInvalid: "phoneInvalid",
    phoneRequiredForDelivery: "phoneRequiredForDelivery",
    nameRequired: "nameRequired",
    nameTooShort: "nameTooShort",
    emailInvalid: "emailInvalid",
    addressRequired: "addressRequired",
    zoneRequired: "zoneRequired",
    changeAmountRequired: "changeAmountRequired",
    scheduleRequired: "scheduleRequired",
    orderIdRequired: "orderIdRequired",
    orderIdInvalid: "orderIdInvalid",
};

const schema = createCheckoutSchema(messages);

const validBase = {
    name: "Арман",
    email: "",
    phone: "91234567",
    delivery: "delivery" as const,
    address: "Nor Hachn, Charents 19",
    apartment: "",
    comment: "",
    saveAddress: false,
    saveAddressLabel: "",
    payment: "cash" as const,
    deliveryZoneId: 1,
    hp: "",
};

describe("createCheckoutSchema - сдача (регрессия)", () => {
    it("needsChange/changeAmount НЕ вырезаются при parse", () => {
        // Регрессия: поля отсутствовали в схеме, zod их стрипал,
        // и заказ уходил на сервер как «без сдачи».
        const parsed = schema.parse({
            ...validBase,
            needsChange: true,
            changeAmount: 10000,
        });
        assert.equal(parsed.needsChange, true);
        assert.equal(parsed.changeAmount, 10000);
    });

    it("значения по умолчанию: сдача не нужна", () => {
        const parsed = schema.parse(validBase);
        assert.equal(parsed.needsChange, false);
        assert.equal(parsed.changeAmount, null);
    });

    it("needsChange без суммы → ошибка на changeAmount", () => {
        const r = schema.safeParse({ ...validBase, needsChange: true });
        assert.ok(!r.success);
        const issue = r.error.issues.find(
            (i) => i.path.join(".") === "changeAmount",
        );
        assert.equal(issue?.message, "changeAmountRequired");
    });

    it("картой: needsChange игнорируется валидацией", () => {
        const r = schema.safeParse({
            ...validBase,
            payment: "card",
            needsChange: true,
        });
        assert.ok(r.success);
    });

    it("дробная/нулевая сумма отклоняется", () => {
        for (const bad of [0, -100, 10.5]) {
            const r = schema.safeParse({
                ...validBase,
                needsChange: true,
                changeAmount: bad,
            });
            assert.ok(!r.success, String(bad));
        }
    });
});
