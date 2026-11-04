import { DiscountType, Prisma } from "@prisma/client";
import { NextResponse } from "next/server";

import { adminPromoPatchSchema } from "@/lib/api-schemas";
import { parseJsonBody } from "@/lib/parse-json-body";
import { prisma } from "@/lib/prisma";
import { normalizePromoCode } from "@/lib/promo";
import {
    parsePromoActions,
    promoCategoryIds,
    validatePromoActionValues,
    validatePromoDiscount,
} from "@/lib/promo-rules";
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

    // Частичное изменение: проверяем ИТОГОВУЮ запись (тип/значение/акции из БД + присланное),
    // иначе, например, смена типа на "процент" оставила бы старое значение 5000 (> 100).
    const existing = await prisma.promoCode.findUnique({ where: { id } });
    if (!existing) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const nextActions =
        parsed.data.actions !== undefined
            ? parsed.data.actions ?? []
            : parsePromoActions(existing.actions);
    const problem =
        validatePromoDiscount(
            data.discountType ?? existing.discountType,
            data.discountValue ?? existing.discountValue,
            { hasActions: nextActions.length > 0 },
        ) ?? validatePromoActionValues(nextActions);
    if (problem) {
        return NextResponse.json(
            {
                error:
                    problem === "percentOutOfRange"
                        ? "Percent must be between 0 and 100"
                        : "Discount value must be at least 1",
            },
            { status: 400 },
        );
    }

    if (parsed.data.actions !== undefined || parsed.data.conditions !== undefined) {
        const referenced = promoCategoryIds({
            actions: parsed.data.actions ?? undefined,
            conditions: parsed.data.conditions ?? undefined,
        });
        if (referenced.length > 0) {
            const found = await prisma.category.count({ where: { id: { in: referenced } } });
            if (found !== referenced.length) {
                return NextResponse.json({ error: "Category not found" }, { status: 400 });
            }
        }
    }

    // null / [] - убрать; undefined - не трогать.
    const rules: Prisma.PromoCodeUpdateInput = {};
    if (parsed.data.actions !== undefined) {
        rules.actions = parsed.data.actions?.length ? parsed.data.actions : Prisma.JsonNull;
    }
    if (parsed.data.conditions !== undefined) {
        rules.conditions = parsed.data.conditions?.length ? parsed.data.conditions : Prisma.JsonNull;
    }

    try {
        const updated = await prisma.promoCode.update({
            where: { id },
            data: { ...data, ...rules },
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
