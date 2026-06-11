import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";

import { getLocalizedField, resolveRequestLocale } from "@/lib/i18n-utils";
import { prisma } from "@/lib/prisma";

import { ensureDeliveryZones } from "../../../../prisma/ensure-delivery-zones";

const TABLE_MISSING_HINT =
    "В базе нет таблицы зон доставки. Выполните: npx prisma migrate deploy";

/** Публичный список активных зон доставки (без секретов). */
export async function GET(request: Request) {
    const locale = resolveRequestLocale(request);

    try {
        const totalZones = await prisma.deliveryZone.count();
        if (totalZones === 0) {
            await ensureDeliveryZones(prisma);
        }

        const zonesRaw = await prisma.deliveryZone.findMany({
            where: { isActive: true },
            orderBy: [{ position: "asc" }, { id: "asc" }],
            select: {
                id: true,
                name: true,
                deliveryPrice: true,
                minOrderAmount: true,
                description: true,
                requiresManagerApproval: true,
            },
        });

        const zones = zonesRaw.map((zone) => ({
            id: zone.id,
            name: getLocalizedField(zone.name, locale),
            deliveryPrice: zone.deliveryPrice,
            minOrderAmount: zone.minOrderAmount,
            description: getLocalizedField(zone.description, locale),
            requiresManagerApproval: zone.requiresManagerApproval,
        }));

        return NextResponse.json(zones);
    } catch (error) {
        // Error logged in production monitoring

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
