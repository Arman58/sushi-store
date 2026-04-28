import { type OrderItem, OrderStatus, type Prisma } from "@prisma/client";
import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";

const DEFAULT_ERROR = "Не удалось найти заказ по указанным данным";

const normalizePhone = (phone: string) => phone.replace(/\D/g, "");

type OrderWithItems = Prisma.OrderGetPayload<{ include: { items: true } }>;

function etaMinutesForStatus(status: OrderStatus): number {
    switch (status) {
        case OrderStatus.NEW:
            return 60;
        case OrderStatus.PREPARING:
            return 40;
        case OrderStatus.DELIVERING:
            return 20;
        case OrderStatus.DONE:
            return 0;
        case OrderStatus.CANCELLED:
        default:
            return 0;
    }
}

function buildOrderStatusPayload(order: OrderWithItems) {
    return {
        id: order.id,
        status: order.status,
        delivery: order.delivery,
        payment: order.payment,
        totalPrice: order.totalPrice,
        createdAt: order.createdAt,
        address: order.address,
        items: order.items.map((item: OrderItem) => ({
            id: item.id,
            name: item.name,
            quantity: item.quantity,
            price: item.price,
        })),
        etaMinutes: etaMinutesForStatus(order.status),
    };
}

/** Опрос статуса по id и телефону (телефон обязателен в query, чтобы нельзя было перебирать id). */
export async function GET(request: Request) {
    const url = new URL(request.url);
    const idRaw = url.searchParams.get("id");
    const phone = url.searchParams.get("phone");

    const id = idRaw ? Number.parseInt(idRaw, 10) : NaN;
    if (!Number.isFinite(id) || id <= 0) {
        return NextResponse.json({ error: DEFAULT_ERROR }, { status: 400 });
    }

    if (!phone || phone.trim().length < 8) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

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
    let body: unknown;
    try {
        body = await request.json();
    } catch {
        return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const { id, phone } = body as { id?: number; phone?: string };

    if (typeof id !== "number" || id <= 0 || !phone || typeof phone !== "string") {
        return NextResponse.json({ error: DEFAULT_ERROR }, { status: 400 });
    }

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
