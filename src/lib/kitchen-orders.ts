import type { DeliveryType, OrderStatus, PaymentMethod } from "@prisma/client";

import { parseSelectedModifiersJson } from "@/features/cart";
import { prisma } from "@/lib/prisma";

export type KitchenOrderItemDto = {
    id: number;
    name: string;
    quantity: number;
    modifiers: { id: number; name: string; priceDelta: number }[];
};

export type KitchenOrderDto = {
    id: number;
    createdAt: string;
    customerName: string;
    status: OrderStatus;
    deliveryType: DeliveryType;
    paymentMethod: PaymentMethod;
    comment: string | null;
    /** Наличные: с какой суммы готовить сдачу (null — точная сумма). */
    changeFrom: number | null;
    totalPrice: number;
    /** Предзаказ «ко времени» (ISO); null - как можно скорее. */
    scheduledFor: string | null;
    items: KitchenOrderItemDto[];
};

export type KitchenOrdersResponse = {
    new: KitchenOrderDto[];
    cooking: KitchenOrderDto[];
    readyForHandoff: KitchenOrderDto[];
};

const orderInclude = {
    items: {
        orderBy: { id: "asc" as const },
    },
} as const;

function mapOrder(
    order: {
        id: number;
        createdAt: Date;
        name: string;
        status: OrderStatus;
        delivery: DeliveryType;
        payment: PaymentMethod;
        comment: string | null;
        changeFrom: number | null;
        totalPrice: number;
        scheduledFor: Date | null;
        items: {
            id: number;
            name: string;
            quantity: number;
            selectedModifiers: unknown;
        }[];
    },
): KitchenOrderDto {
    return {
        id: order.id,
        createdAt: order.createdAt.toISOString(),
        customerName: order.name,
        status: order.status,
        deliveryType: order.delivery,
        paymentMethod: order.payment,
        changeFrom: order.changeFrom,
        totalPrice: order.totalPrice,
        scheduledFor: order.scheduledFor?.toISOString() ?? null,
        comment: order.comment?.trim() ? order.comment.trim() : null,
        items: order.items.map((item) => ({
            id: item.id,
            name: item.name,
            quantity: item.quantity,
            modifiers: parseSelectedModifiersJson(item.selectedModifiers),
        })),
    };
}

export async function fetchKitchenOrders(): Promise<KitchenOrdersResponse> {
    const [newOrders, cookingOrders, readyForHandoff] = await Promise.all([
        prisma.order.findMany({
            where: { status: "NEW" },
            orderBy: { createdAt: "asc" },
            include: orderInclude,
        }),
        prisma.order.findMany({
            where: { status: "COOKING" },
            orderBy: { createdAt: "asc" },
            include: orderInclude,
        }),
        prisma.order.findMany({
            where: { status: "DELIVERING" },
            orderBy: { createdAt: "asc" },
            include: orderInclude,
        }),
    ]);

    return {
        new: newOrders.map(mapOrder),
        cooking: cookingOrders.map(mapOrder),
        readyForHandoff: readyForHandoff.map(mapOrder),
    };
}
