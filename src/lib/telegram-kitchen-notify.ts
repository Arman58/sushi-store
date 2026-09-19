import type { OrderStatus } from "@prisma/client";

import type { OrderPayload } from "@/app/api/order/_schema";
import { parseSelectedModifiersJson } from "@/features/cart/model/parse-modifiers-json";
import { escapeHtml } from "@/lib/escape-html";
import {
    fetchWithTimeout,
    NOTIFICATION_FETCH_TIMEOUT_MS,
} from "@/lib/fetch-with-timeout";
import { type VerifiedOrderItem } from "@/lib/prepare-order-items";
import {
    buildKitchenStatusKeyboard,
    buildYandexMapsUrl,
    getKitchenChatIds,
    getTelegramBotToken,
    pinKitchenMessage,
} from "@/lib/telegram-kitchen";

export { buildYandexMapsUrl };

export type KitchenTelegramPayload = {
    orderId: number;
    name: string;
    phone: string;
    address: string | undefined;
    comment: string | undefined;
    payment: OrderPayload["payment"];
    changeFrom: number | null;
    scheduledFor: Date | null;
    delivery: OrderPayload["delivery"];
    verifiedItems: VerifiedOrderItem[];
    deliveryFee: number;
    zoneNameSnapshot: string | null;
    promoCodeRaw: string | undefined;
    payableForNotify: number;
    grandBeforePay: number;
    status?: OrderStatus;
};

/**
 * Форматирует телефон как стандартный международный номер без <code>,
 * чтобы мобильные клиенты Telegram на iOS и Android автоматически делали его кликабельным (нативный звонок).
 */
export function formatKitchenClickablePhone(phone: string): string {
    const digits = phone.replace(/\D/g, "");
    let national = digits;
    if (national.startsWith("374")) {
        national = national.slice(3);
    } else if (national.startsWith("0") && national.length === 9) {
        national = national.slice(1);
    }
    if (national.length === 8) {
        return `+374 ${national.slice(0, 2)} ${national.slice(2, 4)}-${national.slice(4, 6)}-${national.slice(6, 8)}`;
    }
    if (digits.startsWith("374")) {
        return `+${digits}`;
    }
    return phone.trim();
}

