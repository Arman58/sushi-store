import { type StorefrontCategory,toStorefrontCategory } from "@/lib/i18n-utils";
import { prisma } from "@/lib/prisma";
import { getProductCoverUrl } from "@/shared/lib/product-cover";
import { unstable_cache } from "next/cache";

/** Категории кэшируются на 60 сек (данные редко меняются). */
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
    { revalidate: 60 },
);
