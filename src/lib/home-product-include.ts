import type { Prisma } from "@prisma/client";

import { getLocalizedField } from "@/lib/i18n-utils";

/** Полный include — upsell, страница товара, API где нужны модификаторы сразу. */
export const homeProductInclude = {
    category: { include: { translations: true } },
    translations: true,
    modifierGroups: {
        orderBy: [{ position: "asc" as const }, { id: "asc" as const }],
        include: {
            translations: true,
            modifiers: {
                orderBy: [{ position: "asc" as const }, { id: "asc" as const }],
                include: { translations: true },
            },
        },
    },
} satisfies Prisma.ProductInclude;

/** Лёгкий include для списков (главная, by-ids): только флаг hasModifiers. */
export const homeProductCardInclude = {
    category: { include: { translations: true } },
    translations: true,
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
        name: getLocalizedField(p.translations, locale, "name"),
        description: getLocalizedField(p.translations, locale, "description") || null,
        price: p.price,
        weight: p.weight,
        images: p.images,
        mainImage: p.mainImage,
        category: p.category
            ? {
                  name: getLocalizedField(p.category.translations, locale, "name"),
                  slug: p.category.slug,
              }
            : null,
        composition: getLocalizedField(p.translations, locale, "composition") || undefined,
        ratingAvg: p.ratingAvg,
        ratingCount: p.ratingCount,
        isAvailable: p.isAvailable,
        minQty: p.minQty,
        maxQty: p.maxQty,
        hasModifiers: (p.modifierGroups?.length ?? 0) > 0,
    };
}
