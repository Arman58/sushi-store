import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { Suspense } from "react";

import { getLocalizedField } from "@/lib/i18n-utils";
import { prisma } from "@/lib/prisma";
import { buildLocalizedMetadata } from "@/lib/seo/metadata";
import { PageContainer } from "@/shared/ui";
import { PromoBannersSection } from "@/widgets/home/promo-banners-section";

import { MenuCatalogSection } from "./menu-catalog-section";
import { MenuCatalogSkeleton } from "./menu-catalog-skeleton";
import { MenuHeroSection } from "./menu-hero-section";
import { MenuHeroSkeleton } from "./menu-hero-skeleton";

export const revalidate = 60;

type MenuPageProps = {
    searchParams: Promise<{ category?: string }>;
};

export async function generateMetadata({
    searchParams,
}: MenuPageProps): Promise<Metadata> {
    const sp = await searchParams;
    const categorySlug = sp.category?.trim();
    const t = await getTranslations("metadata.menu");

    const locale = await getLocale();

    if (categorySlug && categorySlug !== "all") {
        try {
            const category = await prisma.category.findFirst({
                where: { slug: categorySlug, isActive: true },
                select: { name: true, slug: true },
            });

            if (category) {
                const categoryName = getLocalizedField(category.name, locale);
                const nameLower = categoryName.toLowerCase();
                return buildLocalizedMetadata({
                    locale,
                    href: `/menu?category=${category.slug}`,
                    title: t("categoryTitle", { category: categoryName }),
                    description: t("categoryDescription", { name: nameLower }),
                });
            }
        } catch {
        }
    }

    return buildLocalizedMetadata({
        locale,
        href: "/menu",
        title: t("title"),
        description: t("description"),
        titleAbsolute: true,
    });
}

export default function MenuPage() {
    return (
        <PageContainer>
            <Suspense fallback={<MenuHeroSkeleton />}>
                <MenuHeroSection />
            </Suspense>

            <Suspense fallback={null}>
                <PromoBannersSection nested />
            </Suspense>

            <Suspense fallback={<MenuCatalogSkeleton />}>
                <MenuCatalogSection />
            </Suspense>
        </PageContainer>
    );
}
