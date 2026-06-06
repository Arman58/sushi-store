import { NextResponse } from "next/server";

import { computeEstimatedDeliveryAt } from "@/lib/order-status";
import {
    type KitchenButtonStatus,
    orderStatusLabel,
    UpdateOrderEtaError,
    UpdateOrderStatusError,
    updateOrderEstimatedDeliveryAt,
    updateOrderStatus,
} from "@/lib/order-service";
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

type TelegramCallbackQuery = {
    id: string;
    data?: string;
    message?: {
        message_id: number;
        chat: { id: number | string };
        text?: string;
    };
};

type TelegramUpdate = {
    callback_query?: TelegramCallbackQuery;
};

export async function POST(request: Request) {
    if (!isKitchenTelegramConfigured()) {
        return NextResponse.json({ ok: false, error: "Telegram not configured" }, {
            status: 503,
        });
    }

    if (!isTelegramWebhookAuthorized(request)) {
        return new NextResponse("Forbidden", { status: 403 });
    }

    let update: TelegramUpdate;
    try {
        update = (await request.json()) as TelegramUpdate;
    } catch {
        return NextResponse.json({ ok: false }, { status: 400 });
    }

    const callback = update.callback_query;
    if (!callback?.data || !callback.id) {
        return NextResponse.json({ ok: true });
    }

    const chatId = callback.message?.chat.id;
    if (!isAuthorizedKitchenChat(chatId)) {
        return NextResponse.json({ ok: true });
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

            await answerKitchenCallbackQuery(
                callback.id,
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

            return NextResponse.json({
                ok: true,
                orderId: updated.id,
                estimatedDeliveryAt: updated.estimatedDeliveryAt.toISOString(),
            });
        } catch (error) {
            if (error instanceof UpdateOrderEtaError) {
                if (error.code === "NOT_FOUND") {
                    return NextResponse.json({ ok: true });
                }
                await answerKitchenCallbackQuery(callback.id, error.message);
                return NextResponse.json({ ok: true });
            }

            console.error("Telegram ETA webhook error:", error);
            await answerKitchenCallbackQuery(callback.id, "Ошибка установки времени");
            return NextResponse.json({ ok: false }, { status: 500 });
        }
    }

    const parsed = parseKitchenCallbackData(callback.data);
    if (!parsed) {
        return NextResponse.json({ ok: true });
    }

    const { orderId, status } = parsed;

    try {
        const updated = await updateOrderStatus(orderId, status);
        const label = orderStatusLabel(updated.status);

        await answerKitchenCallbackQuery(
            callback.id,
            `Заказ №${orderId}: ${label}`,
        );

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

        return NextResponse.json({ ok: true, orderId: updated.id, status: updated.status });
    } catch (error) {
        if (error instanceof UpdateOrderStatusError) {
            if (error.code === "NOT_FOUND") {
                return NextResponse.json({ ok: true });
            }
            if (error.code === "CANCELLED_LOCKED") {
                await answerKitchenCallbackQuery(callback.id, "Заказ уже отменён");
                return NextResponse.json({ ok: true });
            }
        }

        console.error("Telegram webhook error:", error);
        await answerKitchenCallbackQuery(callback.id, "Ошибка обновления статуса");
        return NextResponse.json({ ok: false }, { status: 500 });
    }
}
