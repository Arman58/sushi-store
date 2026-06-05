import { DiscountType } from "@prisma/client";
import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { normalizePromoCode } from "@/lib/promo";
import { verifyAdmin } from "@/lib/verify-admin";

function parseId(param: string): number | null {
    const id = Number(param);
    return Number.isInteger(id) && id > 0 ? id : null;
}

function parseExpiresAt(raw: unknown): Date | null {
    if (raw == null || raw === "") return null;
    if (typeof raw !== "string") return null;
    const d = new Date(raw);
    return Number.isNaN(d.getTime()) ? null : d;
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
        code?: unknown;
        discountType?: unknown;
        discountValue?: unknown;
        minOrderAmount?: unknown;
        maxUsages?: unknown;
        expiresAt?: unknown;
        isActive?: unknown;
    };

    const data: {
        code?: string;
        discountType?: DiscountType;
        discountValue?: number;
        minOrderAmount?: number | null;
        maxUsages?: number | null;
        expiresAt?: Date | null;
        isActive?: boolean;
    } = {};

    if (typeof b.code === "string") {
        const c = normalizePromoCode(b.code);
        if (!c) return NextResponse.json({ error: "code empty" }, { status: 400 });
        data.code = c;
    }

    if (b.discountType !== undefined) {
        if (b.discountType !== "PERCENTAGE" && b.discountType !== "FIXED") {
            return NextResponse.json(
                { error: "discountType must be PERCENTAGE or FIXED" },
                { status: 400 },
            );
        }
        data.discountType =
            b.discountType === "PERCENTAGE"
                ? DiscountType.PERCENTAGE
                : DiscountType.FIXED;
    }

    if (b.discountValue !== undefined) {
        if (typeof b.discountValue !== "number" || !Number.isInteger(b.discountValue)) {
            return NextResponse.json({ error: "discountValue invalid" }, { status: 400 });
        }
        data.discountValue = b.discountValue;
    }

    if (Object.prototype.hasOwnProperty.call(b, "minOrderAmount")) {
        if (b.minOrderAmount == null) {
            data.minOrderAmount = null;
        } else if (
            typeof b.minOrderAmount === "number" &&
            Number.isInteger(b.minOrderAmount) &&
            b.minOrderAmount >= 0
        ) {
            data.minOrderAmount = b.minOrderAmount;
        } else {
            return NextResponse.json({ error: "minOrderAmount invalid" }, { status: 400 });
        }
    }

    if (Object.prototype.hasOwnProperty.call(b, "maxUsages")) {
        if (b.maxUsages == null) {
            data.maxUsages = null;
        } else if (
            typeof b.maxUsages === "number" &&
            Number.isInteger(b.maxUsages) &&
            b.maxUsages >= 1
        ) {
            data.maxUsages = b.maxUsages;
        } else {
            return NextResponse.json({ error: "maxUsages invalid" }, { status: 400 });
        }
    }

    if (Object.prototype.hasOwnProperty.call(b, "expiresAt")) {
        if (b.expiresAt == null || b.expiresAt === "") {
            data.expiresAt = null;
        } else {
            const parsed = parseExpiresAt(b.expiresAt);
            if (!parsed)
                return NextResponse.json({ error: "expiresAt invalid" }, { status: 400 });
            data.expiresAt = parsed;
        }
    }

    if (typeof b.isActive === "boolean") {
        data.isActive = b.isActive;
    }

    if (Object.keys(data).length === 0) {
        return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
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
