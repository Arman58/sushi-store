import type { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";

import { telegramWebhookBodySchema } from "@/lib/api-schemas";
import { debugLog } from "@/lib/debug-log";
import { escapeHtml } from "@/lib/escape-html";
import {
    type KitchenButtonStatus,
    orderStatusLabel,
    updateOrderEstimatedDeliveryAt,
    UpdateOrderEtaError,
    updateOrderStatus,
    UpdateOrderStatusError,
} from "@/lib/order-service";
import { computeEstimatedDeliveryAt, STORE_TIMEZONE } from "@/lib/order-status";
import { prisma } from "@/lib/prisma";
import {
    answerKitchenCallbackQuery,
    buildKitchenCancelConfirmKeyboard,
    buildKitchenStatusKeyboard,
    editKitchenMessageKeyboard,
    editKitchenOrderMessageEta,
    editKitchenOrderMessageWithKeyboard,
    isAuthorizedKitchenChat,
    isKitchenTelegramConfigured,
    isTelegramWebhookAuthorized,
    parseKitchenCallbackData,
    parseKitchenEtaCallbackData,
    sendKitchenTextMessage,
    unpinKitchenMessage,
} from "@/lib/telegram-kitchen";
import { formatKitchenOrderHtml } from "@/lib/telegram-kitchen-notify";

type TelegramUpdate = z.infer<typeof telegramWebhookBodySchema>;

async function replyToCallback(callbackId: string, text: string): Promise<void> {
    await answerKitchenCallbackQuery(callbackId, text);
}

/** Динамическое вычисление начала текущих суток (00:00:00) в часовом поясе заведения без хардкода */
function getStartOfTodayInTimezone(timeZone: string): Date {
    const now = new Date();
    const formatter = new Intl.DateTimeFormat("en-US", {
        timeZone,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    });
    const parts = formatter.formatToParts(now);
    const year = Number(parts.find((p) => p.type === "year")?.value);
    const month = Number(parts.find((p) => p.type === "month")?.value);
    const day = Number(parts.find((p) => p.type === "day")?.value);

    const tempDate = new Date(Date.UTC(year, month - 1, day, 0, 0, 0));
    const tzDate = new Date(tempDate.toLocaleString("en-US", { timeZone }));
    const utcDate = new Date(tempDate.toLocaleString("en-US", { timeZone: "UTC" }));
    const offsetMs = tzDate.getTime() - utcDate.getTime();

    return new Date(tempDate.getTime() - offsetMs);
}

/** Сводка выручки и заказов за сегодняшний день (по часовому поясу STORE_TIMEZONE) */
async function handleTodayCommand(chatId: number | string): Promise<void> {
    const startOfTodayUtc = getStartOfTodayInTimezone(STORE_TIMEZONE);

    const orders = await prisma.order.findMany({
        where: {
            createdAt: { gte: startOfTodayUtc },
        },
        select: {
            id: true,
            status: true,
            totalPrice: true,
            payment: true,
            delivery: true,
        },
    });

    const totalOrders = orders.length;
    const validOrders = orders.filter((o) => o.status !== "CANCELLED");
    const cancelledCount = totalOrders - validOrders.length;

    const pendingCount = orders.filter((o) => o.status === "PENDING_APPROVAL").length;
    const newCount = orders.filter((o) => o.status === "NEW").length;
    const cookingCount = orders.filter((o) => o.status === "COOKING").length;
    const deliveringCount = orders.filter((o) => o.status === "DELIVERING").length;
    const doneCount = orders.filter((o) => o.status === "DONE").length;

    const totalRevenue = validOrders.reduce((sum, o) => sum + o.totalPrice, 0);
    const avgCheck =
        validOrders.length > 0 ? Math.round(totalRevenue / validOrders.length) : 0;

    const cashOrders = validOrders.filter((o) => o.payment === "CASH");
    const cashTotal = cashOrders.reduce((sum, o) => sum + o.totalPrice, 0);

    const cardOrders = validOrders.filter((o) => o.payment === "CARD");
    const cardTotal = cardOrders.reduce((sum, o) => sum + o.totalPrice, 0);

    const deliveryCount = validOrders.filter((o) => o.delivery === "DELIVERY").length;
    const pickupCount = validOrders.filter((o) => o.delivery === "PICKUP").length;

    const todayDateStr = new Intl.DateTimeFormat("ru-RU", {
        timeZone: STORE_TIMEZONE,
        day: "numeric",
        month: "long",
        weekday: "short",
    }).format(new Date());

    const statusLines: string[] = [];
    if (pendingCount > 0) {
        statusLines.push(`• ⏳ Требуют подтверждения: <b>${pendingCount}</b>`);
    }
    statusLines.push(`• 🆕 Новые: <b>${newCount}</b>`);
    statusLines.push(`• 👨‍🍳 Готовятся: <b>${cookingCount}</b>`);
    statusLines.push(`• 🛵 В пути: <b>${deliveringCount}</b>`);
    statusLines.push(`• ✅ Доставлены: <b>${doneCount}</b>`);
    if (cancelledCount > 0) {
        statusLines.push(`• ❌ Отменены: <b>${cancelledCount}</b>`);
    }

    const lines: string[] = [
        `📊 <b>Сводка за сегодня (${todayDateStr})</b>`,
        "",
        `💰 <b>Выручка:</b> <b>${totalRevenue.toLocaleString("ru-RU")} ֏</b>`,
        `🧾 <b>Средний чек:</b> <b>${avgCheck.toLocaleString("ru-RU")} ֏</b>`,
        `📦 <b>Всего заказов:</b> <b>${totalOrders}</b> (в работе/выполнено: ${validOrders.length}, отменено: ${cancelledCount})`,
        "",
        "<b>По статусам:</b>",
        ...statusLines,
        "",
        "<b>Оплата:</b>",
        `• 💵 Наличные: <b>${cashTotal.toLocaleString("ru-RU")} ֏</b> (${cashOrders.length} шт.)`,
        `• 💳 Картой: <b>${cardTotal.toLocaleString("ru-RU")} ֏</b> (${cardOrders.length} шт.)`,
        "",
        "<b>Тип доставки:</b>",
        `• 🛵 Доставка курьером: <b>${deliveryCount}</b>`,
        `• 🛍 Самовывоз: <b>${pickupCount}</b>`,
    ];

    await sendKitchenTextMessage(chatId, lines.join("\n"));
}

/** Список активных заказов кухни в реальном времени */
async function handleActiveCommand(chatId: number | string): Promise<void> {
    const activeOrders = await prisma.order.findMany({
        where: {
            status: { in: ["PENDING_APPROVAL", "NEW", "COOKING", "DELIVERING"] },
        },
        orderBy: { createdAt: "asc" },
        include: {
            items: true,
        },
    });

    if (activeOrders.length === 0) {
        await sendKitchenTextMessage(
            chatId,
            "🟢 <b>Все заказы выполнены!</b>\nНа данный момент активных заказов в работе нет.",
        );
        return;
    }

    const lines: string[] = [
        `🔥 <b>Заказы в работе (${activeOrders.length}):</b>\n`,
    ];

    const now = Date.now();
    for (const order of activeOrders) {
        const elapsedMins = Math.max(
            0,
            Math.floor((now - order.createdAt.getTime()) / 60000),
        );

        let statusEmoji = "🆕";
        let statusLabel = "Новый";
        if (order.status === "PENDING_APPROVAL") {
            statusEmoji = "⏳";
            statusLabel = "Требует одобрения";
        } else if (order.status === "COOKING") {
            statusEmoji = "👨‍🍳";
            statusLabel = "Готовится";
        } else if (order.status === "DELIVERING") {
            statusEmoji = "🛵";
            statusLabel = "Курьер";
        }

        let cutlery = "";
        if (order.comment) {
            const cutleryMatch = order.comment.match(/\[🥢\s*([^\]]+)\]/);
            if (cutleryMatch) {
                cutlery = ` • 🥢 ${escapeHtml(cutleryMatch[1].trim())}`;
            }
        }

        let scheduled = "";
        if (order.scheduledFor) {
            const when = new Intl.DateTimeFormat("ru-RU", {
                timeZone: STORE_TIMEZONE,
                hour: "2-digit",
                minute: "2-digit",
            }).format(order.scheduledFor);
            scheduled = ` • ⏰ Предзаказ: ${when}`;
        }

        const itemsSummary = order.items
            .map((it) => `${escapeHtml(it.name)} × ${it.quantity}`)
            .join(", ");

        const destination =
            order.delivery === "DELIVERY"
                ? order.address
                    ? escapeHtml(order.address)
                    : "Доставка"
                : "Самовывоз";

        lines.push(
            `${statusEmoji} <b>№${order.id}</b> (${statusLabel}, ${elapsedMins} мин назад)${cutlery}${scheduled}\n` +
                `👤 ${escapeHtml(order.name)} • 📍 ${destination}\n` +
                `🍣 ${itemsSummary}\n` +
                `💰 <b>${order.totalPrice.toLocaleString("ru-RU")} ֏</b> • Открыть: /order_${order.id}\n`,
        );
    }

    await sendKitchenTextMessage(chatId, lines.join("\n"));
}

