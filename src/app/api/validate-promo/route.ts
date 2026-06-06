import { NextResponse } from "next/server";

import { validatePromoBodySchema } from "@/lib/api-schemas";
import { parseJsonBody } from "@/lib/parse-json-body";
import { prisma } from "@/lib/prisma";
import {
    computePromoDiscountAmount,
    getPromoRejectionReason,
    normalizePromoCode,
} from "@/lib/promo";

export async function POST(request: Request) {
    const parsed = await parseJsonBody(request, validatePromoBodySchema);
    if (!parsed.ok) return parsed.response;

    const code = normalizePromoCode(parsed.data.code);
    if (!code) {
        return NextResponse.json({ error: "Укажите промокод" }, { status: 400 });
    }

    const cartAmount = parsed.data.cartAmount;
    const deliveryAmount = parsed.data.deliveryAmount ?? 0;

    try {
        const promo = await prisma.promoCode.findUnique({
            where: { code },
        });

        const grandTotal = cartAmount + deliveryAmount;

        const reason = getPromoRejectionReason(promo, {
            cartSubtotal: cartAmount,
            grandTotalBeforeDiscount: grandTotal,
        });

        if (reason) {
            return NextResponse.json({ error: reason }, { status: 422 });
        }

        if (!promo) {
            return NextResponse.json({ error: "Промокод не найден" }, { status: 422 });
        }

        const discountAmount = computePromoDiscountAmount(
            promo,
            cartAmount,
            grandTotal,
        );

        return NextResponse.json({
            ok: true,
            discountAmount,
            promoCodeId: promo.id,
        });
    } catch (e) {
        console.error("validate-promo error", e);
        return NextResponse.json(
            { error: "Не удалось проверить промокод" },
            { status: 500 },
        );
    }
}
