import { DeliveryType, OrderStatus, PaymentMethod } from "@prisma/client";
import { NextResponse } from "next/server";
import { getTranslations } from "next-intl/server";

import {
    type AdminAnalyticsExportOrder,
    type AdminAnalyticsHourSlice,
    type AdminAnalyticsPaymentSlice,
    type AdminAnalyticsResponse,
    type AdminAnalyticsZoneSlice,
    buildDayRange,
    dayKeyToEndUtc,
    dayKeyToStartUtc,
    emptyStatusDistribution,
    formatDayLabel,
    formatExportOrderDate,
    toDayKey,
} from "@/lib/admin-analytics";
import { resolveAdminLocale } from "@/lib/admin-locale";
import { debugLog } from "@/lib/debug-log";
import { prisma } from "@/lib/prisma";
import { verifyAdmin } from "@/lib/verify-admin";

const ACTIVE_STATUSES: OrderStatus[] = [
    OrderStatus.NEW,
    OrderStatus.COOKING,
    OrderStatus.DELIVERING,
];

/** Cap CSV export rows to avoid OOM on large periods. */
const EXPORT_ORDERS_LIMIT = 500;

function parsePeriodDays(searchParams: URLSearchParams): number {
    const raw = Number(searchParams.get("days") ?? "14");
    if (raw === 7) return 7;
    if (raw === 30) return 30;
    return 14;
}

function safeNumber(value: unknown): number {
    const n = Number(value);
    return Number.isFinite(n) ? n : 0;
}

function emptyPaymentSlices(
    paymentLabels: Record<PaymentMethod, string>,
): AdminAnalyticsPaymentSlice[] {
    return (Object.keys(paymentLabels) as PaymentMethod[]).map((method) => ({
        method,
        label: paymentLabels[method],
        orders: 0,
        revenue: 0,
    }));
}

function emptyHourSlices(): AdminAnalyticsHourSlice[] {
    return Array.from({ length: 24 }, (_, hour) => ({
        hour,
        orders: 0,
        revenue: 0,
    }));
}

type DailyRow = { day: string; orders: bigint | number; revenue: bigint | number };
type StatusRow = { status: OrderStatus; count: bigint | number };
type ZoneRow = { zone: string; orders: bigint | number; revenue: bigint | number };
type HourRow = { hour: number; orders: bigint | number; revenue: bigint | number };
type PaymentRow = {
    payment: PaymentMethod;
    orders: bigint | number;
    revenue: bigint | number;
};
type PromoRow = { promo: bigint | number };
type TodayRow = {
    orders_today: bigint | number;
    done_today: bigint | number;
    revenue_today: bigint | number;
};
type ProductRow = {
    name: string;
    quantity: bigint | number;
    revenue: bigint | number;
};

