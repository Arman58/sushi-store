import { NextResponse } from "next/server";

import { homeProductInclude } from "@/lib/home-product-include";
import { resolveRequestLocale, toStorefrontProducts } from "@/lib/i18n-utils";
import { prisma } from "@/lib/prisma";

const UPSELL_CATEGORY_SLUGS = ["drinks", "sauces"] as const;
const UPSELL_LIMIT = 12;
const FALLBACK_LIMIT = 5;

function parseExcludeIds(request: Request): number[] {
    const url = new URL(request.url);
    const raw = url.searchParams.get("exclude") ?? "";
    return raw
        .split(",")
        .map((part) => Number.parseInt(part.trim(), 10))
        .filter((id) => Number.isFinite(id) && id > 0);
}

async function findUpsellCategoryIds(): Promise<number[]> {
    const bySlug = await prisma.category.findMany({
        where: {
            isActive: true,
            slug: { in: [...UPSELL_CATEGORY_SLUGS] },
        },
        select: { id: true },
    });

    if (bySlug.length > 0) {
        return bySlug.map((c) => c.id);
    }

    return [];
}

/** Публичные допродажи: напитки/соусы или самые дешёвые активные товары. */
export async function GET(request: Request) {
    const locale = resolveRequestLocale(request);
    const excludeIds = parseExcludeIds(request);

    try {
        const categoryIds = await findUpsellCategoryIds();

        const baseWhere = {
            isActive: true,
            ...(excludeIds.length > 0 ? { id: { notIn: excludeIds } } : {}),
        };

        let productsRaw =
            categoryIds.length > 0
                ? await prisma.product.findMany({
                      where: {
                          ...baseWhere,
                          categoryId: { in: categoryIds },
                      },
                      orderBy: [{ price: "asc" }, { id: "asc" }],
                      take: UPSELL_LIMIT,
                      include: homeProductInclude,
                  })
                : [];

        if (productsRaw.length === 0) {
            productsRaw = await prisma.product.findMany({
                where: baseWhere,
                orderBy: [{ price: "asc" }, { id: "asc" }],
                take: FALLBACK_LIMIT,
                include: homeProductInclude,
            });
        }

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
                        : "Не удалось загрузить рекомендации",
            },
            { status: 500 },
        );
    }
}
