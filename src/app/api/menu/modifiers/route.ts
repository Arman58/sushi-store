import { NextResponse } from "next/server";

import { resolveRequestLocale, toStorefrontModifierGroups } from "@/lib/i18n-utils";
import { prisma } from "@/lib/prisma";

/**
 * Модификаторы товара по требованию.
 *
 * Списки меню больше не тянут modifierGroups целиком - клиент
 * запрашивает их здесь при открытии карточки/диалога выбора.
 */
export async function GET(request: Request) {
    const url = new URL(request.url);
    const productId = Number.parseInt(url.searchParams.get("productId") ?? "", 10);

    if (!Number.isInteger(productId) || productId <= 0) {
        return NextResponse.json({ error: "Invalid productId" }, { status: 400 });
    }

    const locale = resolveRequestLocale(request);

    try {
        const product = await prisma.product.findFirst({
            where: { id: productId, isActive: true },
            select: {
                modifierGroups: {
                    orderBy: [{ position: "asc" }, { id: "asc" }],
                    include: {
                        translations: true,
                        modifiers: {
                            orderBy: [{ position: "asc" }, { id: "asc" }],
                            include: { translations: true },
                        },
                    },
                },
            },
        });

        if (!product) {
            return NextResponse.json({ error: "Not found" }, { status: 404 });
        }

        const modifierGroups = toStorefrontModifierGroups(
            product.modifierGroups as unknown as Record<string, unknown>[],
            locale,
        );

        return NextResponse.json(
            { modifierGroups },
            {
                headers: {
                    "Cache-Control":
                        "public, s-maxage=60, stale-while-revalidate=300",
                },
            },
        );
    } catch {
        return NextResponse.json({ error: "Internal error" }, { status: 500 });
    }
}
