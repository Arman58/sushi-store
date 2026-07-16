import type { OrderPayload } from "@/app/api/order/_schema";
import { escapeHtml } from "@/lib/escape-html";
import {
    fetchWithTimeout,
    NOTIFICATION_FETCH_TIMEOUT_MS,
} from "@/lib/fetch-with-timeout";
import { type VerifiedOrderItem } from "@/lib/prepare-order-items";
import {
    buildKitchenStatusKeyboard,
    isKitchenTelegramConfigured,
} from "@/lib/telegram-kitchen";

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

const telegramNotifyEnabled = isKitchenTelegramConfigured();

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
};

export async function notifyKitchenTelegram(payload: KitchenTelegramPayload): Promise<void> {
    if (!telegramNotifyEnabled || !TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) return;

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
    } = payload;

    const lines: string[] = [];

    lines.push("<b>🍣 Новый заказ East West</b>");
    lines.push(`<b>📋 Заказ №${orderId}</b>`);

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
    lines.push(`<b>📞 Телефон:</b> <code>${escapeHtml(phone)}</code>`);

    if (delivery === "delivery") {
        if (zoneNameSnapshot) {
            lines.push(
                `<b>🗺 Зона:</b> ${escapeHtml(zoneNameSnapshot)}`,
            );
        }
        lines.push(
            `<b>📍 Адрес:</b> ${escapeHtml(address || "адрес не указан")}`,
        );
    } else {
        lines.push("<b>📍</b> <i>Самовывоз</i>");
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

    if (comment) {
        lines.push("");
        lines.push(`<b>💬 Комментарий:</b> <i>${escapeHtml(comment)}</i>`);
    }

    lines.push("");
    lines.push("<b>🧾 Позиции:</b>");

    for (const item of verifiedItems) {
        const modsRaw = item.selectedModifiers;
        let modSuffix = "";
        if (Array.isArray(modsRaw) && modsRaw.length > 0) {
            const labels = modsRaw
                .map((m: unknown) =>
                    m &&
                    typeof m === "object" &&
                    "name" in m &&
                    typeof (m as { name: string }).name === "string"
                        ? escapeHtml((m as { name: string }).name)
                        : null,
                )
                .filter(Boolean);
            if (labels.length > 0) {
                modSuffix = ` <i>(${labels.join(", ")})</i>`;
            }
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

    const text = lines.join("\n");
    const telegramUrl = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;

    const telegramResponse = await fetchWithTimeout(
        telegramUrl,
        {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                chat_id: TELEGRAM_CHAT_ID,
                text,
                parse_mode: "HTML",
                reply_markup: buildKitchenStatusKeyboard(orderId),
            }),
        },
        NOTIFICATION_FETCH_TIMEOUT_MS,
    );

    if (!telegramResponse.ok) {
        const errorBody = await telegramResponse.text().catch(() => "");
        console.error(
            `[telegram] sendMessage failed for order #${orderId}: ${telegramResponse.status} ${errorBody}`,
        );
    }
}
