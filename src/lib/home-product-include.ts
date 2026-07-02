import type { Prisma } from "@prisma/client";

import { getLocalizedField, toStorefrontModifierGroups } from "@/lib/i18n-utils";

/** Единый include для карточек товара на главной и в меню. */
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

export type HomeProductPayload = Prisma.ProductGetPayload<{
    include: typeof homeProductInclude;
}>;

export function mapProductToPopular(p: HomeProductPayload, locale = "hy") {
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
        modifierGroups: toStorefrontModifierGroups(
            (p.modifierGroups ?? []) as unknown as Record<string, unknown>[],
            locale,
        ),
    };
}
