import type { Prisma } from "@prisma/client";

import { getLocalizedField } from "@/lib/i18n-utils";

/** Полный include — upsell, страница товара, API где нужны модификаторы сразу. */
export const homeProductInclude = {
    category: true,
    modifierGroups: {
        orderBy: [{ position: "asc" as const }, { id: "asc" as const }],
        include: {
            modifiers: {
                orderBy: [{ position: "asc" as const }, { id: "asc" as const }],
            },
        },
    },
} satisfies Prisma.ProductInclude;

/** Лёгкий include для списков (главная, by-ids): только флаг hasModifiers. */
export const homeProductCardInclude = {
    category: true,
    modifierGroups: {
        select: { id: true },
        take: 1,
    },
} satisfies Prisma.ProductInclude;

export type HomeProductPayload = Prisma.ProductGetPayload<{
    include: typeof homeProductInclude;
}>;

export type HomeProductCardPayload = Prisma.ProductGetPayload<{
    include: typeof homeProductCardInclude;
}>;

export function mapProductToPopular(
    p: HomeProductCardPayload,
    locale = "hy",
) {
    return {
        id: p.id,
        slug: p.slug,
        name: getLocalizedField(p.name, locale),
        description: getLocalizedField(p.description, locale) || null,
        price: p.price,
        weight: p.weight,
        images: p.images,
        mainImage: p.mainImage,
        category: p.category
            ? {
                  name: getLocalizedField(p.category.name, locale),
                  slug: p.category.slug,
              }
            : null,
        composition: getLocalizedField(p.composition, locale) || undefined,
        ratingAvg: p.ratingAvg,
        ratingCount: p.ratingCount,
        isAvailable: p.isAvailable,
        minQty: p.minQty,
        maxQty: p.maxQty,
        hasModifiers: (p.modifierGroups?.length ?? 0) > 0,
    };
}
