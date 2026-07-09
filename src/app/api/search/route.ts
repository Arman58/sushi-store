import { NextResponse } from "next/server";

import { getLocalizedField } from "@/lib/i18n-utils";
import { prisma } from "@/lib/prisma";
import {
    checkRateLimit,
    rateLimitExceededJsonResponse,
} from "@/lib/rate-limit";
import { getProductCoverUrl } from "@/shared/lib/product-cover";

export const dynamic = "force-dynamic";

const MAX_PRODUCTS = 8;
const MAX_CATEGORIES = 4;
const CANDIDATE_LIMIT = 40;

/** Нормализация для сравнения: нижний регистр + схлопывание пробелов. */
function norm(value: string): string {
    return value.toLowerCase().replace(/\s+/g, " ").trim();
}

/** Sanitize user query for plainto_tsquery / ILIKE fallback. */
function sanitizeSearchQuery(raw: string): string {
    return raw.replace(/[^\p{L}\p{N}\s-]/gu, " ").replace(/\s+/g, " ").trim();
}

/** Все строковые значения из локализованного JSON ({hy,ru,en}). */
function localizedValues(json: unknown): string[] {
    if (!json || typeof json !== "object") return [];
    return Object.values(json as Record<string, unknown>).filter(
        (v): v is string => typeof v === "string" && v.length > 0,
    );
}

/**
 * Оценка совпадения запроса по строкам (по всем локалям):
 *  3 - строка начинается с запроса, 2 - слово в строке начинается с запроса,
 *  1 - запрос содержится, 0 - нет.
 */
function scoreMatch(values: string[], q: string): number {
    let best = 0;
    for (const raw of values) {
        const s = norm(raw);
        if (s.startsWith(q)) best = Math.max(best, 3);
        else if (s.split(" ").some((w) => w.startsWith(q)))
            best = Math.max(best, 2);
        else if (s.includes(q)) best = Math.max(best, 1);
    }
    return best;
}

type ProductHitRow = { id: number };
type CategoryHitRow = { id: number };

async function findProductIdsByFts(q: string): Promise<number[]> {
    const rows = await prisma.$queryRaw<ProductHitRow[]>`
        SELECT DISTINCT p.id
        FROM "Product" p
        LEFT JOIN "ProductTranslation" pt ON pt."productId" = p.id
        LEFT JOIN "Category" c ON c.id = p."categoryId"
        LEFT JOIN "CategoryTranslation" ct ON ct."categoryId" = c.id
        WHERE p."isActive" = true
          AND (
            to_tsvector('simple', coalesce(pt.name, ''))
                @@ plainto_tsquery('simple', ${q})
            OR to_tsvector('simple', coalesce(ct.name, ''))
                @@ plainto_tsquery('simple', ${q})
            OR pt.name ILIKE ${"%" + q + "%"}
            OR ct.name ILIKE ${"%" + q + "%"}
          )
        LIMIT ${CANDIDATE_LIMIT}
    `;
    return rows.map((r) => r.id);
}

async function findCategoryIdsByFts(q: string): Promise<number[]> {
    const rows = await prisma.$queryRaw<CategoryHitRow[]>`
        SELECT DISTINCT c.id
        FROM "Category" c
        JOIN "CategoryTranslation" ct ON ct."categoryId" = c.id
        WHERE c."isActive" = true
          AND (
            to_tsvector('simple', coalesce(ct.name, ''))
                @@ plainto_tsquery('simple', ${q})
            OR ct.name ILIKE ${"%" + q + "%"}
          )
        LIMIT ${CANDIDATE_LIMIT}
    `;
    return rows.map((r) => r.id);
}

export async function GET(request: Request) {
    const rl = await checkRateLimit(request, "search");
    if (!rl.allowed) return rateLimitExceededJsonResponse();

    const url = new URL(request.url);
    const q = norm(sanitizeSearchQuery(url.searchParams.get("q") ?? ""));
    const locale = url.searchParams.get("locale") ?? "hy";

    if (q.length < 2) {
        return NextResponse.json({ products: [], categories: [] });
    }

    try {
        const [productIds, categoryIds] = await Promise.all([
            findProductIdsByFts(q),
            findCategoryIdsByFts(q),
        ]);

        const [products, categories] = await Promise.all([
            productIds.length
                ? prisma.product.findMany({
                      where: { id: { in: productIds }, isActive: true },
                      include: {
                          category: { include: { translations: true } },
                          translations: true,
                      },
                  })
                : Promise.resolve([]),
            categoryIds.length
                ? prisma.category.findMany({
                      where: { id: { in: categoryIds }, isActive: true },
                      select: {
                          id: true,
                          slug: true,
                          translations: true,
                          image: true,
                      },
                  })
                : Promise.resolve([]),
        ]);

        const rankedProducts = products
            .map((p) => ({
                p,
                score: scoreMatch(
                    localizedValues(p.translations.map((t) => t.name)),
                    q,
                ),
            }))
            .sort((a, b) => b.score - a.score)
            .slice(0, MAX_PRODUCTS)
            .map(({ p }) => ({
                id: p.id,
                slug: p.slug,
                name: getLocalizedField(p.translations, locale, "name"),
                price: p.price,
                image: getProductCoverUrl(p),
                categoryName: p.category
                    ? getLocalizedField(p.category.translations, locale, "name")
                    : null,
                isAvailable: p.isAvailable,
            }));

        const rankedCategories = categories
            .map((c) => ({
                c,
                score: scoreMatch(
                    localizedValues(c.translations.map((t) => t.name)),
                    q,
                ),
            }))
            .sort((a, b) => b.score - a.score)
            .slice(0, MAX_CATEGORIES)
            .map(({ c }) => ({
                id: c.id,
                slug: c.slug,
                name: getLocalizedField(c.translations, locale, "name"),
                image: c.image,
            }));

        return NextResponse.json({
            products: rankedProducts,
            categories: rankedCategories,
        });
    } catch {
        return NextResponse.json(
            { error: "Search failed" },
            { status: 500 },
        );
    }
}
