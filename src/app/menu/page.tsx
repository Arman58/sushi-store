// src/app/menu/page.tsx
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { cache } from "react";

import { prisma } from "@/lib/prisma";
import { PageContainer, SectionTitle } from "@/shared/ui";
import { CategoryScroll } from "@/widgets/home/category-scroll";
import { MenuSection } from "@/widgets/menu-section";

// Страница теперь может кешироваться и пересобирается раз в 60 секунд.
// Этого для меню более чем достаточно.
export const revalidate = 60;

const getMenuData = cache(async () => {
    const [categories, products] = await Promise.all([
        prisma.category.findMany({ orderBy: { name: "asc" } }),
        prisma.product.findMany({
            where: { isActive: true },
            include: { category: true },
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
                        p: { xs: 2.5, md: 3 },
                        borderRadius: 4,
                        overflow: "hidden",
                        position: "relative",
                        border: "1px solid rgba(15,23,42,0.08)",
                        bgcolor:
                            "linear-gradient(135deg, rgba(249,115,22,0.08), rgba(255,255,255,0.9) 45%, rgba(15,23,42,0.02))",
                    }}
                >
                    <Box
                        sx={{
                            position: "absolute",
                            inset: 0,
                            pointerEvents: "none",
                            background:
                                "radial-gradient(circle at 15% 30%, rgba(249,115,22,0.18), transparent 32%), radial-gradient(circle at 85% 20%, rgba(250,204,21,0.16), transparent 30%)",
                            opacity: 0.9,
                        }}
                    />

                    <Stack
                        direction={{ xs: "column", md: "row" }}
                        spacing={2}
                        alignItems={{ xs: "flex-start", md: "center" }}
                        justifyContent="space-between"
                        sx={{ position: "relative", mb: 3 }}
                    >
                        <Box sx={{ maxWidth: 640 }}>
                            <Chip
                                label="Пик сезона — доставляем без задержек"
                                size="small"
                                sx={{
                                    mb: 1.5,
                                    borderRadius: 999,
                                    bgcolor: "rgba(15,23,42,0.06)",
                                    fontWeight: 600,
                                }}
                            />
                            <Typography
                                component="p"
                                sx={{
                                    fontWeight: 700,
                                    letterSpacing: -0.2,
                                    lineHeight: 1.35,
                                    mb: 1,
                                    fontSize: "1.25rem",
                                    color: "text.secondary",
                                }}
                            >
                                Выбирайте блюдо, пока мы греем печи и разогреваем вок.
                            </Typography>
                            <Typography
                                variant="body1"
                                color="text.secondary"
                                sx={{ maxWidth: 560 }}
                            >
                                Собрали популярное: роллы, пицца, шаурма, салаты и десерты.
                                Отсортируйте по цене, категории или начните с популярных
                                направлений.
                            </Typography>
                        </Box>

                        <Stack spacing={1} direction={{ xs: "column", sm: "row" }}>
                            <Button
                                variant="outlined"
                                href="/order-status"
                                sx={{
                                    borderRadius: 3,
                                    borderColor: "#e0e0e0",
                                    textTransform: "none",
                                    px: 3,
                                    py: 1.2,
                                }}
                            >
                                Проверить заказ
                            </Button>
                            <Button
                                variant="outlined"
                                href="tel:+37400000000"
                                sx={{
                                    borderRadius: 3,
                                    borderColor: "#e0e0e0",
                                    textTransform: "none",
                                    px: 3,
                                    py: 1.2,
                                }}
                            >
                                Позвонить оператору
                            </Button>
                        </Stack>
                    </Stack>

                    <Box sx={{ mt: 2.5, position: "relative" }}>
                        <CategoryScroll
                            categories={categories}
                            activeSlug={categoryActiveSlug}
                        />
                    </Box>
                </Box>

                <SectionTitle>Меню</SectionTitle>
                <MenuSection categories={categories} products={products} />
            </PageContainer>
        </main>
    );
}
