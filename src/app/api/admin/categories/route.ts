import { NextResponse } from "next/server";

import {
    translationsToLocalized,
} from "@/lib/admin-localized";
import { adminCategoryCreateSchema } from "@/lib/api-schemas";
import { localizedSlugSource } from "@/lib/i18n-utils";
import { parseJsonBody } from "@/lib/parse-json-body";
import { prisma } from "@/lib/prisma";
import { invalidateCatalogCache } from "@/lib/revalidate-storefront";
import { verifyAdmin } from "@/lib/verify-admin";

function slugifyName(name: string): string {
    const cleaned = name
        .toLowerCase()
        .trim()
        .replace(/\s+/g, "-")
        .replace(/[^a-z0-9-]/g, "");
    return cleaned;
}

async function makeUniqueCategorySlug(name: string): Promise<string> {
    const base = slugifyName(name) || `cat-${Date.now()}`;
    for (let n = 0; n < 10_000; n++) {
        const slug = n === 0 ? base : `${base}-${n}`;
        const existing = await prisma.category.findUnique({ where: { slug } });
        if (!existing) return slug;
    }
    return `cat-${Date.now()}`;
}

function mapCategoryRow<T extends { translations?: unknown }>(category: T) {
    const { translations, ...rest } = category;
    return {
        ...rest,
        name: translationsToLocalized(translations, "name"),
    };
}

export async function GET(request: Request) {
    const auth = await verifyAdmin(request);
    if (!auth.ok) {
        return auth.response;
    }

    try {
        const categories = await prisma.category.findMany({
            orderBy: { position: "asc" },
            include: { translations: true },
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
        const category = await prisma.category.create({
            data: {
                slug,
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
