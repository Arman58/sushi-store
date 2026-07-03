import { NextResponse } from "next/server";

import {
    homeProductInclude,
    type HomeProductPayload,
} from "@/lib/home-product-include";
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

/**
 * Публичные допродажи. Приоритет:
 * 1) ручные связи «с этим берут» из админки (для товаров корзины = exclude),
 * 2) напитки/соусы, 3) самые дешёвые активные товары.
 */
export async function GET(request: Request) {
    const locale = resolveRequestLocale(request);
    const excludeIds = parseExcludeIds(request);

    try {
        // 1. Ручные предложения для товаров корзины
        let curatedRaw: HomeProductPayload[] = [];
        if (excludeIds.length > 0) {
            const links = await prisma.productUpsell.findMany({
                where: { productId: { in: excludeIds } },
                orderBy: [{ position: "asc" }, { id: "asc" }],
                select: { suggestedId: true },
            });
            const suggestedIds = [
                ...new Set(links.map((l) => l.suggestedId)),
            ].filter((id) => !excludeIds.includes(id));
            if (suggestedIds.length > 0) {
                const found = await prisma.product.findMany({
                    where: {
                        id: { in: suggestedIds },
                        isActive: true,
                        isAvailable: true,
                    },
                    include: homeProductInclude,
                });
                // Сохраняем порядок position из связей
                const byId = new Map(found.map((p) => [p.id, p]));
                curatedRaw = suggestedIds
                    .map((id) => byId.get(id))
                    .filter((p): p is NonNullable<typeof p> => Boolean(p))
                    .slice(0, UPSELL_LIMIT);
            }
        }

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

        // Ручные - первыми, категорийные добивают до лимита без дублей
        if (curatedRaw.length > 0) {
            const curatedIds = new Set(curatedRaw.map((p) => p.id));
            productsRaw = [
                ...curatedRaw,
                ...productsRaw.filter((p) => !curatedIds.has(p.id)),
            ].slice(0, UPSELL_LIMIT);
        }

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

        return NextResponse.json(products, {
            headers: {
                // CDN-кэш: меню меняется редко, stale допустим
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
                        : "Не удалось загрузить рекомендации",
            },
            { status: 500 },
        );
    }
}
