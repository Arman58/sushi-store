import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";

import { ensureDeliveryZones } from "../../../../prisma/ensure-delivery-zones";

const TABLE_MISSING_HINT =
    "В базе нет таблицы зон доставки. Выполните: npx prisma migrate deploy";

/** Публичный список активных зон доставки (без секретов). */
export async function GET() {
    try {
        const totalZones = await prisma.deliveryZone.count();
        if (totalZones === 0) {
            await ensureDeliveryZones(prisma);
        }

        const zones = await prisma.deliveryZone.findMany({
            where: { isActive: true },
            orderBy: [{ position: "asc" }, { name: "asc" }],
            select: {
                id: true,
                name: true,
                deliveryPrice: true,
                minOrderAmount: true,
            },
        });

        return NextResponse.json(zones);
    } catch (error) {
        console.error("delivery-zones GET error:", error);

        if (error instanceof Prisma.PrismaClientKnownRequestError) {
            if (error.code === "P2021") {
                return NextResponse.json({ error: TABLE_MISSING_HINT }, { status: 503 });
            }
        }

        return NextResponse.json(
            {
                error:
                    process.env.NODE_ENV === "development" && error instanceof Error
                        ? error.message
                        : "Не удалось загрузить зоны доставки",
            },
            { status: 500 },
        );
    }
}
