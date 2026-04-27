import { OrderStatus } from "@prisma/client";
import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";

const DEFAULT_ERROR = "Не удалось найти заказ по указанным данным";

const normalizePhone = (phone: string) => phone.replace(/\D/g, "");

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

        const etaMinutes = (() => {
            switch (order.status) {
                case OrderStatus.NEW:
                    return 60;
                case OrderStatus.IN_PROGRESS:
                    return 40;
                case OrderStatus.DONE:
                    return 0;
                case OrderStatus.CANCELLED:
                default:
                    return 0;
            }
        })();

        return NextResponse.json({
            id: order.id,
            status: order.status,
            delivery: order.delivery,
            payment: order.payment,
            totalPrice: order.totalPrice,
            createdAt: order.createdAt,
            address: order.address,
            items: order.items.map((item) => ({
                id: item.id,
                name: item.name,
                quantity: item.quantity,
                price: item.price,
            })),
            etaMinutes,
        });
    } catch (error) {
        console.error("Order status lookup error", error);
        return NextResponse.json({ error: DEFAULT_ERROR }, { status: 500 });
    }
}
