import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { telegramWebhookBodySchema } from "@/lib/api-schemas";
import {
    buildKitchenActionButtons,
    buildKitchenCancelConfirmKeyboard,
    buildKitchenStatusKeyboard,
    isValidTelegramButtonUrl,
    parseKitchenCallbackData,
    parseKitchenEtaCallbackData,
    restoreKitchenMessageFormatting,
    updateKitchenMessageStatusHeader,
} from "@/lib/telegram-kitchen";
import {
    buildYandexMapsUrl,
    formatKitchenClickablePhone,
    formatKitchenOrderHtml,
} from "@/lib/telegram-kitchen-notify";

describe("buildKitchenActionButtons", () => {
    it("для заказа с телефоном генерирует только кнопку WhatsApp (карты вынесены в кликабельный адрес)", () => {
        const buttons = buildKitchenActionButtons(101, {
            delivery: "delivery",
            address: "ул. Абовяна, 15, кв. 4",
            phone: "+374 91 123456",
        });

        assert.equal(buttons.length, 1);
        assert.equal(buttons[0].text, "💬 WhatsApp");
        assert.ok(buttons[0].url?.includes("wa.me/37491123456"));
    });

    it("для самовывоза генерирует только WhatsApp", () => {
        const buttons = buildKitchenActionButtons(102, {
            delivery: "pickup",
            phone: "099 887766",
        });

        assert.equal(buttons.length, 1);
        assert.equal(buttons[0].text, "💬 WhatsApp");
        assert.ok(buttons[0].url?.includes("wa.me/37499887766"));
    });

    it("если телефон отсутствует, не падает и возвращает пустой массив", () => {
        const buttons = buildKitchenActionButtons(103, {
            delivery: "delivery",
            address: "Торосяна 5",
            phone: null,
        });

        assert.equal(buttons.length, 0);
    });
});

describe("buildYandexMapsUrl & formatKitchenClickablePhone", () => {
    it("добавляет город и Армению для точной геопозиции без города", () => {
        const url = buildYandexMapsUrl("Торосяна 5", "Нор Ачин");
        assert.ok(url.includes("yandex.ru/maps"));
        assert.ok(url.includes(encodeURIComponent("Армения, Нор Ачин, Торосяна 5")));
    });

    it("не дублирует город, если он уже введен клиентом", () => {
        const url = buildYandexMapsUrl("г. Нор Ачин, ул. Чаренца 12", "Нор Ачин");
        assert.ok(url.includes(encodeURIComponent("Армения, г. Нор Ачин, ул. Чаренца 12")));
    });

    it("очищает цену из названия зоны для ссылки карт", () => {
        const url = buildYandexMapsUrl("3 улица 8", "Нор Гехи (от 700 до 1200 ֏)");
        assert.ok(url.includes(encodeURIComponent("Армения, Нор Гехи, 3 улица 8")));
    });

    it("форматирует номер телефона для прямого звонка без code", () => {
        assert.equal(formatKitchenClickablePhone("+37491123456"), "+374 91 12-34-56");
        assert.equal(formatKitchenClickablePhone("091123456"), "+374 91 12-34-56");
    });
});

