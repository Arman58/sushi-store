import { NextResponse } from "next/server";

import { validatePromoBodySchema } from "@/lib/api-schemas";
import {
    getFormValidationMessage,
    getPromoRejectionMessage,
    resolveOrderRequestLocale,
} from "@/lib/backend-i18n";
import { prisma } from "@/lib/prisma";
import {
    computePromoDiscountAmount,
    getPromoRejectionCode,
    normalizePromoCode,
} from "@/lib/promo";
import {
    checkRateLimit,
    rateLimitExceededJsonResponse,
} from "@/lib/rate-limit";

export async function POST(request: Request) {
    const rateLimit = await checkRateLimit(request, "validatePromo");
    if (!rateLimit.allowed) {
        return rateLimitExceededJsonResponse();
    }

    const locale = resolveOrderRequestLocale(request);

    let json: unknown;
    try {
        json = await request.json();
    } catch {
        return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }
    const parsed = validatePromoBodySchema.safeParse(json);
    if (!parsed.success) {
        const key = parsed.error.issues[0]?.message ?? "form.generic";
        return NextResponse.json(
            { error: getFormValidationMessage(key, locale) },
            { status: 400 },
        );
    }

    const code = normalizePromoCode(parsed.data.code);
    if (!code) {
        return NextResponse.json(
            { error: getPromoRejectionMessage("codeRequired", locale) },
            { status: 400 },
        );
    }

    const cartAmount = parsed.data.cartAmount;
    const deliveryAmount = parsed.data.deliveryAmount ?? 0;

    try {
        const promo = await prisma.promoCode.findUnique({
            where: { code },
        });

        const grandTotal = cartAmount + deliveryAmount;

        const rejection = getPromoRejectionCode(promo, {
            cartSubtotal: cartAmount,
            grandTotalBeforeDiscount: grandTotal,
        });

        if (rejection) {
            return NextResponse.json(
                {
                    error: getPromoRejectionMessage(
                        rejection.code,
                        locale,
                        rejection.code === "belowMin"
                            ? {
                                  amount: rejection.minOrderAmount.toLocaleString(
                                      "ru-RU",
                                  ),
                              }
                            : undefined,
                    ),
                },
                { status: 422 },
            );
        }

        if (!promo) {
            return NextResponse.json(
                { error: getPromoRejectionMessage("notFound", locale) },
                { status: 422 },
            );
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
    } catch {
        // Error logged in production monitoring
        return NextResponse.json(
            { error: getPromoRejectionMessage("checkFailed", locale) },
            { status: 500 },
        );
    }
}
