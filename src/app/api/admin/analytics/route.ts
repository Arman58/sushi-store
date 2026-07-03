import { DeliveryType, OrderStatus, PaymentMethod } from "@prisma/client";
import { NextResponse } from "next/server";

import {
    type AdminAnalyticsExportOrder,
    type AdminAnalyticsHourSlice,
    type AdminAnalyticsPaymentSlice,
    type AdminAnalyticsResponse,
    type AdminAnalyticsZoneSlice,
    buildDayRange,
    dayKeyToStartUtc,
    emptyStatusDistribution,
    formatDayLabel,
    formatExportOrderDate,
    getHourInStoreTimezone,
    PAYMENT_METHOD_LABELS,
    toDayKey,
} from "@/lib/admin-analytics";
import { ORDER_STATUS_UI } from "@/lib/order-status";
import { prisma } from "@/lib/prisma";
import { verifyAdmin } from "@/lib/verify-admin";

const ACTIVE_STATUSES: OrderStatus[] = [
    OrderStatus.NEW,
    OrderStatus.COOKING,
    OrderStatus.DELIVERING,
];

function parsePeriodDays(searchParams: URLSearchParams): number {
    const raw = Number(searchParams.get("days") ?? "14");
    if (raw === 7) return 7;
    if (raw === 30) return 30;
    return 14;
}

function getZoneLabel(order: {
    delivery: DeliveryType;
    deliveryZoneName: string | null;
}): string {
    if (order.delivery === DeliveryType.PICKUP || !order.deliveryZoneName?.trim()) {
        return "Самовывоз";
    }
    return order.deliveryZoneName.trim();
}

function emptyHourSlices(): AdminAnalyticsHourSlice[] {
    return Array.from({ length: 24 }, (_, hour) => ({
        hour,
        orders: 0,
        revenue: 0,
    }));
}

function emptyPaymentSlices(): AdminAnalyticsPaymentSlice[] {
    return (Object.keys(PAYMENT_METHOD_LABELS) as PaymentMethod[]).map(
        (method) => ({
            method,
            label: PAYMENT_METHOD_LABELS[method],
            orders: 0,
            revenue: 0,
        }),
    );
}

function safeNumber(value: unknown): number {
    const n = Number(value);
    return Number.isFinite(n) ? n : 0;
}