/** Отправка полной интерактивной карточки заказа по его номеру */
async function handleOrderCommand(
    chatId: number | string,
    orderId: number,
): Promise<void> {
    if (!Number.isFinite(orderId) || orderId <= 0) {
        await sendKitchenTextMessage(chatId, "❌ Некорректный номер заказа.");
        return;
    }

    const order = await prisma.order.findUnique({
        where: { id: orderId },
        include: { items: true, promoCode: true },
    });

    if (!order) {
        await sendKitchenTextMessage(
            chatId,
            `❌ <b>Заказ №${orderId} не найден.</b>`,
        );
        return;
    }

    const deliveryType = order.delivery === "DELIVERY" ? "delivery" : "pickup";

    const html = formatKitchenOrderHtml({
        orderId: order.id,
        name: order.name,
        phone: order.phone,
        address: order.address ?? undefined,
        comment: order.comment ?? undefined,
        payment: order.payment === "CASH" ? "cash" : "card",
        changeFrom: order.changeFrom,
        scheduledFor: order.scheduledFor,
        delivery: deliveryType,
        verifiedItems: order.items.map((it) => ({
            productId: it.productId ?? 0,
            name: it.name,
            price: it.price,
            quantity: it.quantity,
            categoryId: null,
            selectedModifiers: (Array.isArray(it.selectedModifiers)
                ? (it.selectedModifiers as Prisma.InputJsonValue)
                : []) as Prisma.InputJsonValue,
        })),
        deliveryFee: order.deliveryPrice,
        zoneNameSnapshot: order.deliveryZoneName,
        promoCodeRaw: order.promoCode?.code,
        payableForNotify: order.totalPrice,
        grandBeforePay: order.totalPrice + order.discountAmount,
        status: order.status,
    });

    await sendKitchenTextMessage(
        chatId,
        html,
        buildKitchenStatusKeyboard({
            orderId: order.id,
            status: order.status,
            address: order.address,
            phone: order.phone,
            delivery: deliveryType,
        }),
    );
}

