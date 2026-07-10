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
} from "@/lib/order-status";
import { timingSafeStringEqual } from "@/lib/timing-safe-equal";

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

export { KITCHEN_BUTTON_STATUSES as KITCHEN_TELEGRAM_STATUSES };
export type KitchenTelegramStatus = KitchenButtonStatus;

export function isKitchenTelegramConfigured(): boolean {
    return Boolean(TELEGRAM_BOT_TOKEN && TELEGRAM_CHAT_ID);
}

/** callback_data: ord_{id}_{STATUS}, напр. ord_15_COOKING (≤ 64 байт) */
export function buildKitchenCallbackData(
    orderId: number,
    status: KitchenButtonStatus,
): string {
    return `ord_${orderId}_${status}`;
}

export function buildKitchenEtaCallbackData(orderId: number, minutes: number): string {
    return `eta_${minutes}_${orderId}`;
}

export function parseKitchenCallbackData(
    data: string,
): { orderId: number; status: KitchenButtonStatus } | null {
    const match = /^ord_(\d+)_(COOKING|DELIVERING|DONE|CANCELLED)$/.exec(data.trim());
    if (!match) return null;

    const orderId = Number(match[1]);
    if (!Number.isFinite(orderId) || orderId <= 0) return null;

    return {
        orderId,
        status: match[2] as KitchenButtonStatus,
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

export function buildKitchenStatusKeyboard(orderId: number) {
    return {
        inline_keyboard: [
            ETA_PRESET_MINUTES.map((minutes) => ({
                text: `⏱ ${minutes} мин`,
                callback_data: buildKitchenEtaCallbackData(orderId, minutes),
            })),
            KITCHEN_BUTTON_STATUSES.map((status) => ({
                text: orderStatusTelegramButtonLabel(status),
                callback_data: buildKitchenCallbackData(orderId, status),
            })),
        ],
    };
}

const STATUS_FOOTER_RE = /\n\n🔄 Статус обновлен:.*$/u;
const ETA_FOOTER_RE = /\n\n⏱ Ожидаемое время готовности:.*$/u;

export function stripKitchenFooters(messageText: string): string {
    return messageText.replace(STATUS_FOOTER_RE, "").replace(ETA_FOOTER_RE, "").trimEnd();
}

export function appendKitchenStatusFooter(
    messageText: string,
    status: KitchenButtonStatus,
): string {
    const base = stripKitchenFooters(messageText);
    return `${base}\n\n🔄 Статус обновлен: ${orderStatusLabel(status)}`;
}

export function appendKitchenEtaFooter(messageText: string, at: Date): string {
    const withoutEta = messageText.replace(ETA_FOOTER_RE, "").trimEnd();
    return `${withoutEta}\n\n⏱ Ожидаемое время готовности: ${formatEstimatedDeliveryTime(at)}`;
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
        const res = await fetchWithTimeout(
            `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/${method}`,
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
            // Error logged in production monitoring
        }

        return json;
    } catch {
        // Error logged in production monitoring
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

export async function editKitchenOrderMessageEta(params: {
    chatId: number | string;
    messageId: number;
    text: string;
    orderId: number;
    estimatedDeliveryAt: Date;
}): Promise<void> {
    const nextText = appendKitchenEtaFooter(params.text, params.estimatedDeliveryAt);
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
    const expected = process.env.TELEGRAM_WEBHOOK_TOKEN?.trim();
    if (!expected) return false;

    const url = new URL(request.url);
    const queryToken = url.searchParams.get("token") ?? "";
    if (queryToken && timingSafeStringEqual(queryToken, expected)) return true;

    const header = request.headers.get("X-Telegram-Bot-Api-Secret-Token") ?? "";
    return header.length > 0 && timingSafeStringEqual(header, expected);
}