/** Формирует красивое HTML-сообщение о заказе для кухни и управляющего */
export function formatKitchenOrderHtml(payload: KitchenTelegramPayload): string {
    const {
        orderId,
        name,
        phone,
        address,
        comment,
        payment,
        changeFrom,
        scheduledFor,
        delivery,
        verifiedItems,
        deliveryFee,
        zoneNameSnapshot,
        promoCodeRaw,
        payableForNotify,
        grandBeforePay,
        status = "NEW",
    } = payload;

    const lines: string[] = [];

    if (status === "PENDING_APPROVAL") {
        lines.push(`<b>⏳ Заказ №${orderId} — ОЖИДАЕТ ОДОБРЕНИЯ</b>`);
    } else if (status === "COOKING") {
        lines.push(`<b>👨‍🍳 Заказ №${orderId} — ГОТОВИТСЯ</b>`);
    } else if (status === "DELIVERING") {
        lines.push(`<b>🛵 Заказ №${orderId} — ПЕРЕДАН КУРЬЕРУ</b>`);
    } else if (status === "DONE") {
        lines.push(`<b>✅ Заказ №${orderId} — ВЫПОЛНЕН</b>`);
    } else if (status === "CANCELLED") {
        lines.push(`<b>❌ Заказ №${orderId} — ОТМЕНЁН</b>`);
    } else {
        lines.push("<b>🍣 Новый заказ East West</b>");
        lines.push(`<b>📋 Заказ №${orderId}</b>`);
    }

    if (scheduledFor) {
        const when = new Intl.DateTimeFormat("ru-RU", {
            timeZone: "Asia/Yerevan",
            day: "2-digit",
            month: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
        }).format(scheduledFor);
        lines.push(`<b>⏰ ПРЕДЗАКАЗ ко времени: ${when}</b>`);
    }
    lines.push("");
    lines.push(`<b>👤 Имя:</b> ${escapeHtml(name)}`);
    // Телефон без <code>, чтобы в мобильном Telegram работал прямой клик для звонка
    lines.push(`<b>📞 Телефон:</b> ${escapeHtml(formatKitchenClickablePhone(phone))}`);

    if (delivery === "delivery") {
        if (zoneNameSnapshot) {
            lines.push(`<b>🗺 Зона:</b> ${escapeHtml(zoneNameSnapshot)}`);
        }
        if (address && address.trim().length > 0) {
            const mapUrl = buildYandexMapsUrl(address, zoneNameSnapshot);
            lines.push(`<b>📍 Адрес:</b> <a href="${mapUrl}"><u>${escapeHtml(address.trim())}</u> ↗️</a>`);
        } else {
            lines.push(`<b>📍 Адрес:</b> <i>адрес не указан</i>`);
        }
    } else {
        lines.push("<b>📍 Способ:</b> <i>Самовывоз</i>");
    }

    lines.push(
        `<b>💳 Оплата:</b> ${payment === "cash" ? "<i>Наличными</i>" : "<i>Картой</i>"}`,
    );

    if (payment === "cash") {
        if (changeFrom != null) {
            const changeDue = changeFrom - payableForNotify;
            lines.push(
                `<b>💵 Клиент даст:</b> <i>${changeFrom.toLocaleString("ru-RU")} ֏</i>` +
                    (changeDue > 0
                        ? ` - подготовить сдачу <b>${changeDue.toLocaleString("ru-RU")} ֏</b>`
                        : " <i>(без сдачи)</i>"),
            );
        } else {
            lines.push("<b>💵 Сдача:</b> <i>не нужна - клиент даст точную сумму</i>");
        }
    }

    // Выделение комплектации приборов из комментария
    let cutleryInfo: string | null = null;
    let cleanComment: string | null = comment?.trim() || null;

    if (cleanComment) {
        const cutleryMatch = cleanComment.match(/\[🥢\s*([^\]]+)\]/);
        if (cutleryMatch) {
            const raw = cutleryMatch[1].trim();
            const countMatch = raw.match(/\d+/);
            if (countMatch) {
                const count = Number(countMatch[0]);
                const word =
                    count === 1
                        ? "ПЕРСОНА"
                        : count >= 2 && count <= 4
                          ? "ПЕРСОНЫ"
                          : "ПЕРСОН";
                cutleryInfo = `${count} ${word}`;
            } else {
                cutleryInfo = raw.toUpperCase();
            }
            cleanComment =
                cleanComment
                    .replace(cutleryMatch[0], "")
                    .replace(/\s{2,}/g, " ")
                    .trim() || null;
        }
    }

    // Дополнительное динамическое распознавание комплектации, если комментарий введен вручную
    if (!cutleryInfo && cleanComment) {
        const manualMatch =
            cleanComment.match(
                /(?:приборы?\s*(?:на)?\s*|комплектация:?\s*|cutlery\s*(?:for)?\s*|պարագաներ[՝:]?\s*)(\d+)/i,
            ) || cleanComment.match(/(\d+)\s*(?:персон\w*|чел\w*|անձ)/i);
        if (manualMatch) {
            const count = Number(manualMatch[1]);
            if (count > 0 && count <= 20) {
                const word =
                    count === 1
                        ? "ПЕРСОНА"
                        : count >= 2 && count <= 4
                          ? "ПЕРСОНЫ"
                          : "ПЕРСОН";
                cutleryInfo = `${count} ${word}`;
            }
        }
    }

    if (cutleryInfo) {
        lines.push("");
        lines.push(
            `🥢 <b>КОМПЛЕКТАЦИЯ:</b> <b>${escapeHtml(cutleryInfo)}</b> <i>(палочки, соевый, васаби, имбирь)</i>`,
        );
    }

    if (cleanComment) {
        lines.push("");
        lines.push(`💬 <b>Комментарий:</b> <i>${escapeHtml(cleanComment)}</i>`);
    }

    lines.push("");
    lines.push("<b>🧾 Позиции:</b>");

    for (const item of verifiedItems) {
        const mods = parseSelectedModifiersJson(item.selectedModifiers);
        let modSuffix = "";
        if (mods.length > 0) {
            const labels = mods.map((m) =>
                m.priceDelta > 0
                    ? `${escapeHtml(m.name)} (+${m.priceDelta.toLocaleString("ru-RU")} ֏)`
                    : escapeHtml(m.name),
            );
            modSuffix = ` <i>(${labels.join(", ")})</i>`;
        }
        lines.push(
            `• ${escapeHtml(item.name)}${modSuffix} × ${item.quantity} - <b>${(
                item.price * item.quantity
            ).toLocaleString("ru-RU")} ֏</b>`,
        );
    }

    if (delivery === "delivery" && zoneNameSnapshot) {
        lines.push("");
        const feeLabel =
            deliveryFee > 0
                ? `<b>${deliveryFee.toLocaleString("ru-RU")} ֏</b>`
                : "<i>бесплатно</i>";
        lines.push(`<b>🚚 Доставка:</b> ${feeLabel}`);
    }

    if (promoCodeRaw && payableForNotify < grandBeforePay) {
        const disc = grandBeforePay - payableForNotify;
        lines.push("");
        lines.push(
            `<b>🏷️ Промокод</b> <code>${escapeHtml(promoCodeRaw)}</code>: <b>−${disc.toLocaleString("ru-RU")} ֏</b>`,
        );
    }

    lines.push("");
    lines.push(`<b>💰 Итого: ${payableForNotify.toLocaleString("ru-RU")} ֏</b>`);

    return lines.join("\n");
}

