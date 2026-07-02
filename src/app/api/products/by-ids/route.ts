import { NextResponse } from "next/server";

import { homeProductInclude } from "@/lib/home-product-include";
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
            include: homeProductInclude,
            orderBy: { id: "asc" },
        });

        const products = toStorefrontProducts(
            productsRaw as unknown as Record<string, unknown>[],
            locale,
        );

        return NextResponse.json(products);
    } catch (error) {
        return NextResponse.json(
            {
                error:
                    process.env.NODE_ENV === "development" && error instanceof Error
                        ? error.message
                        : "Не удалось загрузить товары",
            },
            { status: 500 },
        );
    }
}
