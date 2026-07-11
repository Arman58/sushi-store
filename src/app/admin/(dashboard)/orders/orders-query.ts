import {
    DeliveryType,
    OrderStatus,
    PaymentMethod,
    Prisma,
} from "@prisma/client";

import { prisma } from "@/lib/prisma";

export type SortField = "date" | "total" | "name" | "id";
export type SortDirection = "asc" | "desc";

export type DeliveryFilter = "all" | "delivery" | "pickup";
export type PaymentFilter = "all" | "cash" | "card";
export type DateRangeFilter = "all" | "today" | "7d" | "30d";
export type StatusFilter = "all" | "new" | "in_progress" | "done" | "cancelled";

export async function getOrders(
    sortField: SortField,
    sortDir: SortDirection,
    deliveryFilter: DeliveryFilter,
    paymentFilter: PaymentFilter,
    statusFilter: StatusFilter,
): Promise<
    Prisma.OrderGetPayload<{
        include: { items: true };
    }>[]
> {
    let orderBy: Prisma.OrderOrderByWithRelationInput;

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

    const where: Prisma.OrderWhereInput = {};

    if (deliveryFilter === "delivery") {
        where.delivery = DeliveryType.DELIVERY;
    } else if (deliveryFilter === "pickup") {
        where.delivery = DeliveryType.PICKUP;
    }

    if (paymentFilter === "cash") {
        where.payment = PaymentMethod.CASH;
    } else if (paymentFilter === "card") {
        where.payment = PaymentMethod.CARD;
    }

    if (statusFilter === "new") {
        where.status = {
            in: [OrderStatus.PENDING_APPROVAL, OrderStatus.NEW],
        };
    } else if (statusFilter === "in_progress") {
        where.status = { in: [OrderStatus.COOKING, OrderStatus.DELIVERING] };
    } else if (statusFilter === "done") {
        where.status = OrderStatus.DONE;
    } else if (statusFilter === "cancelled") {
        where.status = OrderStatus.CANCELLED;
    }

    const orders = await prisma.order.findMany({
        where,
        orderBy,
        include: {
            items: true,
        },
    });

    return orders;
}
