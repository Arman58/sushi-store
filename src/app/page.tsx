/**
 * Home page — Server Component.
 * Fetches categories + products from Prisma, renders static hero,
 * then passes data to client widgets (CategoryScroll, PopularSection).
 */

import Box from "@mui/material/Box";
import Container from "@mui/material/Container";
import Stack from "@mui/material/Stack";

import { prisma } from "@/lib/prisma";
import { HeroSection } from "@/widgets/hero";
import { CategoryScroll } from "@/widgets/home/category-scroll";
import { PopularSection } from "@/widgets/home/popular-section";

export const revalidate = 60;

export default async function HomePage() {
    const [categories, allProducts] = await Promise.all([
        prisma.category.findMany({ orderBy: { name: "asc" } }),
        prisma.product.findMany({
            where: { isActive: true },
            include: { category: true },
            orderBy: { createdAt: "desc" },
            take: 24,
        }),
    ]);

    const popular  = allProducts.slice(0, 8);
    const newItems = allProducts.slice(8, 16);

    const byCat = categories
        .map((cat) => ({
            ...cat,
            products: allProducts
                .filter((p) => p.categoryId === cat.id)
                .slice(0, 4),
        }))
        .filter((c) => c.products.length > 0)
        .slice(0, 3);

    return (
        <main>
            {/* ── HERO — full-bleed cinematic block ── */}
            <Container maxWidth="lg" disableGutters sx={{ px: { sm: 3 } }}>
                <HeroSection />
            </Container>

            {/* ── CATEGORIES — horizontal pill scroll ── */}
            <Container
                maxWidth="lg"
                sx={{ pt: { xs: 3.5, sm: 5 }, px: { xs: 2, sm: 3 } }}
            >
                <CategoryScroll categories={categories} />
            </Container>

            {/* ── POPULAR — high-conversion first fold ── */}
            <Container
                maxWidth="lg"
                sx={{ pt: { xs: 4.5, sm: 6 }, px: { xs: 2, sm: 3 } }}
            >
                <PopularSection
                    products={popular}
                    title="🔥 Популярное"
                    badge="hit"
                    seeAllHref="/menu"
                />
            </Container>

            {/* ── NEW ITEMS ── */}
            {newItems.length > 0 && (
                <Container
                    maxWidth="lg"
                    sx={{ pt: { xs: 5, sm: 7 }, px: { xs: 2, sm: 3 } }}
                >
                    <PopularSection
                        products={newItems}
                        title="✨ Новинки"
                        badge="new"
                        seeAllHref="/menu"
                    />
                </Container>
            )}

            {/* ── CATEGORY SECTIONS ── */}
            {byCat.length > 0 && (
                <Container
                    maxWidth="lg"
                    sx={{ pt: { xs: 5, sm: 7 }, px: { xs: 2, sm: 3 } }}
                >
                    <Stack spacing={{ xs: 6, sm: 8 }}>
                        {byCat.map((cat) => (
                            <PopularSection
                                key={cat.id}
                                products={cat.products}
                                title={cat.name}
                                seeAllHref={`/menu?category=${cat.slug}`}
                            />
                        ))}
                    </Stack>
                </Container>
            )}

            {/* Bottom breathing room */}
            <Box sx={{ height: { xs: 48, sm: 80 } }} />
        </main>
    );
}
