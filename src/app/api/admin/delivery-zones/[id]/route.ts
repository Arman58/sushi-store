import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { verifyAdmin } from "@/lib/verify-admin";

function parseId(param: string): number | null {
    const id = Number(param);
    return Number.isInteger(id) && id > 0 ? id : null;
}

export async function PATCH(
    request: Request,
    ctx: { params: Promise<{ id: string }> },
) {
    const auth = await verifyAdmin(request);
    if (!auth.ok) return auth.response;

    const { id: idRaw } = await ctx.params;
    const id = parseId(idRaw);
    if (!id) {
        return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    }

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
        isActive?: unknown;
    };

    const data: {
        name?: string;
        deliveryPrice?: number;
        minOrderAmount?: number;
        isActive?: boolean;
    } = {};

    if (typeof b.name === "string") {
        const n = b.name.trim();
        if (!n) return NextResponse.json({ error: "name empty" }, { status: 400 });
        data.name = n;
    }

    if (b.deliveryPrice !== undefined) {
        if (typeof b.deliveryPrice !== "number" || !Number.isInteger(b.deliveryPrice)) {
            return NextResponse.json({ error: "deliveryPrice invalid" }, { status: 400 });
        }
        if (b.deliveryPrice < 0) {
            return NextResponse.json(
                { error: "deliveryPrice must be >= 0" },
                { status: 400 },
            );
        }
        data.deliveryPrice = b.deliveryPrice;
    }

    if (b.minOrderAmount !== undefined) {
        if (
            typeof b.minOrderAmount !== "number" ||
            !Number.isInteger(b.minOrderAmount)
        ) {
            return NextResponse.json({ error: "minOrderAmount invalid" }, { status: 400 });
        }
        if (b.minOrderAmount < 0) {
            return NextResponse.json(
                { error: "minOrderAmount must be >= 0" },
                { status: 400 },
            );
        }
        data.minOrderAmount = b.minOrderAmount;
    }

    if (typeof b.isActive === "boolean") {
        data.isActive = b.isActive;
    }

    if (Object.keys(data).length === 0) {
        return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
    }

    try {
        const updated = await prisma.deliveryZone.update({
            where: { id },
            data,
        });
        return NextResponse.json(updated);
    } catch {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
}

export async function DELETE(
    request: Request,
    ctx: { params: Promise<{ id: string }> },
) {
    const auth = await verifyAdmin(request);
    if (!auth.ok) return auth.response;

    const { id: idRaw } = await ctx.params;
    const id = parseId(idRaw);
    if (!id) {
        return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    }

    try {
        await prisma.deliveryZone.delete({ where: { id } });
        return NextResponse.json({ ok: true });
    } catch {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
}
