import { NextResponse } from "next/server";

import {
    translationsToLocalized,
} from "@/lib/admin-localized";
import { adminCategoryCreateSchema } from "@/lib/api-schemas";
import { slugifyCategoryName } from "@/lib/category-slug";
import { localizedSlugSource } from "@/lib/i18n-utils";
import { parseJsonBody } from "@/lib/parse-json-body";
import { prisma } from "@/lib/prisma";
import { invalidateCatalogCache } from "@/lib/revalidate-storefront";
import { verifyAdmin } from "@/lib/verify-admin";

async function makeUniqueCategorySlug(name: string): Promise<string> {
    const base = slugifyCategoryName(name) || `cat-${Date.now()}`;
    for (let n = 0; n < 10_000; n++) {
        const slug = n === 0 ? base : `${base}-${n}`;
        const existing = await prisma.category.findUnique({ where: { slug } });
        if (!existing) return slug;
    }
    return `cat-${Date.now()}`;
}

function mapCategoryRow<T extends { translations?: unknown; _count?: { products: number } }>(
    category: T,
) {
    const { translations, _count, ...rest } = category;
    return {
        ...rest,
        name: translationsToLocalized(translations, "name"),
        // Сколько товаров привязано: админка показывает это и блокирует удаление.
        productCount: _count?.products ?? 0,
    };
}

export async function GET(request: Request) {
    const auth = await verifyAdmin(request);
    if (!auth.ok) {
        return auth.response;
    }

    try {
        const categories = await prisma.category.findMany({
            orderBy: [{ position: "asc" }, { id: "asc" }],
            include: { translations: true, _count: { select: { products: true } } },
        });
        return NextResponse.json(categories.map(mapCategoryRow));
    } catch {
        return NextResponse.json({ error: "Failed to fetch categories" }, { status: 500 });
    }
}

export async function POST(request: Request) {
    const auth = await verifyAdmin(request);
    if (!auth.ok) {
        return auth.response;
    }

    const parsed = await parseJsonBody(request, adminCategoryCreateSchema);
    if (!parsed.ok) return parsed.response;

    const name = parsed.data.name;
    const slug = await makeUniqueCategorySlug(localizedSlugSource(name));

    const nameData = name as Record<string, string>;
    const translationsData = ["hy", "ru", "en"].map((loc) => ({
        locale: loc,
        name: nameData[loc] || "",
    }));

    try {
        // Новая категория встаёт в конец: у колонки position default 0, и без этого
        // она оказывалась бы первой на сайте.
        const { _max } = await prisma.category.aggregate({ _max: { position: true } });
        const category = await prisma.category.create({
            data: {
                slug,
                position: (_max.position ?? -1) + 1,
                translations: {
                    create: translationsData,
                },
            },
            include: { translations: true },
        });
        invalidateCatalogCache();
        return NextResponse.json(mapCategoryRow(category), { status: 201 });
    } catch {
        return NextResponse.json({ error: "Failed to create category" }, { status: 500 });
    }
}
