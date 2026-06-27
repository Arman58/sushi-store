import { toStorefrontCategories, type StorefrontCategory } from "@/lib/i18n-utils";
import { prisma } from "@/lib/prisma";

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
        });

        return toStorefrontCategories(categoriesRaw, locale);
    } catch {
        return [];
    }
}
