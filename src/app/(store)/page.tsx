/**
 * Home page — Server Component.
 * Категории, баннеры и новинки из Prisma; Hero — статичный маркетинговый блок.
 */

import Box from "@mui/material/Box";
import Container from "@mui/material/Container";

import { buildHomeBannerSlides } from "@/lib/home-banner-slides";
import {
    homeProductInclude,
    mapProductToPopular,
} from "@/lib/home-product-include";
import { prisma } from "@/lib/prisma";
import { HeroSection } from "@/widgets/hero";
import { CategoryScroll } from "@/widgets/home/category-scroll";
import { BannerCarousel, PopularSection } from "@/widgets/home/lazy-home-widgets";

export const revalidate = 60;

export default async function HomePage() {
    const [categories, newProducts, activePromos, featuredProducts] =
        await Promise.all([
            prisma.category.findMany({
                where: {
                    isActive: true,
                    products: { some: { isActive: true } },
                },
                orderBy: { position: "asc" },
                select: { id: true, name: true, slug: true },
            }),
            prisma.product.findMany({
                where: { isActive: true },
                include: homeProductInclude,
                take: 6,
                orderBy: { id: "desc" },
            }),
            prisma.promoCode.findMany({
                where: { isActive: true },
                orderBy: { id: "desc" },
                take: 3,
            }),
            prisma.product.findMany({
                where: { isActive: true },
                include: homeProductInclude,
                orderBy: { price: "desc" },
                take: 3,
            }),
        ]);

    const bannerSlides = buildHomeBannerSlides(activePromos, featuredProducts);
    const newItems = newProducts.map(mapProductToPopular);

    return (
        <main>
            <Container maxWidth="lg" disableGutters sx={{ px: { sm: 3 } }}>
                <HeroSection />
            </Container>

            {categories.length > 0 && (
                <Container
                    maxWidth="lg"
                    sx={{ pt: { xs: 3.5, sm: 5 }, px: { xs: 2, sm: 3 } }}
                >
                    <CategoryScroll categories={categories} />
                </Container>
            )}

            <Container
                maxWidth="lg"
                sx={{ pt: { xs: 3.5, sm: 5 }, px: { xs: 2, sm: 3 } }}
            >
                <BannerCarousel slides={bannerSlides} />
            </Container>

            {newItems.length > 0 && (
                <Container
                    maxWidth="lg"
                    sx={{ pt: { xs: 4.5, sm: 6 }, px: { xs: 2, sm: 3 } }}
                >
                    <PopularSection
                        products={newItems}
                        prioritizeFirstImage
                        title="✨ Новинки"
                        badge="new"
                        seeAllHref="/menu"
                    />
                </Container>
            )}

            <Box sx={{ height: { xs: 48, sm: 80 } }} />
        </main>
    );
}
