import type { OrderStatus } from "@prisma/client";

import { prisma } from "@/lib/prisma";

/** Все статусы из Prisma enum OrderStatus */
export const ORDER_STATUSES = [
    "NEW",
    "IN_WORK",
    "DELIVERING",
    "DONE",
    "CANCELLED",
] as const satisfies readonly OrderStatus[];

/** Статусы, доступные повару через inline-кнопки Telegram */
export const KITCHEN_BUTTON_STATUSES = [
    "IN_WORK",
    "DELIVERING",
    "DONE",
    "CANCELLED",
] as const satisfies readonly OrderStatus[];

export type KitchenButtonStatus = (typeof KITCHEN_BUTTON_STATUSES)[number];

export function isOrderStatus(value: string): value is OrderStatus {
    return (ORDER_STATUSES as readonly string[]).includes(value);
}

export function isKitchenButtonStatus(value: string): value is KitchenButtonStatus {
    return (KITCHEN_BUTTON_STATUSES as readonly string[]).includes(value);
}

/**
 * Русские названия статусов — единый источник для админки (MUI Chip) и Telegram.
 * Совпадает с mapStatusLabel в админ-панели заказов.
 */
export function orderStatusLabel(status: OrderStatus): string {
    switch (status) {
        case "NEW":
            return "Новый";
        case "IN_WORK":
            return "Готовится";
        case "DELIVERING":
            return "В работе";
        case "DONE":
            return "Доставлен";
        case "CANCELLED":
            return "Отменён";
        default: {
            const _exhaustive: never = status;
            return _exhaustive;
        }
    }
}

const TELEGRAM_BUTTON_EMOJI: Record<KitchenButtonStatus, string> = {
    IN_WORK: "🟡",
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
    | "CANCELLED_LOCKED";

export class UpdateOrderStatusError extends Error {
    readonly code: UpdateOrderStatusErrorCode;

    constructor(message: string, code: UpdateOrderStatusErrorCode) {
        super(message);
        this.name = "UpdateOrderStatusError";
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
        select: { id: true, status: true },
    });

    if (!existing) {
        throw new UpdateOrderStatusError("Order not found", "NOT_FOUND");
    }

    if (existing.status === "CANCELLED" && newStatus !== "CANCELLED") {
        throw new UpdateOrderStatusError("Order is cancelled", "CANCELLED_LOCKED");
    }

    return prisma.order.update({
        where: { id: orderId },
        data: { status: newStatus },
        select: { id: true, status: true },
    });
}