describe("buildKitchenStatusKeyboard", () => {
    it("для нового заказа на доставку формирует аккуратную сетку: WhatsApp, ETA, статусы и изолированную отмену", () => {
        const keyboard = buildKitchenStatusKeyboard({
            orderId: 55,
            status: "NEW",
            delivery: "delivery",
            address: "Северный пр., 2",
            phone: "+374 77 112233",
        });

        // 1 ряд: WhatsApp
        assert.equal(keyboard.inline_keyboard[0].length, 1);
        assert.ok(keyboard.inline_keyboard[0][0].text.includes("WhatsApp"));
        // 2 ряд: ETA кнопки (15, 30, 45, 60 мин) без обрезки
        assert.equal(keyboard.inline_keyboard[1].length, 4);
        assert.equal(keyboard.inline_keyboard[1][0].text, "⏱ 15м");
        assert.equal(keyboard.inline_keyboard[1][3].text, "⏱ 60м");
        // 3 ряд: Готовится + Курьеру (2 компактные кнопки рядом)
        assert.equal(keyboard.inline_keyboard[2].length, 2);
        assert.equal(keyboard.inline_keyboard[2][0].text, "👨‍🍳 Готовится");
        assert.equal(keyboard.inline_keyboard[2][1].text, "🛵 Курьеру");
        // 4 ряд: Финальный статус доставки
        assert.equal(keyboard.inline_keyboard[3].length, 1);
        assert.equal(keyboard.inline_keyboard[3][0].text, "✅ Заказ доставлен");
        // 5 ряд: отмена (изолирована внизу)
        const lastRow = keyboard.inline_keyboard[4];
        assert.equal(lastRow[0].text, "❌ Отменить заказ");
        assert.equal(lastRow[0].callback_data, "ord_55_CANCEL_PROMPT");
    });

    it("для самовывоза показывает контекстные статусы (Готов к выдаче, Заказ выдан)", () => {
        const keyboard = buildKitchenStatusKeyboard({
            orderId: 56,
            status: "NEW",
            delivery: "pickup",
            phone: "+374 77 112233",
        });

        // 3 ряд: Готовится + К выдаче
        assert.equal(keyboard.inline_keyboard[2][1].text, "🛍 К выдаче");
        // 4 ряд: Заказ выдан
        assert.equal(keyboard.inline_keyboard[3][0].text, "✅ Заказ выдан");
    });

    it("для завершенного заказа показывает возврат в работу", () => {
        const keyboard = buildKitchenStatusKeyboard({
            orderId: 55,
            status: "DONE",
        });

        assert.equal(keyboard.inline_keyboard.length, 1);
        assert.equal(keyboard.inline_keyboard[0][0].text, "🔄 Вернуть в работу");
        assert.equal(keyboard.inline_keyboard[0][0].callback_data, "ord_55_COOKING");
    });

    it("для отмененного заказа формирует безопасную клавиатуру", () => {
        const keyboard = buildKitchenStatusKeyboard({
            orderId: 55,
            status: "CANCELLED",
        });

        assert.ok(Array.isArray(keyboard.inline_keyboard));
    });
});

describe("buildKitchenCancelConfirmKeyboard", () => {
    it("содержит безопасные кнопки в один ряд без случайного клика", () => {
        const keyboard = buildKitchenCancelConfirmKeyboard(42);
        assert.equal(keyboard.inline_keyboard.length, 1);
        assert.equal(keyboard.inline_keyboard[0].length, 2);
        assert.equal(keyboard.inline_keyboard[0][0].text, "❌ Да, отменить");
        assert.equal(keyboard.inline_keyboard[0][0].callback_data, "ord_42_CANCEL_YES");
        assert.equal(keyboard.inline_keyboard[0][1].text, "↩️ Не отменять");
        assert.equal(keyboard.inline_keyboard[0][1].callback_data, "ord_42_CANCEL_NO");
    });
});

describe("parseKitchenCallbackData", () => {
    it("корректно распознает смену статуса", () => {
        const parsed = parseKitchenCallbackData("ord_42_COOKING");
        assert.deepEqual(parsed, {
            orderId: 42,
            status: "COOKING",
            action: "STATUS",
        });
    });

    it("корректно распознает действия диалога отмены", () => {
        assert.deepEqual(parseKitchenCallbackData("ord_99_CANCEL_PROMPT"), {
            orderId: 99,
            action: "CANCEL_PROMPT",
        });
        assert.deepEqual(parseKitchenCallbackData("ord_99_CANCEL_YES"), {
            orderId: 99,
            action: "CANCEL_YES",
        });
        assert.deepEqual(parseKitchenCallbackData("ord_99_CANCEL_NO"), {
            orderId: 99,
            action: "CANCEL_NO",
        });
    });

    it("невалидные данные возвращают null", () => {
        assert.equal(parseKitchenCallbackData("foo_bar"), null);
        assert.equal(parseKitchenCallbackData("ord_0_COOKING"), null);
        assert.equal(parseKitchenCallbackData("ord_-5_CANCEL_YES"), null);
    });
});

describe("parseKitchenEtaCallbackData", () => {
    it("парсит валидные минуты и ID заказа", () => {
        assert.deepEqual(parseKitchenEtaCallbackData("eta_30_123"), {
            orderId: 123,
            minutes: 30,
        });
    });

    it("невалидные значения возвращают null", () => {
        assert.equal(parseKitchenEtaCallbackData("eta_0_123"), null);
        assert.equal(parseKitchenEtaCallbackData("invalid"), null);
    });
});

