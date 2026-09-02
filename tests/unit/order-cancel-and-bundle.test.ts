import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { cancelOrderSchema } from "@/lib/api-schemas";
import { buildTelegramSupportUrl, buildWhatsAppOrderUrl } from "@/lib/site-config";

describe("cancelOrderSchema", () => {
    it("валидный orderId проходит", () => {
        const parsed = cancelOrderSchema.safeParse({ orderId: 42 });
        assert.equal(parsed.success, true);
        if (parsed.success) {
            assert.equal(parsed.data.orderId, 42);
        }
    });

    it("orderId <= 0 отклоняется", () => {
        const parsed = cancelOrderSchema.safeParse({ orderId: 0 });
        assert.equal(parsed.success, false);
    });

    it("строковый orderId отклоняется", () => {
        const parsed = cancelOrderSchema.safeParse({ orderId: "42" });
        assert.equal(parsed.success, false);
    });

    it("опциональные accessToken и reason проходят", () => {
        const parsed = cancelOrderSchema.safeParse({
            orderId: 100,
            accessToken: "token-12345",
            reason: "Передумал",
        });
        assert.equal(parsed.success, true);
        if (parsed.success) {
            assert.equal(parsed.data.accessToken, "token-12345");
            assert.equal(parsed.data.reason, "Передумал");
        }
    });
});

describe("Messenger URL helpers", () => {
    it("WhatsApp ссылка содержит номер и номер заказа", () => {
        const url = buildWhatsAppOrderUrl(555);
        assert.match(url, /https:\/\/wa\.me\/37477774849/);
        assert.match(url, /555/);
    });

    it("Telegram ссылка ведет на поддержку", () => {
        const url = buildTelegramSupportUrl();
        assert.equal(url, "https://t.me/eastwestnh");
    });
});

describe("Bundle Discount Calculation", () => {
    it("корректно рассчитывает экономию и процент скидки сета", () => {
        const items = [
            { price: 3200, quantity: 1 }, // 3200
            { price: 2800, quantity: 2 }, // 5600
            { price: 1500, quantity: 1 }, // 1500
        ];
        const originalPrice = items.reduce((sum, i) => sum + i.price * i.quantity, 0);
        assert.equal(originalPrice, 10300);

        const setPrice = 8200;
        const savings = originalPrice - setPrice;
        const discountPercent = Math.round((savings / originalPrice) * 100);

        assert.equal(savings, 2100);
        assert.equal(discountPercent, 20);
    });
});
