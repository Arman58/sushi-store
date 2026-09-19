import type { OrderStatus } from "@prisma/client";

import { escapeHtml } from "@/lib/escape-html";
import {
    DEFAULT_FETCH_TIMEOUT_MS,
    fetchWithTimeout,
} from "@/lib/fetch-with-timeout";
import type { KitchenButtonStatus } from "@/lib/order-service";
import {
    KITCHEN_BUTTON_STATUSES,
    orderStatusLabel,
    orderStatusTelegramButtonLabel,
} from "@/lib/order-service";
import {
    ETA_PRESET_MINUTES,
    formatEstimatedDeliveryTime,
    STORE_TIMEZONE,
} from "@/lib/order-status";
import { normalizePhoneToE164Digits } from "@/lib/phone";
import { SITE_URL } from "@/lib/site-config";
import { timingSafeStringEqual } from "@/lib/timing-safe-equal";

/**
 * Формирует ссылку на Яндекс.Карты с обязательной геопривязкой к Армении и городу/району (Нор Ачин и др.),
 * чтобы исключить ложные результаты в Москве или других городах.
 */
export function buildYandexMapsUrl(address: string, zoneName?: string | null): string {
    const clean = address.trim();
    if (!clean) return "";

    const cleanZone = (zoneName ?? "").replace(/\(.*?\)/g, "").trim();
    const hasKnownCity =
        /нор\s*ач|nor\s*hach|նոր\s*հաճ|ереван|yerevan|երևան|котайк|kotayk|կոտայք|артамет|artamet|արտամետ|мргашен|mrgashen|մրգաշեն|лусакерт|lusakert|լուսակերտ|бюрекаван|byureghavan|բյուրեղավան|нор\s*гех|nor\s*gegh|նոր\s*գեղ/i.test(
            clean,
        );

    const cityPrefix = !hasKnownCity
        ? cleanZone
            ? `${cleanZone}, `
            : "Нор Ачин, "
        : "";

    const hasCountry = /армен|armenia|հայաստան/i.test(clean);
    const fullQuery = hasCountry
        ? `${cityPrefix}${clean}`
        : `Армения, ${cityPrefix}${clean}`;

    return `https://yandex.ru/maps/?text=${encodeURIComponent(
        fullQuery.replace(/\s+/g, " ").trim(),
    )}`;
}

export function getTelegramBotToken(): string {
    return process.env.TELEGRAM_BOT_TOKEN?.trim() ?? "";
}

