import { NextResponse } from "next/server";

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
    } catch (e) {
        console.error("admin delivery-zones GET", e);
        return NextResponse.json({ error: "Failed to fetch" }, { status: 500 });
    }
}

export async function POST(request: Request) {
    const auth = await verifyAdmin(request);
    if (!auth.ok) return auth.response;

    let body: unknown;
    try {
        body = await request.json();
    } catch {
        return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const b = body as {
        name?: unknown;
        deliveryPrice?: unknown;
        minOrderAmount?: unknown;
        description?: unknown;
        requiresManagerApproval?: unknown;
        isActive?: unknown;
    };

    const name =
        typeof b.name === "string" ? b.name.trim() : "";

    if (!name) {
        return NextResponse.json({ error: "name is required" }, { status: 400 });
    }

    if (typeof b.deliveryPrice !== "number" || !Number.isInteger(b.deliveryPrice)) {
        return NextResponse.json(
            { error: "deliveryPrice is required (integer, minor units)" },
            { status: 400 },
        );
    }
    if (b.deliveryPrice < 0) {
        return NextResponse.json(
            { error: "deliveryPrice must be >= 0" },
            { status: 400 },
        );
    }

    if (typeof b.minOrderAmount !== "number" || !Number.isInteger(b.minOrderAmount)) {
        return NextResponse.json(
            { error: "minOrderAmount is required (integer, minor units)" },
            { status: 400 },
        );
    }
    if (b.minOrderAmount < 0) {
        return NextResponse.json(
            { error: "minOrderAmount must be >= 0" },
            { status: 400 },
        );
    }

    const description =
        typeof b.description === "string" ? b.description.trim() : "";
    const requiresManagerApproval =
        typeof b.requiresManagerApproval === "boolean"
            ? b.requiresManagerApproval
            : false;
    const isActive = typeof b.isActive === "boolean" ? b.isActive : true;

    try {
        const agg = await prisma.deliveryZone.aggregate({ _max: { position: true } });
        const nextPosition = (agg._max.position ?? -1) + 1;

        const created = await prisma.deliveryZone.create({
            data: {
                name,
                deliveryPrice: b.deliveryPrice,
                minOrderAmount: b.minOrderAmount,
                description,
                requiresManagerApproval,
                isActive,
                position: nextPosition,
            },
        });
        return NextResponse.json(created, { status: 201 });
    } catch (e) {
        console.error("admin delivery-zones POST", e);
        return NextResponse.json({ error: "Failed to create" }, { status: 500 });
    }
}
