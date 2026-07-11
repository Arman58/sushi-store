import type { OrderStatus } from "@prisma/client";

import {
    isOrderStatus,
    ORDER_STATUSES,
    orderStatusLabel,
} from "@/lib/order-status";
import { prisma } from "@/lib/prisma";

export { isOrderStatus, ORDER_STATUSES,orderStatusLabel };

/** Статусы, доступные повару через inline-кнопки Telegram */
export const KITCHEN_BUTTON_STATUSES = [
    "COOKING",
    "DELIVERING",
    "DONE",
    "CANCELLED",
] as const satisfies readonly OrderStatus[];

export type KitchenButtonStatus = (typeof KITCHEN_BUTTON_STATUSES)[number];

export function isKitchenButtonStatus(value: string): value is KitchenButtonStatus {
    return (KITCHEN_BUTTON_STATUSES as readonly string[]).includes(value);
}

const TELEGRAM_BUTTON_EMOJI: Record<KitchenButtonStatus, string> = {
    COOKING: "🔥",
    DELIVERING: "🚗",
    DONE: "✅",
    CANCELLED: "❌",
};

export function orderStatusTelegramButtonLabel(status: KitchenButtonStatus): string {
    return `${TELEGRAM_BUTTON_EMOJI[status]} ${orderStatusLabel(status)}`;
}

export type UpdateOrderStatusErrorCode =
    | "INVALID_ORDER_ID"
    | "INVALID_STATUS"
    | "NOT_FOUND"
    | "CANCELLED_LOCKED"
    | "INVALID_TRANSITION";

/**
 * Конечный автомат статусов. Инварианты:
 * - CANCELLED терминален (существующая проверка CANCELLED_LOCKED);
 * - из DONE нельзя в CANCELLED (заказ доставлен, деньги получены),
 *   но можно откатить mistap ✅ обратно в COOKING/DELIVERING;
 * - соседние правки NEW/COOKING/DELIVERING разрешены (реальность кухни).
 */
const ALLOWED_STATUS_TRANSITIONS: Record<OrderStatus, readonly OrderStatus[]> = {
    PENDING_APPROVAL: ["NEW", "CANCELLED"],
    NEW: ["COOKING", "DELIVERING", "DONE", "CANCELLED"],
    COOKING: ["NEW", "DELIVERING", "DONE", "CANCELLED"],
    DELIVERING: ["COOKING", "DONE", "CANCELLED"],
    DONE: ["COOKING", "DELIVERING"],
    CANCELLED: [],
};

export class UpdateOrderStatusError extends Error {
    readonly code: UpdateOrderStatusErrorCode;

    constructor(message: string, code: UpdateOrderStatusErrorCode) {
        super(message);
        this.name = "UpdateOrderStatusError";
        this.code = code;
    }
}

export type UpdateOrderEtaErrorCode =
    | "INVALID_ORDER_ID"
    | "INVALID_ETA"
    | "NOT_FOUND";

export class UpdateOrderEtaError extends Error {
    readonly code: UpdateOrderEtaErrorCode;

    constructor(message: string, code: UpdateOrderEtaErrorCode) {
        super(message);
        this.name = "UpdateOrderEtaError";
        this.code = code;
    }
}

export async function updateOrderStatus(
    orderId: number,
    newStatus: OrderStatus,
): Promise<{ id: number; status: OrderStatus }> {
    if (!Number.isFinite(orderId) || orderId <= 0) {
        throw new UpdateOrderStatusError("Invalid order id", "INVALID_ORDER_ID");
    }

    if (!isOrderStatus(newStatus)) {
        throw new UpdateOrderStatusError("Invalid status", "INVALID_STATUS");
    }

    const existing = await prisma.order.findUnique({
        where: { id: orderId },
        select: { id: true, status: true, promoCodeId: true },
    });

    if (!existing) {
        throw new UpdateOrderStatusError("Order not found", "NOT_FOUND");
    }

    // Идемпотентность: повторная установка того же статуса - no-op.
    if (existing.status === newStatus) {
        return existing;
    }

    if (existing.status === "CANCELLED") {
        throw new UpdateOrderStatusError("Order is cancelled", "CANCELLED_LOCKED");
    }

    if (!ALLOWED_STATUS_TRANSITIONS[existing.status].includes(newStatus)) {
        throw new UpdateOrderStatusError(
            `Transition ${existing.status} → ${newStatus} is not allowed`,
            "INVALID_TRANSITION",
        );
    }

    const updated = await prisma.order.update({
        where: { id: orderId },
        data: { status: newStatus },
        select: { id: true, status: true },
    });

    // existing.status !== "CANCELLED" гарантирован guard-ом выше (CANCELLED_LOCKED),
    // TS уже сузил тип — повторная проверка была бы ошибкой компиляции.
    if (newStatus === "CANCELLED" && existing.promoCodeId != null) {
        await prisma.promoCode.update({
            where: { id: existing.promoCodeId },
            data: { timesUsed: { decrement: 1 } },
        });
    }

    if (updated.status !== existing.status) {
        const { notifyOrderStatusPush } = await import("@/lib/push-notifications");
        void notifyOrderStatusPush(updated.id, updated.status).catch((error) => {
            console.error("[PUSH ERROR]", error);
        });
    }

    return updated;
}

export async function updateOrderEstimatedDeliveryAt(
    orderId: number,
    estimatedDeliveryAt: Date,
): Promise<{ id: number; estimatedDeliveryAt: Date }> {
    if (!Number.isFinite(orderId) || orderId <= 0) {
        throw new UpdateOrderEtaError("Invalid order id", "INVALID_ORDER_ID");
    }

    if (!(estimatedDeliveryAt instanceof Date) || Number.isNaN(estimatedDeliveryAt.getTime())) {
        throw new UpdateOrderEtaError("Invalid ETA", "INVALID_ETA");
    }

    const existing = await prisma.order.findUnique({
        where: { id: orderId },
        select: { id: true },
    });

    if (!existing) {
        throw new UpdateOrderEtaError("Order not found", "NOT_FOUND");
    }

    const updated = await prisma.order.update({
        where: { id: orderId },
        data: { estimatedDeliveryAt },
        select: { id: true, estimatedDeliveryAt: true },
    });

    if (!updated.estimatedDeliveryAt) {
        throw new UpdateOrderEtaError("Failed to save ETA", "INVALID_ETA");
    }

    return { id: updated.id, estimatedDeliveryAt: updated.estimatedDeliveryAt };
}
