import { NextResponse } from "next/server";

import { cancelOrderSchema } from "@/lib/api-schemas";
import { updateOrderStatus } from "@/lib/order-service";
import { canAccessOrderStatus } from "@/lib/order-status-access";
import { parseJsonBody } from "@/lib/parse-json-body";
import { prisma } from "@/lib/prisma";
import {
    checkRateLimit,
    rateLimitExceededJsonResponse,
} from "@/lib/rate-limit";
import { notifyKitchenOrderCancelled } from "@/lib/telegram-kitchen-notify";
import { API_ERROR_CODES } from "@/shared/lib/api-error";

export const dynamic = "force-dynamic";

/** Допустимое окно быстрой отмены клиентом: 5 минут с момента создания. */
const CANCELLATION_WINDOW_MS = 5 * 60 * 1000;

export async function POST(request: Request) {
    const rl = await checkRateLimit(request, "order");
    if (!rl.allowed) return rateLimitExceededJsonResponse();

    const parsedBody = await parseJsonBody(request, cancelOrderSchema);
    if (!parsedBody.ok) return parsedBody.response;

    const { orderId, accessToken, reason } = parsedBody.data;

    const order = await prisma.order.findUnique({
        where: { id: orderId },
        select: {
            id: true,
            status: true,
            createdAt: true,
            userId: true,
            accessToken: true,
        },
    });

    if (!order) {
        return NextResponse.json(
            { error: "Order not found", code: API_ERROR_CODES.ORDER_NOT_FOUND },
            { status: 404 },
        );
    }

    // Проверка прав доступа: либо совпадает accessToken из тела/URL, либо через cookie/сессию
    const tokenMatch = accessToken && accessToken === order.accessToken;
    const authorized =
        tokenMatch || (await canAccessOrderStatus(order));

    if (!authorized) {
        return NextResponse.json(
            { error: "Unauthorized" },
            { status: 401 },
        );
    }

    // Идемпотентность
    if (order.status === "CANCELLED") {
        return NextResponse.json({ success: true, status: "CANCELLED" });
    }

    // Отменить можно только пока заказ принят кухней (NEW) или на подтверждении (PENDING_APPROVAL)
    if (order.status !== "NEW" && order.status !== "PENDING_APPROVAL") {
        return NextResponse.json(
            {
                error: "Order is already in progress and cannot be cancelled online",
                code: "ORDER_ALREADY_IN_PROGRESS",
            },
            { status: 409 },
        );
    }

    // Проверка тайм-аута (5 минут)
    const elapsedMs = Date.now() - new Date(order.createdAt).getTime();
    if (elapsedMs > CANCELLATION_WINDOW_MS) {
        return NextResponse.json(
            {
                error: "Cancellation window has expired. Please call the restaurant.",
                code: "CANCELLATION_WINDOW_EXPIRED",
            },
            { status: 409 },
        );
    }

    try {
        const updated = await updateOrderStatus(order.id, "CANCELLED");

        // Оповещаем кухню в Telegram
        void notifyKitchenOrderCancelled(order.id, reason).catch((err) =>
            console.error("[telegram] cancel notify error:", err),
        );

        return NextResponse.json({
            success: true,
            id: updated.id,
            status: updated.status,
        });
    } catch (error) {
        console.error("[cancel-order] Error cancelling order:", error);
        return NextResponse.json(
            {
                error: "Failed to cancel order",
                code: API_ERROR_CODES.INTERNAL_SERVER_ERROR,
            },
            { status: 500 },
        );
    }
}