export function getKitchenChatIds(): string[] {
    const raw = process.env.TELEGRAM_CHAT_ID ?? "";
    return raw
        .split(",")
        .map((s) => s.trim().replace(/^["']|["']$/g, ""))
        .filter(Boolean);
}

export { KITCHEN_BUTTON_STATUSES as KITCHEN_TELEGRAM_STATUSES };
export type KitchenTelegramStatus = KitchenButtonStatus;

export function isKitchenTelegramConfigured(): boolean {
    return Boolean(getTelegramBotToken() && getKitchenChatIds().length > 0);
}

export type KitchenCallbackAction =
    | "STATUS"
    | "CANCEL_PROMPT"
    | "CANCEL_YES"
    | "CANCEL_NO";

export type KitchenCallbackParsed = {
    orderId: number;
    status?: KitchenButtonStatus;
    action: KitchenCallbackAction;
};

/** callback_data: ord_{id}_{STATUS|ACTION}, напр. ord_15_COOKING (≤ 64 байт) */
export function buildKitchenCallbackData(
    orderId: number,
    statusOrAction: KitchenButtonStatus | "CANCEL_PROMPT" | "CANCEL_YES" | "CANCEL_NO",
): string {
    return `ord_${orderId}_${statusOrAction}`;
}

export function buildKitchenEtaCallbackData(orderId: number, minutes: number): string {
    return `eta_${minutes}_${orderId}`;
}

export function parseKitchenCallbackData(
    data: string,
): KitchenCallbackParsed | null {
    const trimmed = data.trim();

    const promptMatch = /^ord_(\d+)_(CANCEL_PROMPT|CANCEL_YES|CANCEL_NO)$/.exec(trimmed);
    if (promptMatch) {
        const orderId = Number(promptMatch[1]);
        if (!Number.isFinite(orderId) || orderId <= 0) return null;
        return {
            orderId,
            action: promptMatch[2] as KitchenCallbackAction,
        };
    }

    const match = /^ord_(\d+)_(COOKING|DELIVERING|DONE|CANCELLED)$/.exec(trimmed);
    if (!match) return null;

    const orderId = Number(match[1]);
    if (!Number.isFinite(orderId) || orderId <= 0) return null;

    return {
        orderId,
        status: match[2] as KitchenButtonStatus,
        action: "STATUS",
    };
}

export function parseKitchenEtaCallbackData(
    data: string,
): { orderId: number; minutes: number } | null {
    const match = /^eta_(\d+)_(\d+)$/.exec(data.trim());
    if (!match) return null;

    const minutes = Number(match[1]);
    const orderId = Number(match[2]);
    if (
        !Number.isFinite(orderId) ||
        orderId <= 0 ||
        !Number.isFinite(minutes) ||
        minutes <= 0
    ) {
        return null;
    }

    return { orderId, minutes };
}

export type KitchenKeyboardOptions = {
    orderId: number;
    status?: OrderStatus;
    address?: string | null;
    phone?: string | null;
    delivery?: string | null;
    zoneName?: string | null;
};

export type TelegramInlineButton = {
    text: string;
    callback_data?: string;
    url?: string;
};

export function extractWhatsAppPhone(phone: string): string {
    const norm = normalizePhoneToE164Digits(phone);
    if (norm) return norm;

    const digits = phone.replace(/\D/g, "");
    if (digits.length === 11 && digits.startsWith("374")) {
        return digits;
    }
    if (digits.length === 9 && digits.startsWith("0")) {
        return `374${digits.slice(1)}`;
    }
    if (digits.length === 8) {
        return `374${digits}`;
    }
    return digits;
}

/** Быстрые навигационные и коммуникационные ссылки для курьера */
export function isValidTelegramButtonUrl(url: string | undefined): boolean {
    if (!url) return false;
    try {
        const parsed = new URL(url);
        if (parsed.protocol !== "https:" && parsed.protocol !== "http:") return false;
        const host = parsed.hostname.toLowerCase();
        if (
            host === "localhost" ||
            host === "127.0.0.1" ||
            host === "0.0.0.0" ||
            host.endsWith(".local") ||
            !host.includes(".")
        ) {
            return false;
        }
        return true;
    } catch {
        return false;
    }
}

export function buildKitchenActionButtons(
    orderId: number,
    options?: {
        address?: string | null;
        phone?: string | null;
        delivery?: string | null;
        zoneName?: string | null;
    },
): TelegramInlineButton[] {
    const buttons: TelegramInlineButton[] = [];
    const phone = options?.phone?.trim();

    if (phone) {
        const digits = extractWhatsAppPhone(phone);
        if (digits.length >= 8) {
            buttons.push({
                text: "💬 WhatsApp",
                url: `https://wa.me/${digits}`,
            });
        }
    }

    return buttons;
}

export function buildKitchenStatusKeyboard(
    orderIdOrOptions: number | KitchenKeyboardOptions,
) {
    const options: KitchenKeyboardOptions =
        typeof orderIdOrOptions === "number"
            ? { orderId: orderIdOrOptions }
            : orderIdOrOptions;

    const {
        orderId,
        status = "NEW",
        phone,
        delivery,
    } = options;
    const keyboard: TelegramInlineButton[][] = [];

    const isDelivery = delivery === "delivery" || delivery === "DELIVERY";
    const deliveryType: "delivery" | "pickup" = isDelivery ? "delivery" : "pickup";

    const adminUrl = `${SITE_URL}/admin/orders?q=${orderId}`;
    const adminButton: TelegramInlineButton | null = isValidTelegramButtonUrl(adminUrl)
        ? {
            text: "🔗 В админку",
            url: adminUrl,
        }
        : null;

    // 1. Верхний ряд быстрой связи и админки (симметричный ряд 50% / 50%)
    const topRow: TelegramInlineButton[] = [];
    if (phone) {
        const digits = extractWhatsAppPhone(phone);
        if (digits.length >= 8) {
            topRow.push({
                text: adminButton ? "💬 WhatsApp" : "💬 Написать в WhatsApp",
                url: `https://wa.me/${digits}`,
            });
        }
    }
    if (adminButton) {
        topRow.push(adminButton);
    }
    if (topRow.length > 0) {
        keyboard.push(topRow);
    }

    // 2. Если заказ завершен или отменен - компактная клавиатура без лишних кнопок
    if (status === "DONE") {
        const doneRow: TelegramInlineButton[] = [
            {
                text: "🔄 Вернуть в работу",
                callback_data: buildKitchenCallbackData(orderId, "COOKING"),
            },
        ];
        if (adminButton) doneRow.push(adminButton);
        keyboard.push(doneRow);
        return { inline_keyboard: keyboard };
    }

    if (status === "CANCELLED") {
        if (adminButton) {
            keyboard.push([adminButton]);
        }
        return { inline_keyboard: keyboard };
    }

    // 3. Ряд времени готовности (ETA) - для активных заказов
    keyboard.push(
        ETA_PRESET_MINUTES.map((minutes) => ({
            text: `⏱ ${minutes}м`,
            callback_data: buildKitchenEtaCallbackData(orderId, minutes),
        })),
    );

    // 4. Статусные кнопки в зависимости от текущего статуса и типа заказа
    if (status === "PENDING_APPROVAL") {
        keyboard.push([
            {
                text: "👨‍🍳 Принять в работу",
                callback_data: buildKitchenCallbackData(orderId, "COOKING"),
            },
        ]);
    } else if (status === "NEW") {
        // Ряд 1: Готовится + Передан курьеру / Готов к выдаче (2 кнопки рядом)
        keyboard.push([
            {
                text: orderStatusTelegramButtonLabel("COOKING", deliveryType),
                callback_data: buildKitchenCallbackData(orderId, "COOKING"),
            },
            {
                text: orderStatusTelegramButtonLabel("DELIVERING", deliveryType),
                callback_data: buildKitchenCallbackData(orderId, "DELIVERING"),
            },
        ]);
        // Ряд 2: Финальный статус (на всю ширину, выразительная кнопка)
        keyboard.push([
            {
                text: orderStatusTelegramButtonLabel("DONE", deliveryType),
                callback_data: buildKitchenCallbackData(orderId, "DONE"),
            },
        ]);
    } else if (status === "COOKING") {
        // Главное следующее действие: Передать курьеру / Готов к выдаче
        keyboard.push([
            {
                text: orderStatusTelegramButtonLabel("DELIVERING", deliveryType),
                callback_data: buildKitchenCallbackData(orderId, "DELIVERING"),
            },
        ]);
        // Завершить заказ сразу (на всю ширину)
        keyboard.push([
            {
                text: orderStatusTelegramButtonLabel("DONE", deliveryType),
                callback_data: buildKitchenCallbackData(orderId, "DONE"),
            },
        ]);
    } else if (status === "DELIVERING") {
        // Главное действие: Доставлен / Выдан
        keyboard.push([
            {
                text: orderStatusTelegramButtonLabel("DONE", deliveryType),
                callback_data: buildKitchenCallbackData(orderId, "DONE"),
            },
        ]);
        // Откат: Назад на кухню
        keyboard.push([
            {
                text: "🔥 Назад на кухню",
                callback_data: buildKitchenCallbackData(orderId, "COOKING"),
            },
        ]);
    } else {
        keyboard.push(
            KITCHEN_BUTTON_STATUSES.map((s) => ({
                text: orderStatusTelegramButtonLabel(s, deliveryType),
                callback_data: buildKitchenCallbackData(orderId, s),
            })),
        );
    }

    // 5. Нижний ряд: защищенная отмена заказа (изолирована на отдельной строке)
    keyboard.push([
        {
            text: "❌ Отменить заказ",
            callback_data: buildKitchenCallbackData(orderId, "CANCEL_PROMPT"),
        },
    ]);

    return { inline_keyboard: keyboard };
}

/** Клавиатура подтверждения отмены для защиты от мисклика */
export function buildKitchenCancelConfirmKeyboard(orderId: number) {
    return {
        inline_keyboard: [
            [
                {
                    text: "❌ Да, отменить",
                    callback_data: buildKitchenCallbackData(orderId, "CANCEL_YES"),
                },
                {
                    text: "↩️ Не отменять",
                    callback_data: buildKitchenCallbackData(orderId, "CANCEL_NO"),
                },
            ],
        ],
    };
}

const STATUS_FOOTER_RE = /\n\n🔄 <i>Статус обновлен:.*?<\/i>|\n\n🔄 Статус обновлен:.*$/u;
const ETA_FOOTER_RE = /\n\n⏱ <i>Ожидаемое время готовности:.*?<\/i>|\n\n⏱ Ожидаемое время готовности:.*$/u;

export function stripKitchenFooters(messageText: string): string {
    return messageText.replace(STATUS_FOOTER_RE, "").replace(ETA_FOOTER_RE, "").trimEnd();
}

function formatYerevanTime(date: Date = new Date()): string {
    return new Intl.DateTimeFormat("ru-RU", {
        hour: "2-digit",
        minute: "2-digit",
        timeZone: STORE_TIMEZONE,
    }).format(date);
}

export function updateKitchenMessageStatusHeader(
    messageText: string,
    orderId: number,
    status: OrderStatus,
    deliveryType: "delivery" | "pickup" = "delivery",
): string {
    let header = "";
    switch (status) {
        case "PENDING_APPROVAL":
            header = `⏳ <b>Заказ №${orderId} — ТРЕБУЕТ ОДОБРЕНИЯ</b>`;
            break;
        case "COOKING":
            header = `👨‍🍳 <b>Заказ №${orderId} — ГОТОВИТСЯ</b>`;
            break;
        case "DELIVERING":
            header =
                deliveryType === "pickup"
                    ? `🛍 <b>Заказ №${orderId} — ГОТОВ К ВЫДАЧЕ</b>`
                    : `🛵 <b>Заказ №${orderId} — ПЕРЕДАН КУРЬЕРУ</b>`;
            break;
        case "DONE":
            header =
                deliveryType === "pickup"
                    ? `✅ <b>Заказ №${orderId} — ВЫДАН КЛИЕНТУ</b>`
                    : `✅ <b>Заказ №${orderId} — ВЫПОЛНЕН</b>`;
            break;
        case "CANCELLED":
            header = `❌ <b>Заказ №${orderId} — ОТМЕНЁН</b>`;
            break;
        default:
            header = `🍣 <b>Новый заказ East West</b>\n📋 <b>Заказ №${orderId}</b>`;
            break;
    }

    const lines = messageText.split("\n");
    const bodyStartIndex = lines.findIndex(
        (l) =>
            l.includes("Имя:") ||
            l.includes("ПРЕДЗАКАЗ") ||
            l.includes("Телефон:"),
    );

    if (bodyStartIndex > 0) {
        const bodyPart = lines.slice(bodyStartIndex).join("\n");
        return `${header}\n\n${bodyPart}`;
    }

    lines[0] = header;
    return lines.join("\n");
}

export function appendKitchenStatusFooter(
    messageText: string,
    status: KitchenButtonStatus | OrderStatus,
): string {
    const base = stripKitchenFooters(messageText);
    return `${base}\n\n🔄 <i>Статус обновлен: ${formatYerevanTime()} (${orderStatusLabel(status)})</i>`;
}

export function appendKitchenEtaFooter(messageText: string, at: Date): string {
    const withoutEta = messageText.replace(ETA_FOOTER_RE, "").trimEnd();
    return `${withoutEta}\n\n⏱ <i>Ожидаемое время готовности: ${formatEstimatedDeliveryTime(at)}</i>`;
}

export type TelegramApiResult<T> =
    | { ok: true; result: T }
    | { ok: false; description?: string };

export async function telegramApi<T>(
    method: string,
    body: Record<string, unknown>,
): Promise<TelegramApiResult<T>> {
    const botToken = getTelegramBotToken();
    if (!botToken) {
        return { ok: false, description: "TELEGRAM_BOT_TOKEN is not set" };
    }

    try {
        const res = await fetchWithTimeout(
            `https://api.telegram.org/bot${botToken}/${method}`,
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body),
            },
            DEFAULT_FETCH_TIMEOUT_MS,
        );

        const json = (await res.json().catch(() => null)) as
            | TelegramApiResult<T>
            | null;

        if (!json) {
            return { ok: false, description: "Invalid Telegram response" };
        }

        if (!json.ok) {
            console.error(
                `[telegram] ${method} failed: ${json.description ?? "unknown error"}`,
            );
        }

        return json;
    } catch (error) {
        console.error(`[telegram] ${method} request failed:`, error);
        return { ok: false, description: "Telegram request failed" };
    }
}

export async function answerKitchenCallbackQuery(
    callbackQueryId: string,
    text: string,
): Promise<void> {
    await telegramApi("answerCallbackQuery", {
        callback_query_id: callbackQueryId,
        text,
        show_alert: false,
    });
}

export async function editKitchenMessageKeyboard(params: {
    chatId: number | string;
    messageId: number;
    replyMarkup: unknown;
}): Promise<void> {
    await telegramApi("editMessageReplyMarkup", {
        chat_id: params.chatId,
        message_id: params.messageId,
        reply_markup: params.replyMarkup,
    });
}

/**
 * Восстанавливает разметку HTML и кликабельную ссылку на адрес в сообщении Telegram,
 * если Telegram прислал plain text через callback.message.text.
 */
export function restoreKitchenMessageFormatting(
    messageText: string,
    options?: {
        address?: string | null;
        zoneName?: string | null;
        delivery?: string | null;
    },
): string {
    const isDelivery = options?.delivery === "delivery" || options?.delivery === "DELIVERY";
    const address = options?.address?.trim();
    const zoneName = options?.zoneName;

    return messageText
        .split("\n")
        .map((line) => {
            const trimmed = line.trim();

            // Восстановление ссылки на адрес доставки
            if (trimmed.startsWith("📍 Адрес:") || trimmed.startsWith("<b>📍 Адрес:</b>")) {
                if (isDelivery && address) {
                    const mapUrl = buildYandexMapsUrl(address, zoneName);
                    return `<b>📍 Адрес:</b> <a href="${mapUrl}"><u>${escapeHtml(address)}</u> ↗️</a>`;
                }
            }

            // Восстановление тегов заголовков строк, если Telegram вернул plain text
            if (trimmed.startsWith("👤 Имя:") && !trimmed.startsWith("<b>👤 Имя:</b>")) {
                return trimmed.replace(/^👤 Имя:\s*/, "<b>👤 Имя:</b> ");
            }
            if (trimmed.startsWith("📞 Телефон:") && !trimmed.startsWith("<b>📞 Телефон:</b>")) {
                return trimmed.replace(/^📞 Телефон:\s*/, "<b>📞 Телефон:</b> ");
            }
            if (trimmed.startsWith("🗺 Зона:") && !trimmed.startsWith("<b>🗺 Зона:</b>")) {
                return trimmed.replace(/^🗺 Зона:\s*/, "<b>🗺 Зона:</b> ");
            }
            if (trimmed.startsWith("📍 Способ: Самовывоз")) {
                return "<b>📍 Способ:</b> <i>Самовывоз</i>";
            }
            if (trimmed.startsWith("💳 Оплата:") && !trimmed.startsWith("<b>💳 Оплата:</b>")) {
                return trimmed.replace(/^💳 Оплата:\s*/, "<b>💳 Оплата:</b> ");
            }
            if (trimmed.startsWith("💵 Клиент даст:") && !trimmed.startsWith("<b>💵 Клиент даст:</b>")) {
                return trimmed.replace(/^💵 Клиент даст:\s*/, "<b>💵 Клиент даст:</b> ");
            }
            if (trimmed.startsWith("💵 Сдача:") && !trimmed.startsWith("<b>💵 Сдача:</b>")) {
                return trimmed.replace(/^💵 Сдача:\s*/, "<b>💵 Сдача:</b> ");
            }
            if (trimmed.startsWith("💬 Комментарий:") && !trimmed.startsWith("💬 <b>Комментарий:</b>")) {
                return trimmed.replace(/^💬 Комментарий:\s*/, "💬 <b>Комментарий:</b> ");
            }
            if (trimmed.startsWith("🥢 КОМПЛЕКТАЦИЯ:") && !trimmed.startsWith("🥢 <b>КОМПЛЕКТАЦИЯ:</b>")) {
                return trimmed.replace(/^🥢 КОМПЛЕКТАЦИЯ:\s*/, "🥢 <b>КОМПЛЕКТАЦИЯ:</b> ");
            }
            if (trimmed === "🧾 Позиции:") {
                return "<b>🧾 Позиции:</b>";
            }
            if (trimmed.startsWith("💰 Итого:") && !trimmed.startsWith("<b>💰 Итого:")) {
                return `<b>${trimmed}</b>`;
            }

            return line;
        })
        .join("\n");
}

export async function editKitchenOrderMessageWithKeyboard(params: {
    chatId: number | string;
    messageId: number;
    text: string;
    orderId: number;
    status: KitchenButtonStatus | OrderStatus;
    address?: string | null;
    phone?: string | null;
    delivery?: string | null;
    zoneName?: string | null;
}): Promise<void> {
    const restoredText = restoreKitchenMessageFormatting(params.text, {
        address: params.address,
        zoneName: params.zoneName,
        delivery: params.delivery,
    });
    const deliveryType = params.delivery === "pickup" ? "pickup" : "delivery";
    const withHeader = updateKitchenMessageStatusHeader(
        restoredText,
        params.orderId,
        params.status,
        deliveryType,
    );
    const nextText = appendKitchenStatusFooter(withHeader, params.status);
    await telegramApi("editMessageText", {
        chat_id: params.chatId,
        message_id: params.messageId,
        text: nextText,
        parse_mode: "HTML",
        disable_web_page_preview: true,
        link_preview_options: { is_disabled: true },
        reply_markup: buildKitchenStatusKeyboard({
            orderId: params.orderId,
            status: params.status,
            address: params.address,
            phone: params.phone,
            delivery: params.delivery,
            zoneName: params.zoneName,
        }),
    });
}

export async function editKitchenOrderMessageEta(params: {
    chatId: number | string;
    messageId: number;
    text: string;
    orderId: number;
    estimatedDeliveryAt: Date;
    status?: OrderStatus;
    address?: string | null;
    phone?: string | null;
    delivery?: string | null;
    zoneName?: string | null;
}): Promise<void> {
    const restoredText = restoreKitchenMessageFormatting(params.text, {
        address: params.address,
        zoneName: params.zoneName,
        delivery: params.delivery,
    });
    const nextText = appendKitchenEtaFooter(restoredText, params.estimatedDeliveryAt);
    await telegramApi("editMessageText", {
        chat_id: params.chatId,
        message_id: params.messageId,
        text: nextText,
        parse_mode: "HTML",
        disable_web_page_preview: true,
        link_preview_options: { is_disabled: true },
        reply_markup: buildKitchenStatusKeyboard({
            orderId: params.orderId,
            status: params.status,
            address: params.address,
            phone: params.phone,
            delivery: params.delivery,
            zoneName: params.zoneName,
        }),
    });
}

export async function pinKitchenMessage(
    chatId: number | string,
    messageId: number,
): Promise<void> {
    await telegramApi("pinChatMessage", {
        chat_id: chatId,
        message_id: messageId,
        disable_notification: false,
    });
}

export async function unpinKitchenMessage(
    chatId: number | string,
    messageId: number,
): Promise<void> {
    await telegramApi("unpinChatMessage", {
        chat_id: chatId,
        message_id: messageId,
    });
}

export async function sendKitchenTextMessage(
    chatId: number | string,
    text: string,
    replyMarkup?: unknown,
): Promise<TelegramApiResult<{ message_id: number }>> {
    return telegramApi<{ message_id: number }>("sendMessage", {
        chat_id: chatId,
        text,
        parse_mode: "HTML",
        disable_web_page_preview: true,
        link_preview_options: { is_disabled: true },
        ...(replyMarkup ? { reply_markup: replyMarkup } : {}),
    });
}

export function isAuthorizedKitchenChat(chatId: number | string | undefined): boolean {
    if (chatId == null) return false;
    const allowed = getKitchenChatIds();
    return allowed.includes(String(chatId));
}

export function isTelegramWebhookAuthorized(request: Request): boolean {
    const expected = process.env.TELEGRAM_WEBHOOK_TOKEN?.trim();
    if (!expected) return false;

    const url = new URL(request.url);
    const queryToken = url.searchParams.get("token") ?? "";
    if (queryToken && timingSafeStringEqual(queryToken, expected)) return true;

    const header = request.headers.get("X-Telegram-Bot-Api-Secret-Token") ?? "";
    return header.length > 0 && timingSafeStringEqual(header, expected);
}
