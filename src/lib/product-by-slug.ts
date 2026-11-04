import { cache } from "react";

import { homeProductInclude } from "@/lib/home-product-include";
import { type StorefrontProduct,toStorefrontProduct } from "@/lib/i18n-utils";
import { prisma } from "@/lib/prisma";
import { storefrontProductVisible } from "@/lib/storefront-visibility";

export const getActiveProductBySlug = cache(
    async (slug: string, locale: string): Promise<StorefrontProduct | null> => {
        const raw = await prisma.product.findFirst({
            where: { slug, ...storefrontProductVisible },
            include: homeProductInclude,
        });

        if (!raw) return null;

        return toStorefrontProduct(
            raw as unknown as Record<string, unknown>,
            locale,
        );
    },
);
