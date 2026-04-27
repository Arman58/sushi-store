import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";

type SortField = "date" | "total" | "name" | "id";
type SortDirection = "asc" | "desc";
type DeliveryFilter = "all" | "delivery" | "pickup";
type PaymentFilter = "all" | "cash" | "card";
type DateRangeFilter = "all" | "today" | "7d" | "30d";
type StatusFilter = "all" | "new" | "in_progress" | "done" | "cancelled";

function parseSearchParams(url: string) {
    const searchParams = new URL(url).searchParams;

    const sortFieldParam = (searchParams.get("sort") as SortField) ?? "date";
    const sortDirParam =
        searchParams.get("dir") === "asc" || searchParams.get("dir") === "desc"
            ? (searchParams.get("dir") as SortDirection)
            : "desc";

    const sortField: SortField =
        sortFieldParam === "id" ||
        sortFieldParam === "name" ||
        sortFieldParam === "total" ||
        sortFieldParam === "date"
            ? sortFieldParam
            : "date";

    const sortDir: SortDirection = sortDirParam;

    const deliveryParam = (searchParams.get("delivery") as DeliveryFilter) ?? "all";
    const paymentParam = (searchParams.get("payment") as PaymentFilter) ?? "all";
    const dateRangeParam = (searchParams.get("dateRange") as DateRangeFilter) ?? "all";
    const searchQueryRaw = searchParams.get("q") ?? "";
    const searchQuery = searchQueryRaw.trim().toLowerCase();

    const deliveryFilter: DeliveryFilter =
        deliveryParam === "delivery" || deliveryParam === "pickup"
            ? deliveryParam
            : "all";

    const paymentFilter: PaymentFilter =
        paymentParam === "cash" || paymentParam === "card"
            ? paymentParam
            : "all";
    const statusParam = (searchParams.get("status") as StatusFilter) ?? "all";
    const statusFilter: StatusFilter =
        statusParam === "new" ||
        statusParam === "in_progress" ||
        statusParam === "done" ||
        statusParam === "cancelled"
            ? statusParam
            : "all";

    const dateRangeFilter: DateRangeFilter =
        dateRangeParam === "today" ||
        dateRangeParam === "7d" ||
        dateRangeParam === "30d"
            ? dateRangeParam
            : "all";

    return {
        sortField,
        sortDir,
        deliveryFilter,
        paymentFilter,
        dateRangeFilter,
        searchQuery,
        statusFilter,
    };
}

function mapPaymentLabel(payment: string): string {
    switch (payment) {
        case "CASH":
            return "Наличными";
        case "CARD":
            return "Картой";
        default:
            return payment;
    }
}

function mapDeliveryLabel(delivery: string): string {
    switch (delivery) {
        case "DELIVERY":
            return "Доставка";
        case "PICKUP":
            return "Самовывоз";
        default:
            return delivery;
    }
}

function mapStatusLabel(status: string): string {
    switch (status) {
        case "NEW":
            return "Новый";
        case "IN_PROGRESS":
            return "В работе";
        case "DONE":
            return "Выполнен";
        case "CANCELLED":
            return "Отменён";
        default:
            return status;
    }
}

function formatDate(date: Date) {
    return new Intl.DateTimeFormat("ru-RU", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        timeZone: "Asia/Yerevan",
    }).format(date);
}

function escapeCsv(value: string | number | null | undefined): string {
    const str = (value ?? "").toString();
    if (str.includes(",") || str.includes('"') || str.includes("\n")) {
        return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
}

export async function GET(request: Request) {
    const {
        sortField,
        sortDir,
        deliveryFilter,
        paymentFilter,
        dateRangeFilter,
        searchQuery,
        statusFilter,
    } = parseSearchParams(request.url);

    let orderBy;
    switch (sortField) {
        case "id":
            orderBy = { id: sortDir };
            break;
        case "name":
            orderBy = { name: sortDir };
            break;
        case "total":
            orderBy = { totalPrice: sortDir };
            break;
        case "date":
        default:
            orderBy = { createdAt: sortDir };
            break;
    }

    const where: Record<string, unknown> = {};

    if (deliveryFilter === "delivery") {
        where.delivery = "DELIVERY";
    } else if (deliveryFilter === "pickup") {
        where.delivery = "PICKUP";
    }

    if (paymentFilter === "cash") {
        where.payment = "CASH";
    } else if (paymentFilter === "card") {
        where.payment = "CARD";
    }

    if (statusFilter === "new") {
        where.status = "NEW";
    } else if (statusFilter === "in_progress") {
        where.status = "IN_PROGRESS";
    } else if (statusFilter === "done") {
        where.status = "DONE";
    } else if (statusFilter === "cancelled") {
        where.status = "CANCELLED";
    }

    const orders = await prisma.order.findMany({
        where,
        orderBy,
        include: { items: true },
    });

    const now = new Date();
    const filteredByDate = orders.filter((order) => {
        if (dateRangeFilter === "all") return true;

        const createdAt = order.createdAt;
        const msInDay = 24 * 60 * 60 * 1000;

        if (dateRangeFilter === "today") {
            const startOfToday = new Date(
                now.getFullYear(),
                now.getMonth(),
                now.getDate(),
            );
            return createdAt >= startOfToday;
        }

        if (dateRangeFilter === "7d") {
            const from = new Date(now.getTime() - 7 * msInDay);
            return createdAt >= from;
        }

        if (dateRangeFilter === "30d") {
            const from = new Date(now.getTime() - 30 * msInDay);
            return createdAt >= from;
        }

        return true;
    });

    const filteredOrders = filteredByDate.filter((order) => {
        if (!searchQuery) return true;

        return (
            order.name.toLowerCase().includes(searchQuery) ||
            order.phone.toLowerCase().includes(searchQuery) ||
            String(order.id).includes(searchQuery)
        );
    });

    const header = [
        "ID",
        "Дата",
        "Клиент",
        "Телефон",
        "Доставка",
        "Статус",
        "Адрес",
        "Оплата",
        "Сумма",
        "Позиции",
    ].join(",");

    const rows = filteredOrders.map((order) => {
        const itemsSummary = order.items
            .map((item) => `${item.name} x${item.quantity} (${item.price})`)
            .join(" | ");

        return [
            order.id,
            formatDate(order.createdAt),
            escapeCsv(order.name),
            escapeCsv(order.phone),
            mapDeliveryLabel(order.delivery),
            mapStatusLabel(order.status),
            escapeCsv(order.address ?? ""),
            mapPaymentLabel(order.payment),
            order.totalPrice,
            escapeCsv(itemsSummary),
        ].join(",");
    });

    const csv = [header, ...rows].join("\n");

    return new NextResponse(csv, {
        headers: {
            "Content-Type": "text/csv; charset=utf-8",
            "Content-Disposition": "attachment; filename=\"orders.csv\"",
        },
    });
}
