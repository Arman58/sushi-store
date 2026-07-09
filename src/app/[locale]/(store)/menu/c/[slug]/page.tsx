import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { Suspense } from "react";

import { getLocalizedField } from "@/lib/i18n-utils";
import { menuCategoryPath } from "@/lib/menu-paths";
import { prisma } from "@/lib/prisma";
import { buildLocalizedMetadata } from "@/lib/seo/metadata";
import { PageContainer } from "@/shared/ui";
import { PromoBannersSection } from "@/widgets/home/promo-banners-section";

import { MenuCatalogSection } from "../../menu-catalog-section";
import { MenuCatalogSkeleton } from "../../menu-catalog-skeleton";
import { MenuHeroSection } from "../../menu-hero-section";
import { MenuHeroSkeleton } from "../../menu-hero-skeleton";

export const revalidate = 60;

type CategoryMenuPageProps = {
    params: Promise<{ slug: string; locale: string }>;
};

export async function generateMetadata({
    params,
}: CategoryMenuPageProps): Promise<Metadata> {
    const { slug } = await params;
    const categorySlug = decodeURIComponent(slug).trim();
    const t = await getTranslations("metadata.menu");
    const locale = await getLocale();

    if (!categorySlug || categorySlug === "all") {
        return buildLocalizedMetadata({
            locale,
            href: "/menu",
            title: t("title"),
            description: t("description"),
            titleAbsolute: true,
        });
    }

    try {
        const category = await prisma.category.findFirst({
            where: { slug: categorySlug, isActive: true },
            select: { translations: true, slug: true },
        });

        if (category) {
            const categoryName = getLocalizedField(
                category.translations,
                locale,
                "name",
            );
            const nameLower = categoryName.toLowerCase();
            return buildLocalizedMetadata({
                locale,
                href: menuCategoryPath(category.slug),
                title: t("categoryTitle", { category: categoryName }),
                description: t("categoryDescription", { name: nameLower }),
            });
        }
    } catch {
        // fall through
    }

    return buildLocalizedMetadata({
        locale,
        href: "/menu",
        title: t("title"),
        description: t("description"),
        titleAbsolute: true,
    });
}

export default async function CategoryMenuPage({
    params,
}: CategoryMenuPageProps) {
    const { slug } = await params;
    const categorySlug = decodeURIComponent(slug).trim();

    if (!categorySlug || categorySlug === "all") {
        notFound();
    }

    const category = await prisma.category.findFirst({
        where: { slug: categorySlug, isActive: true },
        select: { id: true },
    });
    if (!category) {
        notFound();
    }

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
