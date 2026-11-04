import { DiscountType, Prisma } from "@prisma/client";
import { NextResponse } from "next/server";

import { adminPromoCreateSchema } from "@/lib/api-schemas";
import { parseJsonBody } from "@/lib/parse-json-body";
import { prisma } from "@/lib/prisma";
import { normalizePromoCode } from "@/lib/promo";
import { promoCategoryIds } from "@/lib/promo-rules";
import { verifyAdmin } from "@/lib/verify-admin";

export async function GET(request: Request) {
    const auth = await verifyAdmin(request);
    if (!auth.ok) return auth.response;

    try {
        const codes = await prisma.promoCode.findMany({ orderBy: { id: "asc" } });
        return NextResponse.json(codes);
    } catch {
        // Error logged in production monitoring
        return NextResponse.json({ error: "Failed to fetch" }, { status: 500 });
    }
}

export async function POST(request: Request) {
    const auth = await verifyAdmin(request);
    if (!auth.ok) return auth.response;

    const parsed = await parseJsonBody(request, adminPromoCreateSchema);
    if (!parsed.ok) return parsed.response;

    const codeNorm = normalizePromoCode(parsed.data.code);
    if (!codeNorm) {
        return NextResponse.json({ error: "code is required" }, { status: 400 });
    }

    const {
        discountType,
        discountValue,
        minOrderAmount = null,
        maxUsages = null,
        expiresAt = null,
        isActive = true,
        conditions,
        actions,
    } = parsed.data;

    // Акции и условия ссылаются на категории: несуществующая сделала бы промокод вечно "не применимым".
    const referenced = promoCategoryIds({ actions, conditions });
    if (referenced.length > 0) {
        const found = await prisma.category.count({ where: { id: { in: referenced } } });
        if (found !== referenced.length) {
            return NextResponse.json({ error: "Category not found" }, { status: 400 });
        }
    }

    try {
        const created = await prisma.promoCode.create({
            data: {
                code: codeNorm,
                discountType:
                    discountType === "PERCENTAGE"
                        ? DiscountType.PERCENTAGE
                        : DiscountType.FIXED,
                discountValue,
                minOrderAmount,
                maxUsages,
                expiresAt,
                isActive,
                conditions: conditions?.length ? conditions : Prisma.JsonNull,
                actions: actions?.length ? actions : Prisma.JsonNull,
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
