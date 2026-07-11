import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";

import { redirect } from "@/i18n/server";
import { menuCategoryPath } from "@/lib/menu-paths";
import { buildLocalizedMetadata } from "@/lib/seo/metadata";
import { PageContainer } from "@/shared/ui";
import { PromoBannersSection } from "@/widgets/home/promo-banners-section";

import { MenuCatalogSection } from "./menu-catalog-section";
import { MenuHeroSection } from "./menu-hero-section";

export const revalidate = 60;

type MenuPageProps = {
    searchParams: Promise<{ category?: string }>;
};

export async function generateMetadata(): Promise<Metadata> {
    const t = await getTranslations("metadata.menu");
    const locale = await getLocale();

    return buildLocalizedMetadata({
        locale,
        href: "/menu",
        title: t("title"),
        description: t("description"),
        titleAbsolute: true,
    });
}

export default async function MenuPage({ searchParams }: MenuPageProps) {
    const sp = await searchParams;
    const categorySlug = sp.category?.trim();
    if (categorySlug && categorySlug !== "all") {
        redirect({
            href: menuCategoryPath(categorySlug),
            locale: await getLocale(),
        });
    }

    return (
        <PageContainer>
            <MenuHeroSection />

            <PromoBannersSection nested />

            <MenuCatalogSection />
        </PageContainer>
    );
}
