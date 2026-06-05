// src/app/menu/page.tsx
import Box from "@mui/material/Box";
import Chip from "@mui/material/Chip";
import Typography from "@mui/material/Typography";
import { alpha } from "@mui/material/styles";
import { cache } from "react";

import { prisma } from "@/lib/prisma";
import { tokens } from "@/shared/ui/theme";
import { PageContainer, SectionTitle } from "@/shared/ui";
import { CategoryScroll } from "@/widgets/home/category-scroll";
import { MenuSection } from "@/widgets/menu-section";

import { MenuHeroCtas } from "./menu-hero-ctas";

// Страница теперь может кешироваться и пересобирается раз в 60 секунд.
// Этого для меню более чем достаточно.
export const revalidate = 60;

const getMenuData = cache(async () => {
    const [categories, products] = await Promise.all([
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
            orderBy: { name: "asc" },
        }),
    ]);

    return { categories, products };
});

type MenuPageProps = {
    searchParams: Promise<{ category?: string }>;
};

export default async function MenuPage({ searchParams }: MenuPageProps) {
    const sp = await searchParams;
    const { categories, products } = await getMenuData();
    const validSlugs = new Set(["all", ...categories.map((c) => c.slug)]);
    const rawCategory = sp.category;
    const categoryActiveSlug =
        rawCategory && validSlugs.has(rawCategory) ? rawCategory : "all";

    return (
        <main>
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
                            label="Пик сезона — доставляем без задержек"
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
                            Выбирайте блюдо, пока мы греем печи и разогреваем вок.
                        </Typography>
                        <Typography
                            variant="body1"
                            color="text.secondary"
                            sx={{ mt: 0.5, maxWidth: 560 }}
                        >
                            Собрали популярное: роллы, пицца, шаурма, салаты и десерты.
                            Отсортируйте по цене, категории или начните с популярных
                            направлений.
                        </Typography>
                        <MenuHeroCtas />
                    </Box>

                    <Box sx={{ px: 2, pb: 2.5, pt: 0, position: "relative" }}>
                        <CategoryScroll
                            categories={categories}
                            activeSlug={categoryActiveSlug}
                        />
                    </Box>
                </Box>

                <SectionTitle subdued>Меню</SectionTitle>
                <MenuSection categories={categories} products={products} />
            </PageContainer>
        </main>
    );
}
