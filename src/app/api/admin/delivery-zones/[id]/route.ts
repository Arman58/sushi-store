import { NextResponse } from "next/server";

import { adminDeliveryZonePatchSchema } from "@/lib/api-schemas";
import { parseJsonBody } from "@/lib/parse-json-body";
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

    const parsed = await parseJsonBody(request, adminDeliveryZonePatchSchema);
    if (!parsed.ok) return parsed.response;

    const data = { ...parsed.data };

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