export async function GET(request: Request) {
    try {
        const auth = await verifyAdmin(request);
        if (!auth.ok) {
            return auth.response;
        }

        const locale = await resolveAdminLocale();
        const tCommon = await getTranslations({ locale, namespace: "admin.common" });
        const tDash = await getTranslations({ locale, namespace: "admin.dashboard" });
        const tOrder = await getTranslations({ locale, namespace: "order.status" });

        const pickupLabel = tDash("pickupZone");
        const untitledProduct = tDash("untitledProduct");

        const statusLabels: Record<OrderStatus, string> = {
            NEW: tOrder("new"),
            COOKING: tOrder("cooking"),
            DELIVERING: tOrder("delivering"),
            DONE: tOrder("done"),
            CANCELLED: tOrder("cancelled"),
        };

        const paymentLabels: Record<PaymentMethod, string> = {
            CASH: tCommon("cash"),
            CARD: tCommon("cardFull"),
        };

        const periodDays = parsePeriodDays(new URL(request.url).searchParams);
        debugLog("[ANALYTICS] Fetching data for days:", periodDays);

        const dayKeys = buildDayRange(periodDays);
        const rangeStart = dayKeyToStartUtc(dayKeys[0]!);
        const todayKey = toDayKey(new Date());
        const todayStart = dayKeyToStartUtc(todayKey);
        const todayEnd = dayKeyToEndUtc(todayKey);

        const [
            dailyRows,
            statusRows,
            zoneRows,
            hourRows,
            paymentRows,
            promoRows,
            todayRows,
            productRows,
            activeOrders,
            exportOrderRows,
        ] = await Promise.all([
            prisma.$queryRaw<DailyRow[]>`
                SELECT
                    to_char(
                        ("createdAt" AT TIME ZONE 'UTC') AT TIME ZONE 'Asia/Yerevan',
                        'YYYY-MM-DD'
                    ) AS day,
                    COUNT(*)::int AS orders,
                    COALESCE(
                        SUM(CASE WHEN status = 'DONE' THEN "totalPrice" ELSE 0 END),
                        0
                    )::int AS revenue
                FROM "Order"
                WHERE "createdAt" >= ${rangeStart}
                GROUP BY 1
            `,
            prisma.$queryRaw<StatusRow[]>`
                SELECT status, COUNT(*)::int AS count
                FROM "Order"
                WHERE "createdAt" >= ${rangeStart}
                GROUP BY status
            `,
            prisma.$queryRaw<ZoneRow[]>`
                SELECT
                    CASE
                        WHEN delivery = 'PICKUP'
                            OR "deliveryZoneName" IS NULL
                            OR BTRIM("deliveryZoneName") = ''
                        THEN ${pickupLabel}
                        ELSE BTRIM("deliveryZoneName")
                    END AS zone,
                    COUNT(*)::int AS orders,
                    COALESCE(
                        SUM(CASE WHEN status = 'DONE' THEN "totalPrice" ELSE 0 END),
                        0
                    )::int AS revenue
                FROM "Order"
                WHERE "createdAt" >= ${rangeStart}
                    AND status <> 'CANCELLED'
                GROUP BY 1
            `,
            prisma.$queryRaw<HourRow[]>`
                SELECT
                    EXTRACT(
                        HOUR FROM (("createdAt" AT TIME ZONE 'UTC') AT TIME ZONE 'Asia/Yerevan')
                    )::int AS hour,
                    COUNT(*)::int AS orders,
                    COALESCE(
                        SUM(CASE WHEN status = 'DONE' THEN "totalPrice" ELSE 0 END),
                        0
                    )::int AS revenue
                FROM "Order"
                WHERE "createdAt" >= ${rangeStart}
                    AND status <> 'CANCELLED'
                GROUP BY 1
            `,
            prisma.$queryRaw<PaymentRow[]>`
                SELECT
                    payment,
                    COUNT(*)::int AS orders,
                    COALESCE(
                        SUM(CASE WHEN status = 'DONE' THEN "totalPrice" ELSE 0 END),
                        0
                    )::int AS revenue
                FROM "Order"
                WHERE "createdAt" >= ${rangeStart}
                    AND status <> 'CANCELLED'
                GROUP BY payment
            `,
            prisma.$queryRaw<PromoRow[]>`
                SELECT COALESCE(SUM("discountAmount"), 0)::int AS promo
                FROM "Order"
                WHERE "createdAt" >= ${rangeStart}
            `,
            prisma.$queryRaw<TodayRow[]>`
                SELECT
                    COUNT(*)::int AS orders_today,
                    COUNT(*) FILTER (WHERE status = 'DONE')::int AS done_today,
                    COALESCE(
                        SUM("totalPrice") FILTER (WHERE status = 'DONE'),
                        0
                    )::int AS revenue_today
                FROM "Order"
                WHERE "createdAt" >= ${todayStart}
                    AND "createdAt" <= ${todayEnd}
            `,
            prisma.$queryRaw<ProductRow[]>`
                SELECT
                    CASE
                        WHEN BTRIM(oi.name) = '' THEN ${untitledProduct}
                        ELSE BTRIM(oi.name)
                    END AS name,
                    SUM(oi.quantity)::int AS quantity,
                    SUM(oi.price * oi.quantity)::int AS revenue
                FROM "OrderItem" oi
                INNER JOIN "Order" o ON o.id = oi."orderId"
                WHERE o."createdAt" >= ${rangeStart}
                    AND o.status = 'DONE'
                GROUP BY 1
                ORDER BY revenue DESC
                LIMIT 5
            `,
            prisma.order.count({
                where: { status: { in: ACTIVE_STATUSES } },
            }),
            prisma.order.findMany({
                where: { createdAt: { gte: rangeStart } },
                select: {
                    id: true,
                    createdAt: true,
                    status: true,
                    totalPrice: true,
                    delivery: true,
                    deliveryZoneName: true,
                },
                orderBy: { createdAt: "desc" },
                take: EXPORT_ORDERS_LIMIT,
            }),
        ]);

        const dailyMap = new Map(
            dayKeys.map((date) => [
                date,
                { date, label: formatDayLabel(date), revenue: 0, orders: 0 },
            ]),
        );
        for (const row of dailyRows) {
            const bucket = dailyMap.get(row.day);
            if (bucket) {
                bucket.orders = safeNumber(row.orders);
                bucket.revenue = safeNumber(row.revenue);
            }
        }

        const statusMap = new Map<OrderStatus, number>(
            emptyStatusDistribution().map(({ status }) => [status, 0]),
        );
        for (const row of statusRows) {
            statusMap.set(row.status, safeNumber(row.count));
        }

        const zoneMap = new Map<string, AdminAnalyticsZoneSlice>();
        for (const row of zoneRows) {
            zoneMap.set(row.zone, {
                name: row.zone,
                orders: safeNumber(row.orders),
                revenue: safeNumber(row.revenue),
            });
        }

        const hourMap = new Map<number, AdminAnalyticsHourSlice>(
            emptyHourSlices().map((slice) => [slice.hour, { ...slice }]),
        );
        for (const row of hourRows) {
            const hour = safeNumber(row.hour);
            const slice = hourMap.get(hour);
            if (slice) {
                slice.orders = safeNumber(row.orders);
                slice.revenue = safeNumber(row.revenue);
            }
        }

        const paymentMap = new Map<PaymentMethod, AdminAnalyticsPaymentSlice>(
            emptyPaymentSlices(paymentLabels).map((slice) => [slice.method, { ...slice }]),
        );
        for (const row of paymentRows) {
            const slice = paymentMap.get(row.payment);
            if (slice) {
                slice.orders = safeNumber(row.orders);
                slice.revenue = safeNumber(row.revenue);
            }
        }

        const today = todayRows[0];
        const revenueToday = safeNumber(today?.revenue_today);
        const ordersToday = safeNumber(today?.orders_today);
        const doneOrdersToday = safeNumber(today?.done_today);
        const promoImpact = safeNumber(promoRows[0]?.promo);

        const topProducts = productRows.map((row) => ({
            name: row.name,
            quantity: safeNumber(row.quantity),
            revenue: safeNumber(row.revenue),
        }));

        const salesByZone = [...zoneMap.values()].sort(
            (a, b) => b.revenue - a.revenue,
        );

        const exportOrders: AdminAnalyticsExportOrder[] = exportOrderRows.map((order) => ({
            id: order.id,
            date: formatExportOrderDate(order.createdAt),
            totalPrice: safeNumber(order.totalPrice),
            zone:
                order.delivery === DeliveryType.PICKUP || !order.deliveryZoneName?.trim()
                    ? pickupLabel
                    : order.deliveryZoneName.trim(),
            status: order.status,
            statusLabel: statusLabels[order.status],
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
            statusDistribution: (Object.keys(statusLabels) as OrderStatus[]).map(
                (status) => ({
                    status,
                    label: statusLabels[status],
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
