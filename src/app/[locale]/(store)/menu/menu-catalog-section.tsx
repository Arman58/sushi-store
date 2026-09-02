import * as Sentry from "@sentry/nextjs";
import { unstable_cache } from "next/cache";
import { getLocale } from "next-intl/server";
import { preload } from "react-dom";

import { CACHE_TAGS } from "@/lib/cache-tags";
import { ensureBundleSchema } from "@/lib/ensure-bundle-schema";
import {
    toStorefrontCategories,
    toStorefrontProducts,
} from "@/lib/i18n-utils";
import { prisma } from "@/lib/prisma";
import { buildLcpImageUrl } from "@/shared/lib/lcp-image-url";
import { getProductCoverUrl } from "@/shared/lib/product-cover";
import { MenuSection } from "@/widgets/menu-section";

import { MenuLoadError } from "./menu-load-error";

async function fetchMenuData(locale: string) {
    await ensureBundleSchema();

    const [categoriesRaw, productsRaw, priceStats] = await Promise.all([
        prisma.category.findMany({
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
        }),
        prisma.product.findMany({
            where: { isActive: true },
            include: {
                translations: true,
                category: {
                    include: { translations: true },
                },
                // Полные модификаторы в списке не нужны - клиент
                // подтянет их по требованию (/api/menu/modifiers).
                modifierGroups: {
                    select: { id: true },
                    take: 1,
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

    const categories = toStorefrontCategories(categoriesRaw, locale).map(
        (category, i) => {
            const raw = categoriesRaw[i];
            const ownImage =
                typeof raw?.image === "string" && raw.image.trim()
                    ? raw.image
                    : null;
            return {
                ...category,
                image:
                    ownImage ??
                    getProductCoverUrl(raw?.products[0] ?? {}),
            };
        },
    );
    const products = toStorefrontProducts(
        productsRaw.map((p) => ({
            ...p,
            // select {id} take 1 - это только маркер наличия,
            // не отдаём его клиенту как настоящие группы.
            modifierGroups: undefined,
            hasModifiers: p.modifierGroups.length > 0,
        })),
        locale,
    ).sort((a, b) => (a.name || "").localeCompare(b.name || "", locale));

    const minPrice = priceStats._min.price ?? 0;
    const maxPrice = priceStats._max.price ?? minPrice;

    return { categories, products, minPrice, maxPrice };
}

const getMenuData = (locale: string) =>
    unstable_cache(
        () => fetchMenuData(locale),
        ["menu-data", locale],
        {
            revalidate: 60,
            tags: [CACHE_TAGS.menu, CACHE_TAGS.categories, CACHE_TAGS.products],
        },
    )();

export async function MenuCatalogSection() {
    const locale = await getLocale();
    let menuData;
    try {
        menuData = await getMenuData(locale);
    } catch (err) {
        console.error("[menu-catalog] failed to load menu data", err);
        Sentry.captureException(err);
        return <MenuLoadError />;
    }

    const { categories, products, minPrice, maxPrice } = menuData;

    for (const product of products.slice(0, 2)) {
        const cover = getProductCoverUrl(product);
        if (cover) {
            preload(buildLcpImageUrl(cover, 400), {
                as: "image",
                fetchPriority: "high",
            });
        }
    }

    return (
        <MenuSection
            categories={categories}
            products={products}
            minPrice={minPrice}
            maxPrice={maxPrice}
        />
    );
}