export async function notifyKitchenTelegram(payload: KitchenTelegramPayload): Promise<void> {
    const botToken = getTelegramBotToken();
    const chatIds = getKitchenChatIds();

    if (!botToken || chatIds.length === 0) {
        console.warn(
            "[telegram] Notification skipped: TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID is not configured",
        );
        return;
    }

    const { orderId, address, phone, delivery } = payload;

    const text = formatKitchenOrderHtml(payload);
    const replyMarkup = buildKitchenStatusKeyboard({
        orderId,
        status: "NEW",
        address,
        phone,
        delivery,
        zoneName: payload.zoneNameSnapshot,
    });

    for (const chatId of chatIds) {
        const telegramUrl = `https://api.telegram.org/bot${botToken}/sendMessage`;

        const telegramResponse = await fetchWithTimeout(
            telegramUrl,
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    chat_id: chatId,
                    text,
                    parse_mode: "HTML",
                    disable_web_page_preview: true,
                    link_preview_options: { is_disabled: true },
                    reply_markup: replyMarkup,
                }),
            },
            NOTIFICATION_FETCH_TIMEOUT_MS,
        );

        if (!telegramResponse.ok) {
            const errorBody = await telegramResponse.text().catch(() => "");
            console.error(
                `[telegram] sendMessage failed for order #${orderId} (chat ${chatId}): ${telegramResponse.status} ${errorBody}`,
            );
            continue;
        }

        const json = (await telegramResponse.json().catch(() => null)) as {
            ok?: boolean;
            result?: { message_id?: number };
        } | null;

        // Автоматическое закрепление только в группах (id начинается с минуса: -100...)
        // В личных чатах (ЛС) с ботом пин не разрешен Telegram API
        if (chatId.startsWith("-") && json?.ok && json.result?.message_id) {
            void pinKitchenMessage(chatId, json.result.message_id);
        }
    }
}

export async function notifyKitchenOrderCancelled(
    orderId: number,
    reason?: string,
): Promise<void> {
    const botToken = getTelegramBotToken();
    const chatIds = getKitchenChatIds();
    if (!botToken || chatIds.length === 0) return;

    const lines = [
        `❌ <b>Внимание: Заказ №${orderId} ОТМЕНЁН клиентом на сайте!</b>`,
        "Кухня: приготовление остановлено.",
    ];
    if (reason?.trim()) {
        lines.push(`<i>Причина: ${escapeHtml(reason.trim())}</i>`);
    }

    const text = lines.join("\n");
    for (const chatId of chatIds) {
        const telegramUrl = `https://api.telegram.org/bot${botToken}/sendMessage`;
        try {
            await fetchWithTimeout(
                telegramUrl,
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        chat_id: chatId,
                        text,
                        parse_mode: "HTML",
                        disable_web_page_preview: true,
                        link_preview_options: { is_disabled: true },
                    }),
                },
                NOTIFICATION_FETCH_TIMEOUT_MS,
            );
        } catch (err) {
            console.error(
                `[telegram] cancel notification failed for order #${orderId} (chat ${chatId}):`,
                err,
            );
        }
    }
}
