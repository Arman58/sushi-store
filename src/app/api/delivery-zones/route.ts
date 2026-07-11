import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";

import { getFormValidationMessage } from "@/lib/backend-i18n";
import { getLocalizedField, resolveRequestLocale } from "@/lib/i18n-utils";
import { prisma } from "@/lib/prisma";

const TABLE_MISSING_HINT =
    "В базе нет таблицы зон доставки. Выполните: npx prisma migrate deploy";

/** Публичный список активных зон доставки (без секретов). */
export async function GET(request: Request) {
    const locale = resolveRequestLocale(request);

    try {
        const zonesRaw = await prisma.deliveryZone.findMany({
            where: { isActive: true },
            orderBy: [{ position: "asc" }, { id: "asc" }],
            select: {
                id: true,
                translations: true,
                deliveryPrice: true,
                minOrderAmount: true,
                requiresManagerApproval: true,
            },
        });

        const zones = zonesRaw.map((zone) => ({
            id: zone.id,
            name: getLocalizedField(zone.translations, locale, "name"),
            deliveryPrice: zone.deliveryPrice,
            minOrderAmount: zone.minOrderAmount,
            description: getLocalizedField(zone.translations, locale, "description"),
            requiresManagerApproval: zone.requiresManagerApproval,
        }));

        return NextResponse.json(zones, {
            headers: {
                "Cache-Control":
                    "public, s-maxage=120, stale-while-revalidate=600",
            },
        });
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
                        : getFormValidationMessage(
                              "form.deliveryZones.loadFailed",
                              locale,
                          ),
            },
            { status: 500 },
        );
    }
}
