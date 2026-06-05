import { DiscountType } from "@prisma/client";
import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { normalizePromoCode } from "@/lib/promo";
import { verifyAdmin } from "@/lib/verify-admin";

function parseExpiresAt(raw: unknown): Date | null {
    if (raw == null || raw === "") return null;
    if (typeof raw !== "string") return null;
    const d = new Date(raw);
    return Number.isNaN(d.getTime()) ? null : d;
}

export async function GET(request: Request) {
    const auth = await verifyAdmin(request);
    if (!auth.ok) return auth.response;

    try {
        const codes = await prisma.promoCode.findMany({ orderBy: { id: "asc" } });
        return NextResponse.json(codes);
    } catch (e) {
        console.error("admin promocodes GET", e);
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
        code?: unknown;
        discountType?: unknown;
        discountValue?: unknown;
        minOrderAmount?: unknown;
        maxUsages?: unknown;
        expiresAt?: unknown;
        isActive?: unknown;
    };

    const codeNorm =
        typeof b.code === "string" ? normalizePromoCode(b.code) : "";

    if (!codeNorm) {
        return NextResponse.json({ error: "code is required" }, { status: 400 });
    }

    if (b.discountType !== "PERCENTAGE" && b.discountType !== "FIXED") {
        return NextResponse.json(
            { error: "discountType must be PERCENTAGE or FIXED" },
            { status: 400 },
        );
    }

    if (typeof b.discountValue !== "number" || !Number.isInteger(b.discountValue)) {
        return NextResponse.json({ error: "discountValue is required (int)" }, { status: 400 });
    }

    let minOrderAmount: number | null = null;
    if (b.minOrderAmount != null) {
        if (
            typeof b.minOrderAmount !== "number" ||
            !Number.isInteger(b.minOrderAmount) ||
            b.minOrderAmount < 0
        ) {
            return NextResponse.json(
                { error: "minOrderAmount invalid" },
                { status: 400 },
            );
        }
        minOrderAmount = b.minOrderAmount;
    }

    let maxUsages: number | null = null;
    if (b.maxUsages != null) {
        if (
            typeof b.maxUsages !== "number" ||
            !Number.isInteger(b.maxUsages) ||
            b.maxUsages < 1
        ) {
            return NextResponse.json({ error: "maxUsages invalid" }, { status: 400 });
        }
        maxUsages = b.maxUsages;
    }

    const expiresAt =
        Object.prototype.hasOwnProperty.call(b, "expiresAt")
            ? parseExpiresAt(b.expiresAt)
            : null;
    if (b.expiresAt != null && b.expiresAt !== "" && expiresAt === null) {
        return NextResponse.json({ error: "expiresAt invalid" }, { status: 400 });
    }

    const isActive = typeof b.isActive === "boolean" ? b.isActive : true;

    try {
        const created = await prisma.promoCode.create({
            data: {
                code: codeNorm,
                discountType:
                    b.discountType === "PERCENTAGE"
                        ? DiscountType.PERCENTAGE
                        : DiscountType.FIXED,
                discountValue: b.discountValue,
                minOrderAmount,
                maxUsages,
                expiresAt,
                isActive,
            },
        });
        return NextResponse.json(created, { status: 201 });
    } catch {
        return NextResponse.json(
            { error: "Не удалось создать промокод (возможно, код уже занят)" },
            { status: 409 },
        );
    }
}
