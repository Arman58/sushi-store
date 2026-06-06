import type { ChipProps } from "@mui/material/Chip";
import type { OrderStatus } from "@prisma/client";

export type OrderStatusColor = NonNullable<ChipProps["color"]>;

/** Единый маппинг статусов для админки, клиента и Telegram. */
export const ORDER_STATUS_UI: Record<
    OrderStatus,
    { label: string; color: OrderStatusColor }
> = {
    NEW: { label: "Заказ принят", color: "info" },
    COOKING: { label: "Готовится", color: "warning" },
    DELIVERING: { label: "В пути", color: "secondary" },
    DONE: { label: "Доставлен", color: "success" },
    CANCELLED: { label: "Отменён", color: "error" },
};

export const ORDER_STATUSES = Object.keys(ORDER_STATUS_UI) as OrderStatus[];

export const TRACKING_STEP_STATUSES = [
    "NEW",
    "COOKING",
    "DELIVERING",
    "DONE",
] as const satisfies readonly OrderStatus[];

export const ETA_PRESET_MINUTES = [15, 30, 45, 60] as const;

export const STORE_TIMEZONE = "Asia/Yerevan";

export function orderStatusLabel(status: OrderStatus): string {
    return ORDER_STATUS_UI[status].label;
}

export function orderStatusChipColor(status: OrderStatus): OrderStatusColor {
    return ORDER_STATUS_UI[status].color;
}

export function isOrderStatus(value: string): value is OrderStatus {
    return (ORDER_STATUSES as readonly string[]).includes(value);
}

export function trackingActiveStep(status: OrderStatus): number {
    switch (status) {
        case "NEW":
            return 0;
        case "COOKING":
            return 1;
        case "DELIVERING":
            return 2;
        case "DONE":
            return 3;
        case "CANCELLED":
            return -1;
        default: {
            const _exhaustive: never = status;
            return _exhaustive;
        }
    }
}

export function computeEstimatedDeliveryAt(minutes: number): Date {
    return new Date(Date.now() + minutes * 60 * 1000);
}

export function formatEstimatedDeliveryTime(date: Date): string {
    return new Intl.DateTimeFormat("ru-RU", {
        hour: "2-digit",
        minute: "2-digit",
        timeZone: STORE_TIMEZONE,
    }).format(date);
}
