import { getLocale } from "next-intl/server";
import { cache } from "react";

import {
    toStorefrontCategories,
    toStorefrontProducts,
} from "@/lib/i18n-utils";
import { prisma } from "@/lib/prisma";
import { MenuSection } from "@/widgets/menu-section";

import { MenuLoadError } from "./menu-load-error";

const getMenuData = cache(async (locale: string) => {
    try {
        const [categoriesRaw, productsRaw, priceStats] = await Promise.all([
            prisma.category.findMany({
                where: {
                    isActive: true,
                    products: { some: { isActive: true } },
                },
                orderBy: { position: "asc" },
            }),
            prisma.product.findMany({
                where: { isActive: true },
                include: {
                    category: true,
                    modifierGroups: {
                        orderBy: [{ position: "asc" }, { id: "asc" }],
                        include: {
                            modifiers: {
                                orderBy: [{ position: "asc" }, { id: "asc" }],
                            },
                        },
                    },
                },
                orderBy: { id: "asc" },
            }),
            prisma.product.aggregate({
                where: { isActive: true },
                _min: { price: true },
                _max: { price: true },
            }),
        ]);

        const categories = toStorefrontCategories(categoriesRaw, locale);
        const products = toStorefrontProducts(productsRaw, locale).sort((a, b) =>
            a.name.localeCompare(b.name, locale),
        );

        const minPrice = priceStats._min.price ?? 0;
        const maxPrice = priceStats._max.price ?? minPrice;

        return { categories, products, minPrice, maxPrice, error: false as const };
    } catch {
        return {
            categories: [],
            products: [],
            minPrice: 0,
            maxPrice: 0,
            error: true as const,
        };
    }
});

export async function MenuCatalogSection() {
    const locale = await getLocale();
    const menuData = await getMenuData(locale);

    if (menuData.error) {
        return <MenuLoadError />;
    }

    const { categories, products, minPrice, maxPrice } = menuData;

    return (
        <MenuSection
            categories={categories}
            products={products}
            minPrice={minPrice}
            maxPrice={maxPrice}
        />
    );
}