describe("formatKitchenOrderHtml", () => {
    it("извлекает приборы из комментария и выносит в заметную строку КОМПЛЕКТАЦИЯ", () => {
        const html = formatKitchenOrderHtml({
            orderId: 77,
            name: "Арам",
            phone: "+374 91 998877",
            address: "ул. Туманяна, 1",
            comment: "Позвоните в домофон [🥢 Приборы: 3 чел.] Код 45Б",
            payment: "cash",
            changeFrom: 20000,
            scheduledFor: null,
            delivery: "delivery",
            verifiedItems: [
                {
                    productId: 1,
                    name: "Филадельфия",
                    price: 4500,
                    quantity: 2,
                    categoryId: null,
                    selectedModifiers: [],
                },
            ],
            deliveryFee: 1000,
            zoneNameSnapshot: "Кентрон",
            promoCodeRaw: undefined,
            payableForNotify: 10000,
            grandBeforePay: 10000,
            status: "NEW",
        });

        // Проверяем вынесенную комплектацию
        assert.ok(html.includes("🥢 <b>КОМПЛЕКТАЦИЯ:</b> <b>3 ПЕРСОНЫ</b> <i>(палочки, соевый, васаби, имбирь)</i>"));
        // Проверяем очищенный комментарий без тега [🥢 ...]
        assert.ok(html.includes("💬 <b>Комментарий:</b> <i>Позвоните в домофон Код 45Б</i>"));
        // Проверяем кликабельный для Telegram телефон (прямой звонок без code)
        assert.ok(html.includes("+374 91 99-88-77"));
        // Проверяем сдачу
        assert.ok(html.includes(`подготовить сдачу <b>${(10000).toLocaleString("ru-RU")} ֏</b>`));
        // Проверяем ссылку на Яндекс карты с подчеркиванием и стрелкой
        assert.ok(html.includes("https://yandex.ru/maps/?text="));
        assert.ok(html.includes("<u>ул. Туманяна, 1</u> ↗️</a>"));
    });

    it("корректно форматирует заказ без комментария и с точной оплатой наличными", () => {
        const html = formatKitchenOrderHtml({
            orderId: 88,
            name: "Карен",
            phone: "+374 98 112233",
            address: undefined,
            comment: undefined,
            payment: "cash",
            changeFrom: null,
            scheduledFor: null,
            delivery: "pickup",
            verifiedItems: [
                {
                    productId: 2,
                    name: "Калифорния",
                    price: 3200,
                    quantity: 1,
                    categoryId: null,
                    selectedModifiers: [],
                },
            ],
            deliveryFee: 0,
            zoneNameSnapshot: null,
            promoCodeRaw: undefined,
            payableForNotify: 3200,
            grandBeforePay: 3200,
            status: "COOKING",
        });

        assert.ok(html.includes("👨‍🍳 Заказ №88 — ГОТОВИТСЯ"));
        assert.ok(html.includes("Самовывоз"));
        assert.ok(html.includes("клиент даст точную сумму"));
        assert.ok(!html.includes("КОМПЛЕКТАЦИЯ"));
    });

    it("распознает комплектацию приборов даже при ручном вводе комментария", () => {
        const html = formatKitchenOrderHtml({
            orderId: 89,
            name: "Давид",
            phone: "+374 93 445566",
            address: undefined,
            comment: "Положите, пожалуйста, приборы на 4 персоны",
            payment: "card",
            changeFrom: null,
            scheduledFor: null,
            delivery: "pickup",
            verifiedItems: [],
            deliveryFee: 0,
            zoneNameSnapshot: null,
            promoCodeRaw: undefined,
            payableForNotify: 5000,
            grandBeforePay: 5000,
            status: "NEW",
        });

        assert.ok(html.includes("🥢 <b>КОМПЛЕКТАЦИЯ:</b> <b>4 ПЕРСОНЫ</b>"));
        assert.ok(html.includes("Положите, пожалуйста, приборы на 4 персоны"));
    });
});

