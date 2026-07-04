import { Chip } from "@mui/material";
import type { DeliveryType, OrderStatus, PaymentMethod } from "@prisma/client";

import { isOrderStatus } from "@/lib/order-status";

import type { SortDirection, SortField } from "./orders-query";

const BASE_PATH = "/admin/orders";

export type OrderDisplayLabels = {
    paymentCash: string;
    paymentCard: string;
    deliveryDelivery: string;
    deliveryPickup: string;
    status: Record<OrderStatus, string>;
};

export function formatDate(date: Date, locale: string): string {
    return new Intl.DateTimeFormat(locale, {
        day: "2-digit",
        month: "2-digit",
        year: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        timeZone: "Asia/Yerevan",
    }).format(date);
}

export function mapPaymentLabel(
    payment: PaymentMethod,
    labels: OrderDisplayLabels,
): string {
    switch (payment) {
        case "CASH":
            return labels.paymentCash;
        case "CARD":
            return labels.paymentCard;
        default:
            return payment;
    }
}

export function mapDeliveryLabel(
    delivery: DeliveryType,
    labels: OrderDisplayLabels,
): string {
    switch (delivery) {
        case "DELIVERY":
            return labels.deliveryDelivery;
        case "PICKUP":
            return labels.deliveryPickup;
        default:
            return delivery;
    }
}

export function mapStatusLabel(
    status: string,
    labels: OrderDisplayLabels,
): string {
    if (isOrderStatus(status)) {
        return labels.status[status];
    }
    return status;
}

function getNextSortDir(
    currentField: SortField,
    currentDir: SortDirection,
    column: SortField,
): SortDirection {
    if (currentField === column) {
        return currentDir === "desc" ? "asc" : "desc";
    }
    return "desc";
}

export function buildSortHref(
    searchParams: Record<string, string | undefined>,
    column: SortField,
    currentField: SortField,
    currentDir: SortDirection,
): string {
    const params = new URLSearchParams();

    for (const [key, value] of Object.entries(searchParams)) {
        if (value) params.set(key, value);
    }

    const nextDir = getNextSortDir(currentField, currentDir, column);

    params.set("sort", column);
    params.set("dir", nextDir);

    const query = params.toString();
    return query ? `${BASE_PATH}?${query}` : BASE_PATH;
}

export function buildFilterHref(
    searchParams: Record<string, string | undefined>,
    updates: Record<string, string | undefined>,
): string {
    const params = new URLSearchParams();

    for (const [key, value] of Object.entries(searchParams)) {
        if (value) params.set(key, value);
    }

    for (const [key, value] of Object.entries(updates)) {
        if (value && value !== "all") {
            params.set(key, value);
        } else {
            params.delete(key);
        }
    }

    const query = params.toString();
    return query ? `${BASE_PATH}?${query}` : BASE_PATH;
}

export function buildExportHref(
    searchParams: Record<string, string | undefined>,
): string {
    const params = new URLSearchParams();

    for (const [key, value] of Object.entries(searchParams)) {
        if (value) params.set(key, value);
    }

    const query = params.toString();
    return query ? `/admin/orders/export?${query}` : "/admin/orders/export";
}

export function buildPageHref(
    searchParams: Record<string, string | undefined>,
    page: number,
): string {
    const params = new URLSearchParams();

    for (const [key, value] of Object.entries(searchParams)) {
        if (value) params.set(key, value);
    }

    params.set("page", String(page));

    const query = params.toString();
    return query ? `${BASE_PATH}?${query}` : BASE_PATH;
}

export function renderFilterChip(
    label: string,
    href: string,
    active: boolean,
) {
    return (
        <a href={href} style={{ textDecoration: "none" }}>
            <Chip
                component="span"
                clickable
                label={label}
                size="small"
                sx={{
                    borderRadius: 999,
                    fontSize: 12,
                    fontWeight: active ? 600 : 500,
                    bgcolor: active
                        ? "rgba(249,115,22,0.16)"
                        : "rgba(148,163,184,0.10)",
                    color: active ? "warning.main" : "text.secondary",
                    textDecoration: "none",
                    "&:hover": {
                        bgcolor: active
                            ? "rgba(249,115,22,0.22)"
                            : "rgba(148,163,184,0.18)",
                    },
                }}
            />
        </a>
    );
}