/** Справка по командам бота */
async function handleHelpCommand(chatId: number | string): Promise<void> {
    const text = [
        "🍣 <b>Команды Telegram-бота East West:</b>",
        "",
        "/today или /stats — Сводка за сегодня (выручка, средний чек, заказы, наличные/карта)",
        "/active — Список заказов в работе (время ожидания, статусы)",
        "/order <i>id</i> — Карточка заказа с кнопками управления (например: <code>/order 42</code>)",
        "/help — Справка по командам",
        "",
        "<i>Возможности в карточках заказов:</i>",
        "• 🗺 <b>Яндекс / Google Карты</b> — открытие навигатора в 1 тап",
        "• 💬 <b>WhatsApp</b> — быстрый чат с клиентом",
        "• ⏱ <b>Время готовности</b> — отправка ETA клиенту (15/30/45/60 мин)",
        "• 👨‍🍳 <b>Смена статуса</b> — Готовится → Курьер → Выполнен",
        "• ❌ <b>Отмена заказа</b> — с подтверждением для защиты от случайных нажатий",
    ].join("\n");

    await sendKitchenTextMessage(chatId, text);
}

export async function POST(request: Request) {
    if (!isKitchenTelegramConfigured()) {
        return NextResponse.json(
            { ok: false, error: "Telegram not configured" },
            { status: 503 },
        );
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

    // ─── 1. Обработка нажатий на инлайн-кнопки (callback_query) ───────────────
    const callback = update.callback_query;
    if (callback?.id) {
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

            // 1.1. Обработка установки времени готовности (ETA)
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
                        const order = await prisma.order.findUnique({
                            where: { id: orderId },
                            select: {
                                status: true,
                                address: true,
                                phone: true,
                                delivery: true,
                                deliveryZoneName: true,
                            },
                        });

                        await editKitchenOrderMessageEta({
                            chatId: message.chat.id,
                            messageId: message.message_id,
                            text: message.text,
                            orderId,
                            estimatedDeliveryAt: updated.estimatedDeliveryAt,
                            status: order?.status,
                            address: order?.address,
                            phone: order?.phone,
                            delivery:
                                order?.delivery === "DELIVERY" ? "delivery" : "pickup",
                            zoneName: order?.deliveryZoneName,
                        });
                    }
                } catch (error) {
                    if (error instanceof UpdateOrderEtaError) {
                        const text =
                            error.code === "NOT_FOUND"
                                ? "Заказ не найден"
                                : error.message;
                        await replyToCallback(callbackId, text);
                    } else {
                        await replyToCallback(callbackId, "Ошибка установки времени");
                    }
                }

                return NextResponse.json({ ok: true }, { status: 200 });
            }

            // 1.2. Обработка статусов и действий отмены
            const statusParsed = parseKitchenCallbackData(callback.data);
            if (!statusParsed) {
                await replyToCallback(callbackId, "Неизвестная команда");
                return NextResponse.json({ ok: true }, { status: 200 });
            }

            const { orderId, action, status } = statusParsed;
            const message = callback.message;

            // Запрос подтверждения отмены: показываем диалоговую клавиатуру
            if (action === "CANCEL_PROMPT") {
                if (message?.message_id != null) {
                    await editKitchenMessageKeyboard({
                        chatId: message.chat.id,
                        messageId: message.message_id,
                        replyMarkup: buildKitchenCancelConfirmKeyboard(orderId),
                    });
                }
                await replyToCallback(callbackId, "Подтвердите отмену заказа");
                return NextResponse.json({ ok: true }, { status: 200 });
            }

            // Отказ от отмены: возвращаем исходную статусную клавиатуру
            if (action === "CANCEL_NO") {
                const order = await prisma.order.findUnique({
                    where: { id: orderId },
                    select: {
                        status: true,
                        address: true,
                        phone: true,
                        delivery: true,
                    },
                });

                if (message?.message_id != null && order) {
                    await editKitchenMessageKeyboard({
                        chatId: message.chat.id,
                        messageId: message.message_id,
                        replyMarkup: buildKitchenStatusKeyboard({
                            orderId,
                            status: order.status,
                            address: order.address,
                            phone: order.phone,
                            delivery:
                                order.delivery === "DELIVERY" ? "delivery" : "pickup",
                        }),
                    });
                }
                await replyToCallback(callbackId, "Отмена отменена");
                return NextResponse.json({ ok: true }, { status: 200 });
            }

            // Подтверждение отмены: отменяем заказ и открепляем сообщение
            if (action === "CANCEL_YES") {
                try {
                    await updateOrderStatus(orderId, "CANCELLED");
                    await replyToCallback(callbackId, `Заказ №${orderId}: Отменён`);

                    if (message?.message_id != null) {
                        void unpinKitchenMessage(message.chat.id, message.message_id);

                        if (message.text) {
                            const order = await prisma.order.findUnique({
                                where: { id: orderId },
                                select: {
                                    address: true,
                                    phone: true,
                                    delivery: true,
                                    deliveryZoneName: true,
                                },
                            });

                            await editKitchenOrderMessageWithKeyboard({
                                chatId: message.chat.id,
                                messageId: message.message_id,
                                text: message.text,
                                orderId,
                                status: "CANCELLED",
                                address: order?.address,
                                phone: order?.phone,
                                delivery:
                                    order?.delivery === "DELIVERY"
                                        ? "delivery"
                                        : "pickup",
                                zoneName: order?.deliveryZoneName,
                            });
                        }
                    }
                } catch (error) {
                    if (error instanceof UpdateOrderStatusError) {
                        await replyToCallback(callbackId, error.message);
                    } else {
                        await replyToCallback(callbackId, "Ошибка отмены заказа");
                    }
                }
                return NextResponse.json({ ok: true }, { status: 200 });
            }

            // Изменение рабочего статуса заказа
            if (action === "STATUS" && status) {
                try {
                    debugLog("[TELEGRAM WEBHOOK] Updating order:", orderId, "to", status);
                    const updated = await updateOrderStatus(orderId, status);
                    const label = orderStatusLabel(updated.status);

                    await replyToCallback(callbackId, `Заказ №${orderId}: ${label}`);

                    if (message?.message_id != null) {
                        // Автоматически открепляем выполненный или отмененный заказ
                        if (status === "DONE" || status === "CANCELLED") {
                            void unpinKitchenMessage(
                                message.chat.id,
                                message.message_id,
                            );
                        }

                        if (message.text) {
                            const order = await prisma.order.findUnique({
                                where: { id: orderId },
                                select: {
                                    address: true,
                                    phone: true,
                                    delivery: true,
                                    deliveryZoneName: true,
                                },
                            });

                            await editKitchenOrderMessageWithKeyboard({
                                chatId: message.chat.id,
                                messageId: message.message_id,
                                text: message.text,
                                orderId,
                                status: status as KitchenButtonStatus,
                                address: order?.address,
                                phone: order?.phone,
                                delivery:
                                    order?.delivery === "DELIVERY"
                                        ? "delivery"
                                        : "pickup",
                                zoneName: order?.deliveryZoneName,
                            });
                        }
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
            }
        } catch {
            await replyToCallback(callbackId, "Ошибка обработки");
            return NextResponse.json({ ok: true }, { status: 200 });
        }
    }

    // ─── 2. Обработка текстовых команд чата (message) ─────────────────────────
    const incomingMessage = update.message;
    if (incomingMessage?.chat?.id != null && incomingMessage.text) {
        const chatId = incomingMessage.chat.id;

        if (!isAuthorizedKitchenChat(chatId)) {
            return NextResponse.json({ ok: true }, { status: 200 });
        }

        const rawText = incomingMessage.text.trim();
        const text = rawText.replace(/@\w+/gi, "").trim();

        if (text === "/today" || text === "/stats") {
            await handleTodayCommand(chatId);
            return NextResponse.json({ ok: true }, { status: 200 });
        }

        if (text === "/active") {
            await handleActiveCommand(chatId);
            return NextResponse.json({ ok: true }, { status: 200 });
        }

        const orderMatch = text.match(/^(?:\/order(?:_|\s+)|#)(\d+)$/i);
        if (orderMatch) {
            const orderId = Number(orderMatch[1]);
            await handleOrderCommand(chatId, orderId);
            return NextResponse.json({ ok: true }, { status: 200 });
        }

        if (text === "/order") {
            await sendKitchenTextMessage(
                chatId,
                "ℹ️ Укажите номер заказа, например: <code>/order 42</code>",
            );
            return NextResponse.json({ ok: true }, { status: 200 });
        }

        if (text === "/help" || text === "/start") {
            await handleHelpCommand(chatId);
            return NextResponse.json({ ok: true }, { status: 200 });
        }
    }

    return NextResponse.json({ ok: true }, { status: 200 });
}
