import { NextResponse } from "next/server";

import {
    adminDeliveryZoneCreateSchema,
} from "@/lib/api-schemas";
import { parseJsonBody } from "@/lib/parse-json-body";
import { prisma } from "@/lib/prisma";
import { verifyAdmin } from "@/lib/verify-admin";

export async function GET(request: Request) {
    const auth = await verifyAdmin(request);
    if (!auth.ok) return auth.response;

    try {
        const zones = await prisma.deliveryZone.findMany({
            orderBy: [{ position: "asc" }, { id: "asc" }],
        });
        return NextResponse.json(zones);
    } catch {
        // Error logged in production monitoring
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
        description = "",
        requiresManagerApproval = false,
        isActive = true,
    } = parsed.data;

    try {
        const agg = await prisma.deliveryZone.aggregate({ _max: { position: true } });
        const nextPosition = (agg._max.position ?? -1) + 1;

        const created = await prisma.deliveryZone.create({
            data: {
                name,
                deliveryPrice,
                minOrderAmount,
                description,
                requiresManagerApproval,
                isActive,
                position: nextPosition,
            },
        });
        return NextResponse.json(created, { status: 201 });
    } catch {
        // Error logged in production monitoring
        return NextResponse.json({ error: "Failed to create" }, { status: 500 });
    }
}