export async function GET(request: Request) {
    try {
        const auth = await verifyAdmin(request);
        if (!auth.ok) {
            return auth.response;
        }

        const periodDays = parsePeriodDays(new URL(request.url).searchParams);
        console.log("[ANALYTICS] Fetching data for days:", periodDays);

        const dayKeys = buildDayRange(periodDays);
        const rangeStart = dayKeyToStartUtc(dayKeys[0]!);
        const todayKey = toDayKey(new Date());

        const [orders, orderItems, activeOrders] = await Promise.all([
            prisma.order.findMany({
                where: { createdAt: { gte: rangeStart } },
                select: {
                    id: true,
                    createdAt: true,
                    status: true,
                    totalPrice: true,
                    payment: true,
                    delivery: true,
                    deliveryZoneName: true,
                    discountAmount: true,
                },
                orderBy: { createdAt: "desc" },
            }),
            prisma.orderItem.findMany({
                where: {
                    order: {
                        createdAt: { gte: rangeStart },
                        status: OrderStatus.DONE,
                    },
                },
                select: {
                    name: true,
                    price: true,
                    quantity: true,
                },
            }),
            prisma.order.count({
                where: { status: { in: ACTIVE_STATUSES } },
            }),
        ]);

        const dailyMap = new Map(
            dayKeys.map((date) => [
                date,
                { date, label: formatDayLabel(date), revenue: 0, orders: 0 },
            ]),
        );

        const statusMap = new Map<OrderStatus, number>(
            emptyStatusDistribution().map(({ status }) => [status, 0]),
        );

        const zoneMap = new Map<string, AdminAnalyticsZoneSlice>();
        const hourMap = new Map<number, AdminAnalyticsHourSlice>(
            emptyHourSlices().map((slice) => [slice.hour, { ...slice }]),
        );
        const paymentMap = new Map<PaymentMethod, AdminAnalyticsPaymentSlice>(
            emptyPaymentSlices().map((slice) => [slice.method, { ...slice }]),
        );

        let revenueToday = 0;
        let ordersToday = 0;
        let doneOrdersToday = 0;
        let promoImpact = 0;

        for (const order of orders) {
            const day = toDayKey(order.createdAt);
            const totalPrice = safeNumber(order.totalPrice);
            const discountAmount = safeNumber(order.discountAmount);
            const isDone = order.status === OrderStatus.DONE;

            const bucket = dailyMap.get(day);
            if (bucket) {
                bucket.orders += 1;
                if (isDone) {
                    bucket.revenue += totalPrice;
                }
            }

            statusMap.set(
                order.status,
                (statusMap.get(order.status) ?? 0) + 1,
            );
            promoImpact += discountAmount;

            if (order.status !== OrderStatus.CANCELLED) {
                const zoneName = getZoneLabel(order);
                const zoneSlice = zoneMap.get(zoneName) ?? {
                    name: zoneName,
                    orders: 0,
                    revenue: 0,
                };
                zoneSlice.orders += 1;
                if (isDone) {
                    zoneSlice.revenue += totalPrice;
                }
                zoneMap.set(zoneName, zoneSlice);

                const hour = getHourInStoreTimezone(order.createdAt);
                const hourSlice = hourMap.get(hour);
                if (hourSlice) {
                    hourSlice.orders += 1;
                    if (isDone) {
                        hourSlice.revenue += totalPrice;
                    }
                }

                const paymentSlice = paymentMap.get(order.payment);
                if (paymentSlice) {
                    paymentSlice.orders += 1;
                    if (isDone) {
                        paymentSlice.revenue += totalPrice;
                    }
                }
            }

            if (day === todayKey) {
                ordersToday += 1;
                if (isDone) {
                    revenueToday += totalPrice;
                    doneOrdersToday += 1;
                }
            }
        }

        const productMap = new Map<
            string,
            { name: string; quantity: number; revenue: number }
        >();

        for (const item of orderItems) {
            const key = item.name.trim() || "Без названия";
            const lineRevenue =
                safeNumber(item.price) * safeNumber(item.quantity);
            const existing = productMap.get(key);
            if (existing) {
                existing.quantity += safeNumber(item.quantity);
                existing.revenue += lineRevenue;
            } else {
                productMap.set(key, {
                    name: key,
                    quantity: safeNumber(item.quantity),
                    revenue: lineRevenue,
                });
            }
        }

        const topProducts = [...productMap.values()]
            .sort((a, b) => b.revenue - a.revenue)
            .slice(0, 5);

        const salesByZone = [...zoneMap.values()].sort(
            (a, b) => b.revenue - a.revenue,
        );

        const exportOrders: AdminAnalyticsExportOrder[] = orders.map((order) => ({
            id: order.id,
            date: formatExportOrderDate(order.createdAt),
            totalPrice: safeNumber(order.totalPrice),
            zone: getZoneLabel(order),
            status: order.status,
            statusLabel: ORDER_STATUS_UI[order.status].label,
        }));

        const payload: AdminAnalyticsResponse = {
            periodDays,
            summary: {
                revenueToday,
                ordersToday,
                averageCheck:
                    doneOrdersToday > 0
                        ? Math.round(revenueToday / doneOrdersToday)
                        : 0,
                activeOrders,
            },
            daily: dayKeys.map((date) => dailyMap.get(date)!),
            topProducts,
            statusDistribution: (Object.keys(ORDER_STATUS_UI) as OrderStatus[]).map(
                (status) => ({
                    status,
                    label: ORDER_STATUS_UI[status].label,
                    count: statusMap.get(status) ?? 0,
                }),
            ),
            salesByZone,
            salesByHour: [...hourMap.values()].sort((a, b) => a.hour - b.hour),
            paymentMethods: [...paymentMap.values()],
            promoImpact,
            exportOrders,
        };

        return NextResponse.json(payload);
    } catch (e) {
        console.error("[ANALYTICS ERROR]", e);
        const message = e instanceof Error ? e.message : "Failed to fetch analytics";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
