import { DiscountType } from "@prisma/client";
import { NextResponse } from "next/server";

import { adminPromoPatchSchema } from "@/lib/api-schemas";
import { parseJsonBody } from "@/lib/parse-json-body";
import { prisma } from "@/lib/prisma";
import { normalizePromoCode } from "@/lib/promo";
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

    const parsed = await parseJsonBody(request, adminPromoPatchSchema);
    if (!parsed.ok) return parsed.response;

    const data: {
        code?: string;
        discountType?: DiscountType;
        discountValue?: number;
        minOrderAmount?: number | null;
        maxUsages?: number | null;
        expiresAt?: Date | null;
        isActive?: boolean;
    } = {};

    if (parsed.data.code !== undefined) {
        const c = normalizePromoCode(parsed.data.code);
        if (!c) return NextResponse.json({ error: "code empty" }, { status: 400 });
        data.code = c;
    }

    if (parsed.data.discountType !== undefined) {
        data.discountType =
            parsed.data.discountType === "PERCENTAGE"
                ? DiscountType.PERCENTAGE
                : DiscountType.FIXED;
    }

    if (parsed.data.discountValue !== undefined) {
        data.discountValue = parsed.data.discountValue;
    }

    if (parsed.data.minOrderAmount !== undefined) {
        data.minOrderAmount = parsed.data.minOrderAmount;
    }

    if (parsed.data.maxUsages !== undefined) {
        data.maxUsages = parsed.data.maxUsages;
    }

    if (parsed.data.expiresAt !== undefined) {
        data.expiresAt = parsed.data.expiresAt;
    }

    if (parsed.data.isActive !== undefined) {
        data.isActive = parsed.data.isActive;
    }

    try {
        const updated = await prisma.promoCode.update({
            where: { id },
            data,
        });
        return NextResponse.json(updated);
    } catch {
        return NextResponse.json(
            { error: "Не удалось обновить (код занят или нет записи)" },
            { status: 409 },
        );
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
        await prisma.promoCode.delete({ where: { id } });
        return NextResponse.json({ ok: true });
    } catch {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
}
