import { NextResponse } from "next/server";

import { getFormValidationMessage } from "@/lib/backend-i18n";
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

async function findUpsellCategoryIds(
    excludeSlugs: string[] = [],
): Promise<number[]> {
    const slugs = UPSELL_CATEGORY_SLUGS.filter(
        (slug) => !excludeSlugs.includes(slug),
    );
    if (slugs.length === 0) return [];
    const bySlug = await prisma.category.findMany({
        where: {
            isActive: true,
            slug: { in: slugs },
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
const SAUCES_LIMIT = 8;

/** Только соусы категории `sauces` (для компактной строки «часто берут»). */
async function loadSauces(
    request: Request,
    excludeIds: number[],
    locale: string,
) {
    const category = await prisma.category.findFirst({
        where: { isActive: true, slug: "sauces" },
        select: { id: true },
    });
    if (!category) return NextResponse.json([]);

    const productsRaw = await prisma.product.findMany({
        where: {
            isActive: true,
            isAvailable: true,
            categoryId: category.id,
            ...(excludeIds.length > 0 ? { id: { notIn: excludeIds } } : {}),
        },
        orderBy: [{ price: "asc" }, { id: "asc" }],
        take: SAUCES_LIMIT,
        include: homeProductInclude,
    });

    const products = toStorefrontProducts(
        productsRaw as unknown as Record<string, unknown>[],
        locale,
    );
    return NextResponse.json(products, {
        headers: {
            "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
        },
    });
}

export async function GET(request: Request) {
    const locale = resolveRequestLocale(request);
    const excludeIds = parseExcludeIds(request);
    const url = new URL(request.url);
    const type = url.searchParams.get("type");
    /** Слаги категорий, которые не предлагать (напр. sauces - их показывает SauceStrip). */
    const excludeCategorySlugs = (url.searchParams.get("excludeCategories") ?? "")
        .split(",")
        .map((slug) => slug.trim())
        .filter(Boolean);

    if (type === "sauces") {
        try {
            return await loadSauces(request, excludeIds, locale);
        } catch {
            return NextResponse.json([]);
        }
    }

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

        const categoryIds = await findUpsellCategoryIds(excludeCategorySlugs);

        const excludedCategoryIds =
            excludeCategorySlugs.length > 0
                ? new Set(
                      (
                          await prisma.category.findMany({
                              where: { slug: { in: excludeCategorySlugs } },
                              select: { id: true },
                          })
                      ).map((c) => c.id),
                  )
                : new Set<number>();

        const baseWhere = {
            isActive: true,
            // Стоп-лист не предлагаем: добавить его в корзину всё равно нельзя.
            isAvailable: true,
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

        if (excludedCategoryIds.size > 0) {
            productsRaw = productsRaw.filter(
                (p) =>
                    p.categoryId == null ||
                    !excludedCategoryIds.has(p.categoryId),
            );
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
                        : getFormValidationMessage("form.upsell.loadFailed", locale),
            },
            { status: 500 },
        );
    }
}
