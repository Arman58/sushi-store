import type { Prisma } from "@prisma/client";

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

export function mapProductToPopular(p: HomeProductPayload) {
    return {
        id: p.id,
        name: p.name,
        description: p.description,
        price: p.price,
        weight: p.weight,
        images: p.images,
        mainImage: p.mainImage,
        category: p.category ? { name: p.category.name } : null,
        composition: p.composition ?? undefined,
        modifierGroups: (p.modifierGroups ?? []).map((g) => ({
            id: g.id,
            name: g.name,
            required: g.required,
            maxChoices: g.maxChoices,
            modifiers: g.modifiers.map((m) => ({
                id: m.id,
                name: m.name,
                priceDelta: m.priceDelta,
            })),
        })),
    };
}
