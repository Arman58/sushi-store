import { NextResponse } from "next/server";

import { getFormValidationMessage } from "@/lib/backend-i18n";
import { homeProductCardInclude } from "@/lib/home-product-include";
import { resolveRequestLocale, toStorefrontProducts } from "@/lib/i18n-utils";
import { prisma } from "@/lib/prisma";

const MAX_IDS = 100;

function parseIds(request: Request): number[] {
    const url = new URL(request.url);
    const raw = url.searchParams.get("ids") ?? "";
    const ids = raw
        .split(",")
        .map((part) => Number.parseInt(part.trim(), 10))
        .filter((id) => Number.isFinite(id) && id > 0);
    return [...new Set(ids)].slice(0, MAX_IDS);
}

/** Публичные карточки товаров по списку id (избранное, недавно просмотренные). */
export async function GET(request: Request) {
    const locale = resolveRequestLocale(request);
    const ids = parseIds(request);

    if (ids.length === 0) {
        return NextResponse.json([]);
    }

    try {
        const productsRaw = await prisma.product.findMany({
            where: { isActive: true, id: { in: ids } },
            include: homeProductCardInclude,
            orderBy: { id: "asc" },
        });

        const products = toStorefrontProducts(
            productsRaw.map((p) => ({
                ...p,
                modifierGroups: undefined,
                hasModifiers: p.modifierGroups.length > 0,
            })) as unknown as Record<string, unknown>[],
            locale,
        );

        return NextResponse.json(products, {
            headers: {
                "Cache-Control":
                    "public, s-maxage=60, stale-while-revalidate=300",
            },
        });
    } catch (error) {
        return NextResponse.json(
            {
                error:
                    process.env.NODE_ENV === "development" && error instanceof Error
                        ? error.message
                        : getFormValidationMessage("form.products.loadFailed", locale),
            },
            { status: 500 },
        );
    }
}
