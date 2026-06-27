import { OrderStatus, PaymentMethod } from "@prisma/client";

import { ORDER_STATUS_UI, STORE_TIMEZONE } from "@/lib/order-status";

const YEREVAN_OFFSET = "+04:00";

export type AdminAnalyticsSummary = {
    revenueToday: number;
    ordersToday: number;
    averageCheck: number;
    activeOrders: number;
};

export type AdminAnalyticsDailyPoint = {
    date: string;
    label: string;
    revenue: number;
    orders: number;
};

export type AdminAnalyticsTopProduct = {
    name: string;
    quantity: number;
    revenue: number;
};

export type AdminAnalyticsStatusSlice = {
    status: OrderStatus;
    label: string;
    count: number;
};

export type AdminAnalyticsZoneSlice = {
    name: string;
    orders: number;
    revenue: number;
};

export type AdminAnalyticsHourSlice = {
    hour: number;
    orders: number;
    revenue: number;
};

export type AdminAnalyticsPaymentSlice = {
    method: PaymentMethod;
    label: string;
    orders: number;
    revenue: number;
};

export type AdminAnalyticsExportOrder = {
    id: number;
    date: string;
    totalPrice: number;
    zone: string;
    status: OrderStatus;
    statusLabel: string;
};

export type AdminAnalyticsResponse = {
    periodDays: number;
    summary: AdminAnalyticsSummary;
    daily: AdminAnalyticsDailyPoint[];
    topProducts: AdminAnalyticsTopProduct[];
    statusDistribution: AdminAnalyticsStatusSlice[];
    salesByZone: AdminAnalyticsZoneSlice[];
    salesByHour: AdminAnalyticsHourSlice[];
    paymentMethods: AdminAnalyticsPaymentSlice[];
    promoImpact: number;
    exportOrders: AdminAnalyticsExportOrder[];
};

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
    CASH: "Наличные",
    CARD: "Картой",
};

export function toDayKey(date: Date, timeZone = STORE_TIMEZONE): string {
    return new Intl.DateTimeFormat("en-CA", {
        timeZone,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    }).format(date);
}

export function formatDayLabel(dayKey: string): string {
    const [, month, day] = dayKey.split("-");
    return `${day}.${month}`;
}

export function buildDayRange(days: number, timeZone = STORE_TIMEZONE): string[] {
    const formatter = new Intl.DateTimeFormat("en-CA", {
        timeZone,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    });
    const result: string[] = [];
    const now = new Date();

    for (let i = days - 1; i >= 0; i--) {
        const d = new Date(now.getTime() - i * 86_400_000);
        result.push(formatter.format(d));
    }

    return result;
}

export function dayKeyToStartUtc(dayKey: string): Date {
    return new Date(`${dayKey}T00:00:00${YEREVAN_OFFSET}`);
}

export function dayKeyToEndUtc(dayKey: string): Date {
    return new Date(`${dayKey}T23:59:59.999${YEREVAN_OFFSET}`);
}

export function emptyStatusDistribution(): AdminAnalyticsStatusSlice[] {
    return (Object.keys(ORDER_STATUS_UI) as OrderStatus[]).map((status) => ({
        status,
        label: ORDER_STATUS_UI[status].label,
        count: 0,
    }));
}

export function formatAmd(value: number): string {
    return `${value.toLocaleString("ru-RU")} ֏`;
}

export function getHourInStoreTimezone(
    date: Date,
    timeZone = STORE_TIMEZONE,
): number {
    const parts = new Intl.DateTimeFormat("en-US", {
        timeZone,
        hour: "numeric",
        hour12: false,
    }).formatToParts(date);
    const raw = Number(parts.find((part) => part.type === "hour")?.value ?? 0);
    // Intl may return 24 for midnight in some runtimes — normalize to 0–23.
    if (raw === 24) return 0;
    return Math.min(23, Math.max(0, raw));
}

export function formatExportOrderDate(
    date: Date,
    timeZone = STORE_TIMEZONE,
): string {
    return new Intl.DateTimeFormat("ru-RU", {
        timeZone,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
    }).format(date);
}

export function buildEmptyAdminAnalyticsResponse(
    periodDays: number,
): AdminAnalyticsResponse {
    const dayKeys = buildDayRange(periodDays);

    return {
        periodDays,
        summary: {
            revenueToday: 0,
            ordersToday: 0,
            averageCheck: 0,
            activeOrders: 0,
        },
        daily: dayKeys.map((date) => ({
            date,
            label: formatDayLabel(date),
            revenue: 0,
            orders: 0,
        })),
        topProducts: [],
        statusDistribution: emptyStatusDistribution(),
        salesByZone: [],
        salesByHour: Array.from({ length: 24 }, (_, hour) => ({
            hour,
            orders: 0,
            revenue: 0,
        })),
        paymentMethods: (Object.keys(PAYMENT_METHOD_LABELS) as PaymentMethod[]).map(
            (method) => ({
                method,
                label: PAYMENT_METHOD_LABELS[method],
                orders: 0,
                revenue: 0,
            }),
        ),
        promoImpact: 0,
        exportOrders: [],
    };
}

export function truncateChartLabel(label: string, maxLength = 14): string {
    if (label.length <= maxLength) return label;
    return `${label.slice(0, maxLength - 1)}…`;
}

export function downloadOrdersCsv(
    orders: AdminAnalyticsExportOrder[],
    periodDays: number,
): void {
    const header = ["ID", "Дата", "Сумма", "Зона", "Статус"];
    const rows = orders.map((order) => [
        order.id,
        order.date,
        order.totalPrice,
        order.zone,
        order.statusLabel,
    ]);
    const escape = (value: string | number) =>
        `"${String(value).replace(/"/g, '""')}"`;
    const csv = [header, ...rows]
        .map((row) => row.map(escape).join(","))
        .join("\n");
    const blob = new Blob([`\uFEFF${csv}`], {
        type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `orders-report-${periodDays}d.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
}
