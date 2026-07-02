import { type StorefrontCategory,toStorefrontCategory } from "@/lib/i18n-utils";
import { prisma } from "@/lib/prisma";
import { getProductCoverUrl } from "@/shared/lib/product-cover";

export async function fetchStorefrontCategories(
    locale: string,
): Promise<StorefrontCategory[]> {
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
}
