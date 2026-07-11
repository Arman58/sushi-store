import { type OrderItem, type Prisma } from "@prisma/client";
import { NextResponse } from "next/server";

import { canAccessOrderStatus } from "@/lib/order-status-access";
import { prisma } from "@/lib/prisma";
import { checkRateLimit, rateLimitExceededJsonResponse } from "@/lib/rate-limit";
import { API_ERROR_CODES } from "@/shared/lib/api-error";

export const dynamic = "force-dynamic";

type OrderWithItems = Prisma.OrderGetPayload<{ include: { items: true } }>;

function buildOrderStatusPayload(order: OrderWithItems) {
    return {
        id: order.id,
        status: order.status,
        name: order.name,
        phone: order.phone,
        delivery: order.delivery,
        payment: order.payment,
        changeFrom: order.changeFrom,
        scheduledFor: order.scheduledFor?.toISOString() ?? null,
        totalPrice: order.totalPrice,
        createdAt: order.createdAt,
        estimatedDeliveryAt: order.estimatedDeliveryAt,
        address: order.address,
        deliveryZoneName: order.deliveryZoneName,
        deliveryPrice: order.deliveryPrice,
        items: order.items.map((item: OrderItem) => ({
            id: item.id,
            productId: item.productId,
            name: item.name,
            quantity: item.quantity,
            price: item.price,
            selectedModifiers: item.selectedModifiers,
        })),
    };
}

/**
 * Server-Sent Events (SSE) эндпоинт для отслеживания статуса заказа.
 * Вместо того, чтобы клиент опрашивал БД каждую секунду, мы открываем
 * соединение и пушим туда изменения по таймеру (или через pubsub).
 */
export async function GET(request: Request) {
    const rl = await checkRateLimit(request, "orderStatus");
    if (!rl.allowed) return rateLimitExceededJsonResponse();

    const url = new URL(request.url);
    const idParam = url.searchParams.get("id");

    const id = Number(idParam);
    if (!id || Number.isNaN(id)) {
        return NextResponse.json(
            { error: "Invalid order ID", code: API_ERROR_CODES.ORDER_NOT_FOUND },
            { status: 400 }
        );
    }

    // Первоначальная проверка прав доступа
    const initialOrder = await prisma.order.findUnique({
        where: { id },
        include: { items: true },
    });

    if (!initialOrder) {
        return NextResponse.json(
            { error: "Order not found", code: API_ERROR_CODES.ORDER_NOT_FOUND },
            { status: 404 }
        );
    }

    const allowed = await canAccessOrderStatus(initialOrder);
    if (!allowed) {
        return NextResponse.json(
            { error: "Order not found", code: API_ERROR_CODES.ORDER_NOT_FOUND },
            { status: 403 }
        );
    }

    // Создаем ReadableStream для SSE
    const stream = new ReadableStream({
        async start(controller) {
            let isActive = true;
            let lastStatus = "";

            const pushUpdate = (order: OrderWithItems) => {
                if (!isActive) return;
                const payload = buildOrderStatusPayload(order);
                const data = JSON.stringify(payload);
                controller.enqueue(`data: ${data}\n\n`);
                lastStatus = order.status;
            };

            // Отправляем начальное состояние сразу же
            pushUpdate(initialOrder);

            // Если заказ уже закрыт, завершаем поток
            if (initialOrder.status === "DONE" || initialOrder.status === "CANCELLED") {
                controller.close();
                isActive = false;
                return;
            }

            // Polling interval (каждые 5 секунд проверяем БД)
            // Это эффективнее чем HTTP-polling, так как нет накладных расходов
            // на SSL-handshake и TLS, а Vercel держит соединение.
            const interval = setInterval(async () => {
                if (!isActive) {
                    clearInterval(interval);
                    return;
                }

                try {
                    const order = await prisma.order.findUnique({
                        where: { id },
                        include: { items: true },
                    });

                    if (!order) {
                        // Заказ удален? Закрываем поток.
                        clearInterval(interval);
                        controller.close();
                        isActive = false;
                        return;
                    }

                    // Если статус изменился, пушим
                    if (order.status !== lastStatus) {
                        pushUpdate(order);
                        if (order.status === "DONE" || order.status === "CANCELLED") {
                            clearInterval(interval);
                            controller.close();
                            isActive = false;
                        }
                    }
                } catch (error) {
                    // Игнорируем ошибки сети/БД в фоне, попробуем еще раз на следующем тике
                    console.error("[SSE Polling Error]", error);
                }
            }, 5000);

            // Очистка при разрыве соединения
            request.signal.addEventListener("abort", () => {
                isActive = false;
                clearInterval(interval);
            });
        },
    });

    return new NextResponse(stream, {
        headers: {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache, no-transform",
            Connection: "keep-alive",
            "X-Accel-Buffering": "no", // для Nginx
        },
    });
}
