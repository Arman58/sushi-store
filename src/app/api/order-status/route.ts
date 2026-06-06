import { type OrderItem, type Prisma } from "@prisma/client";
import { NextResponse } from "next/server";

import {
    orderStatusGetQuerySchema,
    orderStatusPostBodySchema,
} from "@/lib/api-schemas";
import { parseJsonBody } from "@/lib/parse-json-body";
import { prisma } from "@/lib/prisma";

const DEFAULT_ERROR = "Не удалось найти заказ по указанным данным";

const normalizePhone = (phone: string) => phone.replace(/\D/g, "");

type OrderWithItems = Prisma.OrderGetPayload<{ include: { items: true } }>;

function buildOrderStatusPayload(order: OrderWithItems) {
    return {
        id: order.id,
        status: order.status,
        name: order.name,
        phone: order.phone,
        delivery: order.delivery,
        payment: order.payment,
        totalPrice: order.totalPrice,
        createdAt: order.createdAt,
        estimatedDeliveryAt: order.estimatedDeliveryAt,
        address: order.address,
        deliveryZoneName: order.deliveryZoneName,
        deliveryPrice: order.deliveryPrice,
        items: order.items.map((item: OrderItem) => ({
            id: item.id,
            productId: item.productId,
            name: item.name,
            quantity: item.quantity,
            price: item.price,
            selectedModifiers: item.selectedModifiers,
        })),
    };
}

/** Опрос статуса по id и телефону (телефон обязателен в query, чтобы нельзя было перебирать id). */
export async function GET(request: Request) {
    const url = new URL(request.url);
    const queryParsed = orderStatusGetQuerySchema.safeParse({
        id: url.searchParams.get("id"),
        phone: url.searchParams.get("phone") ?? "",
    });

    if (!queryParsed.success) {
        const phoneMissing = !url.searchParams.get("phone")?.trim();
        return NextResponse.json(
            { error: phoneMissing ? "Forbidden" : DEFAULT_ERROR },
            { status: phoneMissing ? 403 : 400 },
        );
    }

    const { id, phone } = queryParsed.data;
    const normalized = normalizePhone(phone);

    try {
        const order = await prisma.order.findUnique({
            where: { id },
            include: { items: true },
        });

        if (!order || normalizePhone(order.phone) !== normalized) {
            return NextResponse.json({ error: DEFAULT_ERROR }, { status: 404 });
        }

        return NextResponse.json(buildOrderStatusPayload(order));
    } catch (error) {
        console.error("Order status lookup error", error);
        return NextResponse.json({ error: DEFAULT_ERROR }, { status: 500 });
    }
}

export async function POST(request: Request) {
    const parsed = await parseJsonBody(request, orderStatusPostBodySchema);
    if (!parsed.ok) {
        return NextResponse.json({ error: DEFAULT_ERROR }, { status: 400 });
    }

    const { id, phone } = parsed.data;
    const normalized = normalizePhone(phone);

    try {
        const order = await prisma.order.findUnique({
            where: { id },
            include: { items: true },
        });

        if (!order || normalizePhone(order.phone) !== normalized) {
            return NextResponse.json({ error: DEFAULT_ERROR }, { status: 404 });
        }

        return NextResponse.json(buildOrderStatusPayload(order));
    } catch (error) {
        console.error("Order status lookup error", error);
        return NextResponse.json({ error: DEFAULT_ERROR }, { status: 500 });
    }
}
