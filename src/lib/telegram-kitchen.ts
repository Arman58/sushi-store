import type { KitchenButtonStatus } from "@/lib/order-service";
import {
    KITCHEN_BUTTON_STATUSES,
    orderStatusLabel,
    orderStatusTelegramButtonLabel,
} from "@/lib/order-service";

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

export { KITCHEN_BUTTON_STATUSES as KITCHEN_TELEGRAM_STATUSES };
export type KitchenTelegramStatus = KitchenButtonStatus;

export function isKitchenTelegramConfigured(): boolean {
    return Boolean(TELEGRAM_BOT_TOKEN && TELEGRAM_CHAT_ID);
}

/** callback_data: ord_{id}_{STATUS}, напр. ord_15_IN_WORK (≤ 64 байт) */
export function buildKitchenCallbackData(
    orderId: number,
    status: KitchenButtonStatus,
): string {
    return `ord_${orderId}_${status}`;
}

export function parseKitchenCallbackData(
    data: string,
): { orderId: number; status: KitchenButtonStatus } | null {
    const match = /^ord_(\d+)_(IN_WORK|DELIVERING|DONE|CANCELLED)$/.exec(data.trim());
    if (!match) return null;

    const orderId = Number(match[1]);
    if (!Number.isFinite(orderId) || orderId <= 0) return null;

    return {
        orderId,
        status: match[2] as KitchenButtonStatus,
    };
}

export function buildKitchenStatusKeyboard(orderId: number) {
    return {
        inline_keyboard: [
            [
                {
                    text: orderStatusTelegramButtonLabel("IN_WORK"),
                    callback_data: buildKitchenCallbackData(orderId, "IN_WORK"),
                },
                {
                    text: orderStatusTelegramButtonLabel("DELIVERING"),
                    callback_data: buildKitchenCallbackData(orderId, "DELIVERING"),
                },
            ],
            [
                {
                    text: orderStatusTelegramButtonLabel("DONE"),
                    callback_data: buildKitchenCallbackData(orderId, "DONE"),
                },
                {
                    text: orderStatusTelegramButtonLabel("CANCELLED"),
                    callback_data: buildKitchenCallbackData(orderId, "CANCELLED"),
                },
            ],
        ],
    };
}

const STATUS_FOOTER_RE = /\n\n🔄 Статус обновлен:.*$/u;

export function appendKitchenStatusFooter(
    messageText: string,
    status: KitchenButtonStatus,
): string {
    const base = messageText.replace(STATUS_FOOTER_RE, "").trimEnd();
    return `${base}\n\n🔄 Статус обновлен: ${orderStatusLabel(status)}`;
}

type TelegramApiResult<T> = { ok: true; result: T } | { ok: false; description?: string };

async function telegramApi<T>(
    method: string,
    body: Record<string, unknown>,
): Promise<TelegramApiResult<T>> {
    if (!TELEGRAM_BOT_TOKEN) {
        return { ok: false, description: "TELEGRAM_BOT_TOKEN is not set" };
    }

    try {
        const res = await fetch(
            `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/${method}`,
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body),
            },
        );

        const json = (await res.json().catch(() => null)) as
            | TelegramApiResult<T>
            | null;

        if (!json) {
            return { ok: false, description: "Invalid Telegram response" };
        }

        if (!json.ok) {
            console.error(`Telegram ${method} error:`, json);
        }

        return json;
    } catch (error) {
        console.error(`Telegram ${method} request failed:`, error);
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

export async function editKitchenOrderMessageWithKeyboard(params: {
    chatId: number | string;
    messageId: number;
    text: string;
    orderId: number;
    status: KitchenButtonStatus;
}): Promise<void> {
    const nextText = appendKitchenStatusFooter(params.text, params.status);
    await telegramApi("editMessageText", {
        chat_id: params.chatId,
        message_id: params.messageId,
        text: nextText,
        parse_mode: "HTML",
        reply_markup: buildKitchenStatusKeyboard(params.orderId),
    });
}

export function isAuthorizedKitchenChat(chatId: number | string | undefined): boolean {
    if (!TELEGRAM_CHAT_ID || chatId == null) return false;
    return String(chatId) === String(TELEGRAM_CHAT_ID);
}

export function isTelegramWebhookAuthorized(request: Request): boolean {
    const expected = process.env.TELEGRAM_WEBHOOK_TOKEN;
    if (!expected) return false;

    const url = new URL(request.url);
    if (url.searchParams.get("token") === expected) return true;

    const header = request.headers.get("X-Telegram-Bot-Api-Secret-Token");
    return header === expected;
}
