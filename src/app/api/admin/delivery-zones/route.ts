import { NextResponse } from "next/server";

import { translationsToLocalized } from "@/lib/admin-localized";
import {
    adminDeliveryZoneCreateSchema,
} from "@/lib/api-schemas";
import { parseJsonBody } from "@/lib/parse-json-body";
import { prisma } from "@/lib/prisma";
import { invalidateDeliveryZonesCache } from "@/lib/revalidate-storefront";
import { verifyAdmin } from "@/lib/verify-admin";

function mapZoneRow<T extends { translations?: unknown }>(zone: T) {
    const { translations, ...rest } = zone;
    return {
        ...rest,
        name: translationsToLocalized(translations, "name"),
        description: translationsToLocalized(translations, "description"),
    };
}

export async function GET(request: Request) {
    const auth = await verifyAdmin(request);
    if (!auth.ok) return auth.response;

    try {
        const zones = await prisma.deliveryZone.findMany({
            orderBy: [{ position: "asc" }, { id: "asc" }],
            include: { translations: true },
        });
        return NextResponse.json(zones.map(mapZoneRow));
    } catch {
        return NextResponse.json({ error: "Failed to fetch" }, { status: 500 });
    }
}

export async function POST(request: Request) {
    const auth = await verifyAdmin(request);
    if (!auth.ok) return auth.response;

    const parsed = await parseJsonBody(request, adminDeliveryZoneCreateSchema);
    if (!parsed.ok) return parsed.response;

    const {
        name,
        deliveryPrice,
        minOrderAmount,
        description,
        requiresManagerApproval = false,
        isActive = true,
    } = parsed.data;

    const nameData = name as Record<string, string>;
    const descriptionData = description as Record<string, string> | undefined;

    const translationsData = ["hy", "ru", "en"].map((loc) => ({
        locale: loc,
        name: nameData[loc] || "",
        description: descriptionData?.[loc] || null,
    }));

    try {
        const agg = await prisma.deliveryZone.aggregate({ _max: { position: true } });
        const nextPosition = (agg._max.position ?? -1) + 1;

        const created = await prisma.deliveryZone.create({
            data: {
                deliveryPrice,
                minOrderAmount,
                requiresManagerApproval,
                isActive,
                position: nextPosition,
                translations: {
                    create: translationsData,
                },
            },
            include: { translations: true },
        });
        invalidateDeliveryZonesCache();
        return NextResponse.json(mapZoneRow(created), { status: 201 });
    } catch {
        return NextResponse.json({ error: "Failed to create" }, { status: 500 });
    }
}
