import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import {
    computePromoDiscountAmount,
    getPromoRejectionReason,
    normalizePromoCode,
} from "@/lib/promo";

type ValidateBody = {
    code?: unknown;
    cartAmount?: unknown;
    deliveryAmount?: unknown;
};

export async function POST(request: Request) {
    let body: unknown;
    try {
        body = await request.json();
    } catch {
        return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const b = body as ValidateBody;

    if (typeof b.code !== "string") {
        return NextResponse.json({ error: "Укажите промокод" }, { status: 400 });
    }

    const code = normalizePromoCode(b.code);
    if (!code) {
        return NextResponse.json({ error: "Укажите промокод" }, { status: 400 });
    }

    if (typeof b.cartAmount !== "number" || !Number.isFinite(b.cartAmount)) {
        return NextResponse.json({ error: "Укажите сумму корзины" }, { status: 400 });
    }
    const cartAmount = Math.round(b.cartAmount);
    if (cartAmount <= 0) {
        return NextResponse.json(
            { error: "Корзина пустая или сумма указана некорректно" },
            { status: 400 },
        );
    }

    let deliveryAmount = 0;
    if (b.deliveryAmount != null) {
        if (typeof b.deliveryAmount !== "number" || !Number.isFinite(b.deliveryAmount)) {
            return NextResponse.json(
                { error: "Некорректная сумма доставки" },
                { status: 400 },
            );
        }
        deliveryAmount = Math.max(0, Math.round(b.deliveryAmount));
    }

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
