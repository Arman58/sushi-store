import Box from "@mui/material/Box";
import Chip from "@mui/material/Chip";
import { alpha } from "@mui/material/styles";
import Typography from "@mui/material/Typography";
import type { Metadata } from "next";
import { Suspense } from "react";
import { getLocale, getTranslations } from "next-intl/server";

import { getLocalizedField } from "@/lib/i18n-utils";
import { prisma } from "@/lib/prisma";
import { buildLocalizedMetadata } from "@/lib/seo/metadata";
import { PageContainer } from "@/shared/ui";
import { tokens } from "@/shared/ui/theme";

import { MenuCatalogSection } from "./menu-catalog-section";
import { MenuCatalogSkeleton } from "./menu-catalog-skeleton";
import { MenuHeroCtas } from "./menu-hero-ctas";

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

export default async function MenuPage() {
    const t = await getTranslations("menu");

    return (
        <PageContainer>
            <Box
                sx={{
                    mb: 4,
                    borderRadius: 4,
                    overflow: "hidden",
                    position: "relative",
                    border: "1px solid",
                    borderColor: "divider",
                    background: `linear-gradient(135deg, ${alpha(tokens.brand, 0.08)}, ${alpha(tokens.surface, 0.98)} 45%, ${alpha(tokens.textPrimary, 0.025)})`,
                }}
            >
                <Box
                    sx={{
                        position: "absolute",
                        inset: 0,
                        pointerEvents: "none",
                        background: `radial-gradient(circle at 15% 30%, ${alpha(tokens.brand, 0.16)}, transparent 32%), radial-gradient(circle at 85% 20%, ${alpha(tokens.brandHi, 0.12)}, transparent 30%)`,
                        opacity: 0.9,
                    }}
                />

                <Box sx={{ px: 2, pt: 3, pb: 4, position: "relative" }}>
                    <Chip
                        label={t("hero.chip")}
                        size="small"
                        sx={{
                            mb: 1.5,
                            borderRadius: 999,
                            bgcolor: "action.hover",
                            fontWeight: 600,
                        }}
                    />
                    <Typography
                        component="h1"
                        variant="h4"
                        sx={{
                            fontWeight: 800,
                            color: "text.primary",
                            lineHeight: 1.25,
                            maxWidth: 640,
                        }}
                    >
                        {t("hero.title")}
                    </Typography>
                    <Typography
                        component="p"
                        variant="h6"
                        sx={{
                            fontWeight: 600,
                            color: "text.primary",
                            lineHeight: 1.35,
                            maxWidth: 640,
                            mt: 1,
                            fontSize: { xs: "1rem", sm: "1.125rem" },
                        }}
                    >
                        {t("hero.subtitle")}
                    </Typography>
                    <Typography
                        variant="body1"
                        color="text.secondary"
                        sx={{ mt: 0.5, maxWidth: 560 }}
                    >
                        {t("hero.description")}
                    </Typography>
                    <MenuHeroCtas />
                </Box>
            </Box>

            <Suspense fallback={<MenuCatalogSkeleton />}>
                <MenuCatalogSection />
            </Suspense>
        </PageContainer>
    );
}
