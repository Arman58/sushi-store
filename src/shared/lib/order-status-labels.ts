import type { OrderStatus } from "@prisma/client";

export const ORDER_STATUS_KEYS: Record<OrderStatus, string> = {
    PENDING_APPROVAL: "pendingApproval",
    NEW: "new",
    COOKING: "cooking",
    DELIVERING: "delivering",
    DONE: "done",
    CANCELLED: "cancelled",
};

export type OrderStatusTranslator = (
    key: string,
    values?: Record<string, string | number>,
) => string;

export function translateOrderStatus(
    status: OrderStatus,
    t: OrderStatusTranslator,
): string {
    return t(ORDER_STATUS_KEYS[status]);
}
