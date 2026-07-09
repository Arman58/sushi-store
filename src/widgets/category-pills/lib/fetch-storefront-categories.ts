import { unstable_cache } from "next/cache";

import { CACHE_TAGS } from "@/lib/cache-tags";
import { type StorefrontCategory,toStorefrontCategory } from "@/lib/i18n-utils";
import { prisma } from "@/lib/prisma";
import { getProductCoverUrl } from "@/shared/lib/product-cover";

/** Категории кэшируются; инвалидация через revalidateTag(CACHE_TAGS.categories). */
export const fetchStorefrontCategories = unstable_cache(
    async (locale: string): Promise<StorefrontCategory[]> => {
    try {
        const categoriesRaw = await prisma.category.findMany({
            where: {
                isActive: true,
                products: { some: { isActive: true } },
            },
            orderBy: { position: "asc" },
            include: {
                translations: true,
                products: {
                    where: { isActive: true },
                    orderBy: { id: "asc" },
                    take: 1,
                    select: { mainImage: true, images: true },
                },
            },
        });

        return categoriesRaw.map((category) => ({
            ...toStorefrontCategory(category, locale),
            // Собственное фото категории приоритетнее обложки первого товара
            image:
                (typeof category.image === "string" && category.image.trim()
                    ? category.image
                    : null) ?? getProductCoverUrl(category.products[0] ?? {}),
        }));
    } catch {
        return [];
    }
    },
    ["storefront-categories"],
    { revalidate: 3600, tags: [CACHE_TAGS.categories] },
);
