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

/** Нормализация для сравнения: нижний регистр + схлопывание пробелов. */
function norm(value: string): string {
    return value.toLowerCase().replace(/\s+/g, " ").trim();
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

export async function GET(request: Request) {
    const rl = await checkRateLimit(request, "search");
    if (!rl.allowed) return rateLimitExceededJsonResponse();

    const url = new URL(request.url);
    const q = norm(url.searchParams.get("q") ?? "");
    const locale = url.searchParams.get("locale") ?? "hy";

    if (q.length < 2) {
        return NextResponse.json({ products: [], categories: [] });
    }

    try {
        const [products, categories] = await Promise.all([
            prisma.product.findMany({
                where: { isActive: true },
                select: {
                    id: true,
                    name: true,
                    slug: true,
                    price: true,
                    images: true,
                    mainImage: true,
                    isAvailable: true,
                    category: { select: { name: true, slug: true } },
                },
            }),
            prisma.category.findMany({
                where: { isActive: true },
                select: { id: true, name: true, slug: true, image: true },
            }),
        ]);

        const rankedProducts = products
            .map((p) => ({ p, score: scoreMatch(localizedValues(p.name), q) }))
            .filter((x) => x.score > 0)
            .sort((a, b) => b.score - a.score || a.p.price - b.p.price)
            .slice(0, MAX_PRODUCTS)
            .map(({ p }) => ({
                id: p.id,
                slug: p.slug,
                name: getLocalizedField(p.name, locale),
                price: p.price,
                image: getProductCoverUrl(p),
                categoryName: p.category
                    ? getLocalizedField(p.category.name, locale)
                    : null,
                isAvailable: p.isAvailable,
            }));

        const rankedCategories = categories
            .map((c) => ({ c, score: scoreMatch(localizedValues(c.name), q) }))
            .filter((x) => x.score > 0)
            .sort((a, b) => b.score - a.score)
            .slice(0, MAX_CATEGORIES)
            .map(({ c }) => ({
                id: c.id,
                slug: c.slug,
                name: getLocalizedField(c.name, locale),
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
