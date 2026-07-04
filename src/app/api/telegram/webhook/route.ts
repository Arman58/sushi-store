import { NextResponse } from "next/server";
import { z } from "zod";

import { telegramWebhookBodySchema } from "@/lib/api-schemas";
import { debugLog } from "@/lib/debug-log";
import {
    type KitchenButtonStatus,
    orderStatusLabel,
    updateOrderEstimatedDeliveryAt,
    UpdateOrderEtaError,
    updateOrderStatus,
    UpdateOrderStatusError,
} from "@/lib/order-service";
import { computeEstimatedDeliveryAt } from "@/lib/order-status";
import {
    answerKitchenCallbackQuery,
    editKitchenOrderMessageEta,
    editKitchenOrderMessageWithKeyboard,
    isAuthorizedKitchenChat,
    isKitchenTelegramConfigured,
    isTelegramWebhookAuthorized,
    parseKitchenCallbackData,
    parseKitchenEtaCallbackData,
} from "@/lib/telegram-kitchen";

type TelegramUpdate = z.infer<typeof telegramWebhookBodySchema>;

async function replyToCallback(callbackId: string, text: string): Promise<void> {
    await answerKitchenCallbackQuery(callbackId, text);
}

export async function POST(request: Request) {
    if (!isKitchenTelegramConfigured()) {
        return NextResponse.json({ ok: false, error: "Telegram not configured" }, {
            status: 503,
        });
    }

    if (!isTelegramWebhookAuthorized(request)) {
        return new NextResponse("Forbidden", { status: 403 });
    }

    let json: unknown;
    try {
        json = await request.json();
    } catch {
        return NextResponse.json({ ok: false }, { status: 400 });
    }

    const bodyParsed = telegramWebhookBodySchema.safeParse(json);
    if (!bodyParsed.success) {
        return NextResponse.json({ ok: false }, { status: 400 });
    }

    const update: TelegramUpdate = bodyParsed.data;

    const callback = update.callback_query;
    if (!callback?.id) {
        return NextResponse.json({ ok: true }, { status: 200 });
    }

    const callbackId = callback.id;

    try {
        if (!callback.data) {
            await replyToCallback(callbackId, "Некорректные данные");
            return NextResponse.json({ ok: true }, { status: 200 });
        }

        const chatId = callback.message?.chat.id;
        if (!isAuthorizedKitchenChat(chatId)) {
            await replyToCallback(callbackId, "Нет доступа");
            return NextResponse.json({ ok: true }, { status: 200 });
        }

        const etaParsed = parseKitchenEtaCallbackData(callback.data);
        if (etaParsed) {
            const { orderId, minutes } = etaParsed;

            try {
                const estimatedDeliveryAt = computeEstimatedDeliveryAt(minutes);
                const updated = await updateOrderEstimatedDeliveryAt(
                    orderId,
                    estimatedDeliveryAt,
                );

                await replyToCallback(
                    callbackId,
                    `Заказ №${orderId}: ETA ${minutes} мин`,
                );

                const message = callback.message;
                if (message?.message_id != null && message.text) {
                    await editKitchenOrderMessageEta({
                        chatId: message.chat.id,
                        messageId: message.message_id,
                        text: message.text,
                        orderId,
                        estimatedDeliveryAt: updated.estimatedDeliveryAt,
                    });
                }
            } catch (error) {
                if (error instanceof UpdateOrderEtaError) {
                    const text =
                        error.code === "NOT_FOUND" ? "Заказ не найден" : error.message;
                    await replyToCallback(callbackId, text);
                } else {
                    await replyToCallback(callbackId, "Ошибка установки времени");
                }
            }

            return NextResponse.json({ ok: true }, { status: 200 });
        }

        const statusParsed = parseKitchenCallbackData(callback.data);
        if (!statusParsed) {
            await replyToCallback(callbackId, "Неизвестная команда");
            return NextResponse.json({ ok: true }, { status: 200 });
        }

        const { orderId, status } = statusParsed;

        try {
            debugLog("[TELEGRAM WEBHOOK] Updating order:", orderId, "to", status);
            const updated = await updateOrderStatus(orderId, status);
            const label = orderStatusLabel(updated.status);

            await replyToCallback(callbackId, `Заказ №${orderId}: ${label}`);

            const message = callback.message;
            if (message?.message_id != null && message.text) {
                await editKitchenOrderMessageWithKeyboard({
                    chatId: message.chat.id,
                    messageId: message.message_id,
                    text: message.text,
                    orderId,
                    status: status as KitchenButtonStatus,
                });
            }
        } catch (error) {
            if (error instanceof UpdateOrderStatusError) {
                const text =
                    error.code === "NOT_FOUND"
                        ? "Заказ не найден"
                        : error.code === "CANCELLED_LOCKED"
                          ? "Заказ уже отменён"
                          : error.message;
                await replyToCallback(callbackId, text);
            } else {
                await replyToCallback(callbackId, "Ошибка обновления статуса");
            }
        }

        return NextResponse.json({ ok: true }, { status: 200 });
    } catch {
        await replyToCallback(callbackId, "Ошибка обработки");
        return NextResponse.json({ ok: true }, { status: 200 });
    }
}