describe("updateKitchenMessageStatusHeader", () => {
    it("заменяет заголовок в тексте сообщения в зависимости от статуса", () => {
        const initialText = "🍣 <b>Новый заказ East West</b>\n📋 <b>Заказ №99</b>\n\n<b>👤 Имя:</b> Анна";
        const pending = updateKitchenMessageStatusHeader(initialText, 99, "PENDING_APPROVAL");
        assert.ok(pending.startsWith("⏳ <b>Заказ №99 — ТРЕБУЕТ ОДОБРЕНИЯ</b>\n\n<b>👤 Имя:</b> Анна"));

        const cooking = updateKitchenMessageStatusHeader(initialText, 99, "COOKING");
        assert.ok(cooking.startsWith("👨‍🍳 <b>Заказ №99 — ГОТОВИТСЯ</b>\n\n<b>👤 Имя:</b> Анна"));

        const delivering = updateKitchenMessageStatusHeader(initialText, 99, "DELIVERING");
        assert.ok(delivering.startsWith("🛵 <b>Заказ №99 — ПЕРЕДАН КУРЬЕРУ</b>\n\n<b>👤 Имя:</b> Анна"));

        const done = updateKitchenMessageStatusHeader(initialText, 99, "DONE");
        assert.ok(done.startsWith("✅ <b>Заказ №99 — ВЫПОЛНЕН</b>\n\n<b>👤 Имя:</b> Анна"));

        const cancelled = updateKitchenMessageStatusHeader(initialText, 99, "CANCELLED");
        assert.ok(cancelled.startsWith("❌ <b>Заказ №99 — ОТМЕНЁН</b>\n\n<b>👤 Имя:</b> Анна"));
    });

    it("для самовывоза устанавливает подходящие заголовки (ГОТОВ К ВЫДАЧЕ, ВЫДАН КЛИЕНТУ)", () => {
        const initialText = "🍣 <b>Новый заказ East West</b>\n📋 <b>Заказ №99</b>\n\n<b>👤 Имя:</b> Анна";
        const deliveringPickup = updateKitchenMessageStatusHeader(
            initialText,
            99,
            "DELIVERING",
            "pickup",
        );
        assert.ok(
            deliveringPickup.startsWith(
                "🛍 <b>Заказ №99 — ГОТОВ К ВЫДАЧЕ</b>\n\n<b>👤 Имя:</b> Анна",
            ),
        );

        const donePickup = updateKitchenMessageStatusHeader(
            initialText,
            99,
            "DONE",
            "pickup",
        );
        assert.ok(
            donePickup.startsWith(
                "✅ <b>Заказ №99 — ВЫДАН КЛИЕНТУ</b>\n\n<b>👤 Имя:</b> Анна",
            ),
        );
    });
});

describe("telegramWebhookBodySchema", () => {
    it("валидирует callback_query", () => {
        const res = telegramWebhookBodySchema.safeParse({
            callback_query: {
                id: "cb_123",
                data: "ord_10_COOKING",
                message: {
                    message_id: 456,
                    chat: { id: "-100123456789" },
                    text: "Текст заказа",
                },
            },
        });
        assert.equal(res.success, true);
    });

    it("валидирует входящее текстовое сообщение с командой", () => {
        const res = telegramWebhookBodySchema.safeParse({
            message: {
                message_id: 789,
                chat: { id: 12345678 },
                from: { id: 12345678, first_name: "Arman", username: "arman" },
                text: "/today",
            },
        });
        assert.equal(res.success, true);
    });
});

describe("isValidTelegramButtonUrl", () => {
    it("отклоняет localhost и 127.0.0.1 для предотвращения ошибки BUTTON_URL_INVALID в Telegram", () => {
        assert.equal(isValidTelegramButtonUrl("http://localhost:3000/admin/orders?q=1"), false);
        assert.equal(isValidTelegramButtonUrl("http://127.0.0.1:3000/admin"), false);
        assert.equal(isValidTelegramButtonUrl("http://localhost"), false);
        assert.equal(isValidTelegramButtonUrl(undefined), false);
        assert.equal(isValidTelegramButtonUrl(""), false);
    });

    it("одобряет валидные публичные HTTPS и HTTP ссылки", () => {
        assert.equal(isValidTelegramButtonUrl("https://eastwestnh.com/admin/orders?q=1"), true);
        assert.equal(isValidTelegramButtonUrl("https://sushi-store.vercel.app/admin"), true);
    });
});

describe("restoreKitchenMessageFormatting", () => {
    it("восстанавливает тег ссылки на Яндекс Карты и заголовки из plain text", () => {
        const plainText = [
            "🍣 Новый заказ East West",
            "📋 Заказ №15",
            "",
            "👤 Имя: Арман",
            "📞 Телефон: +374 91 12-34-56",
            "📍 Адрес: Нор Ачин, Саят-Нова 12 ↗️",
            "💳 Оплата: Наличными",
            "",
            "🧾 Позиции:",
            "• Филадельфия × 1 - 4 500 ֏",
            "",
            "💰 Итого: 4 500 ֏",
        ].join("\n");

        const restored = restoreKitchenMessageFormatting(plainText, {
            delivery: "delivery",
            address: "Нор Ачин, Саят-Нова 12",
            zoneName: "Нор Ачин",
        });

        assert.ok(restored.includes("<b>👤 Имя:</b> Арман"));
        assert.ok(restored.includes("<b>📞 Телефон:</b> +374 91 12-34-56"));
        assert.ok(restored.includes('<a href="https://yandex.ru/maps/'));
        assert.ok(restored.includes("<u>Нор Ачин, Саят-Нова 12</u> ↗️</a>"));
        assert.ok(restored.includes("<b>💳 Оплата:</b>"));
        assert.ok(restored.includes("<b>🧾 Позиции:</b>"));
        assert.ok(restored.includes("<b>💰 Итого: 4 500 ֏</b>"));
    });
});

