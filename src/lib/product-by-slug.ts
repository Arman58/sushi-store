import { cache } from "react";

import { homeProductInclude } from "@/lib/home-product-include";
import { toStorefrontProduct, type StorefrontProduct } from "@/lib/i18n-utils";
import { prisma } from "@/lib/prisma";

export const getActiveProductBySlug = cache(
    async (slug: string, locale: string): Promise<StorefrontProduct | null> => {
        const raw = await prisma.product.findFirst({
            where: { slug, isActive: true },
            include: homeProductInclude,
        });

        if (!raw) return null;

        return toStorefrontProduct(
            raw as unknown as Record<string, unknown>,
            locale,
        );
    },
);
