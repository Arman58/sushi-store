import { NextResponse } from "next/server";
import { getTranslations } from "next-intl/server";

import { resolveAdminLocale } from "@/lib/admin-locale";
import { toCsvRow } from "@/lib/csv";
import { isOrderStatus } from "@/lib/order-status";
import { verifyAdmin } from "@/lib/verify-admin";

import {
    type DateRangeFilter,
    type DeliveryFilter,
    iterateOrders,
    type OrderFilters,
    type PaymentFilter,
    type SortDirection,
    type SortField,
    type StatusFilter,
} from "../orders-query";

const SORT_FIELDS: readonly SortField[] = ["date", "total", "name", "id"];

/** Те же параметры и та же логика, что у страницы заказов: экспорт = то, что видно в списке. */
function parseSearchParams(url: string): {
    filters: OrderFilters;
    sortField: SortField;
    sortDir: SortDirection;
} {
    const sp = new URL(url).searchParams;

    const sortParam = sp.get("sort") as SortField | null;
    const sortField: SortField =
        sortParam && SORT_FIELDS.includes(sortParam) ? sortParam : "date";
    const dirParam = sp.get("dir");
    const sortDir: SortDirection = dirParam === "asc" || dirParam === "desc" ? dirParam : "desc";

    const delivery = sp.get("delivery");
    const payment = sp.get("payment");
    const status = sp.get("status");
    const dateRange = sp.get("dateRange");

    return {
        sortField,
        sortDir,
        filters: {
            delivery:
                delivery === "delivery" || delivery === "pickup"
                    ? (delivery as DeliveryFilter)
                    : "all",
            payment:
                payment === "cash" || payment === "card" ? (payment as PaymentFilter) : "all",
            status:
                status === "new" ||
                status === "in_progress" ||
                status === "done" ||
                status === "cancelled"
                    ? (status as StatusFilter)
                    : "all",
            dateRange:
                dateRange === "today" || dateRange === "7d" || dateRange === "30d"
                    ? (dateRange as DateRangeFilter)
                    : "all",
            q: (sp.get("q") ?? "").trim(),
        },
    };
}

function formatDate(date: Date, locale: string) {
    return new Intl.DateTimeFormat(locale, {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        timeZone: "Asia/Yerevan",
    }).format(date);
}

/** BOM: без него Excel открывает UTF-8 CSV в ANSI, и армянский/русский текст превращается в мусор. */
const UTF8_BOM = "﻿";

export async function GET(request: Request) {
    const auth = await verifyAdmin(request);
    if (!auth.ok) {
        return auth.response;
    }

    const locale = await resolveAdminLocale();
    const tCommon = await getTranslations({ locale, namespace: "admin.common" });
    const tOrders = await getTranslations({ locale, namespace: "admin.orders" });
    const tOrder = await getTranslations({ locale, namespace: "order" });

    const paymentLabels = {
        CASH: tOrder("payment.cash"),
        CARD: tOrder("payment.card"),
    } as const;

    const deliveryLabels = {
        DELIVERY: tCommon("delivery"),
        PICKUP: tCommon("pickup"),
    } as const;

    const statusLabels = {
        PENDING_APPROVAL: tOrder("status.pendingApproval"),
        NEW: tOrder("status.new"),
        COOKING: tOrder("status.cooking"),
        DELIVERING: tOrder("status.delivering"),
        DONE: tOrder("status.done"),
        CANCELLED: tOrder("status.cancelled"),
    } as const;

    const { filters, sortField, sortDir } = parseSearchParams(request.url);

    const header = toCsvRow([
        tOrders("exportHeaders.id"),
        tOrders("exportHeaders.date"),
        tOrders("exportHeaders.client"),
        tOrders("exportHeaders.phone"),
        tOrders("exportHeaders.delivery"),
        tOrders("exportHeaders.status"),
        tOrders("exportHeaders.address"),
        tOrders("exportHeaders.payment"),
        tOrders("exportHeaders.amount"),
        tOrders("exportHeaders.items"),
    ]);

    const encoder = new TextEncoder();
    const batches = iterateOrders({ filters, sortField, sortDir });
    let headerSent = false;

    // Заказы читаются и отдаются порциями: память ограничена размером порции, а не всей
    // историей (раньше все заказы с позициями собирались в одну строку).
    const stream = new ReadableStream<Uint8Array>({
        async pull(controller) {
            try {
                if (!headerSent) {
                    headerSent = true;
                    controller.enqueue(encoder.encode(`${UTF8_BOM}${header}\n`));
                    return;
                }

                const { value: batch, done } = await batches.next();
                if (done) {
                    controller.close();
                    return;
                }

                const rows = batch.map((order) => {
                    const itemsSummary = order.items
                        .map((item) => `${item.name} x${item.quantity} (${item.price})`)
                        .join(" | ");

                    return toCsvRow([
                        order.id,
                        formatDate(order.createdAt, locale),
                        order.name,
                        order.phone,
                        order.delivery in deliveryLabels
                            ? deliveryLabels[order.delivery as keyof typeof deliveryLabels]
                            : order.delivery,
                        isOrderStatus(order.status) ? statusLabels[order.status] : order.status,
                        order.address ?? "",
                        order.payment in paymentLabels
                            ? paymentLabels[order.payment as keyof typeof paymentLabels]
                            : order.payment,
                        order.totalPrice,
                        itemsSummary,
                    ]);
                });
                controller.enqueue(encoder.encode(`${rows.join("\n")}\n`));
            } catch (error) {
                controller.error(error);
            }
        },
        async cancel() {
            await batches.return(undefined);
        },
    });

    return new NextResponse(stream, {
        headers: {
            "Content-Type": "text/csv; charset=utf-8",
            "Content-Disposition": 'attachment; filename="orders.csv"',
            "Cache-Control": "no-store",
        },
    });
}
