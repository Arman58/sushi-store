import Box from "@mui/material/Box";
import Chip from "@mui/material/Chip";
import { alpha } from "@mui/material/styles";
import Typography from "@mui/material/Typography";
import type { Metadata } from "next";
import { cache } from "react";

import { prisma } from "@/lib/prisma";
import { PageContainer } from "@/shared/ui";
import { tokens } from "@/shared/ui/theme";
import { CategoryScroll } from "@/widgets/home/category-scroll";
import { MenuSection } from "@/widgets/menu-section";

import { MenuHeroCtas } from "./menu-hero-ctas";

// Страница теперь может кешироваться и пересобирается раз в 60 секунд.
// Этого для меню более чем достаточно.
export const revalidate = 60;

const getMenuData = cache(async () => {
    try {
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
    } catch (error) {
        console.error("[menu] Database unavailable:", error);
        return { categories: [], products: [] };
    }
});

type MenuPageProps = {
    searchParams: Promise<{ category?: string }>;
};

export async function generateMetadata({
    searchParams,
}: MenuPageProps): Promise<Metadata> {
    const sp = await searchParams;
    const categorySlug = sp.category?.trim();

    if (categorySlug && categorySlug !== "all") {
        try {
            const category = await prisma.category.findFirst({
                where: { slug: categorySlug, isActive: true },
                select: { name: true, slug: true },
            });

            if (category) {
                const nameLower = category.name.toLowerCase();
                return {
                    title: `${category.name} с доставкой`,
                    description: `Закажите ${nameLower} с доставкой в Ереване и Котайке. Свежие блюда East West Delivery - быстро, горячо, до двери.`,
                    alternates: {
                        canonical: `/menu?category=${category.slug}`,
                    },
                };
            }
        } catch (error) {
            console.error("[menu metadata] Database unavailable:", error);
        }
    }

    return {
        title: {
            absolute: "Menu: Sushi, Pizza & Shawarma Delivery | East West Yerevan",
        },
        description:
            "Full menu of sushi, rolls, pizza and shawarma. Delivery to Nor Hachn, Yerevan and Kotayk region.",
        alternates: { canonical: "/menu" },
    };
}

export default async function MenuPage({ searchParams }: MenuPageProps) {
    const sp = await searchParams;
    const { categories, products } = await getMenuData();
    const validSlugs = new Set(["all", ...categories.map((c) => c.slug)]);
    const rawCategory = sp.category;
    const categoryActiveSlug =
        rawCategory && validSlugs.has(rawCategory) ? rawCategory : "all";

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
                            label="Пик сезона - доставляем без задержек"
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
                            Меню доставки
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

                <MenuSection categories={categories} products={products} />
        </PageContainer>
    );
}
