/**
 * Home page — Server Component.
 * Категории, баннеры и новинки из Prisma; Hero — данные из БД и site-config.
 */

import Box from "@mui/material/Box";
import Container from "@mui/material/Container";
import type { Metadata } from "next";

import { fetchHeroPageData } from "@/lib/hero-data";
import { buildHomeBannerSlides } from "@/lib/home-banner-slides";
import {
    homeProductInclude,
    mapProductToPopular,
} from "@/lib/home-product-include";
import { prisma } from "@/lib/prisma";
import { getOpeningHoursBadge } from "@/lib/site-config";
import { HeroSection } from "@/widgets/hero";
import { CategoryScroll } from "@/widgets/home/category-scroll";
import { BannerCarousel, PopularSection } from "@/widgets/home/lazy-home-widgets";

export const revalidate = 60;

export const metadata: Metadata = {
    title: {
        absolute: "Доставка суши, пиццы и шаурмы | East West Delivery",
    },
    alternates: { canonical: "/" },
};

export default async function HomePage() {
    const logDbError = (scope: string) => (error: unknown) => {
        console.error(`[home] ${scope} unavailable:`, error);
    };

    const [
        categories,
        newProducts,
        activePromos,
        featuredProducts,
        heroData,
    ] = await Promise.all([
        prisma.category
            .findMany({
                where: {
                    isActive: true,
                    products: { some: { isActive: true } },
                },
                orderBy: { position: "asc" },
                select: { id: true, name: true, slug: true },
            })
            .catch((error) => {
                logDbError("categories")(error);
                return [];
            }),
        prisma.product
            .findMany({
                where: { isActive: true },
                include: homeProductInclude,
                take: 6,
                orderBy: { id: "desc" },
            })
            .catch((error) => {
                logDbError("newProducts")(error);
                return [];
            }),
        prisma.promoCode
            .findMany({
                where: { isActive: true },
                orderBy: { id: "desc" },
                take: 3,
            })
            .catch((error) => {
                logDbError("promos")(error);
                return [];
            }),
        prisma.product
            .findMany({
                where: { isActive: true },
                include: homeProductInclude,
                orderBy: { price: "desc" },
                take: 3,
            })
            .catch((error) => {
                logDbError("featuredProducts")(error);
                return [];
            }),
        fetchHeroPageData(),
    ]);

    const bannerSlides = buildHomeBannerSlides(activePromos, featuredProducts);
    const newItems = newProducts.map(mapProductToPopular);
    const openingHoursStat = getOpeningHoursBadge();

    return (
        <main>
            <Container maxWidth="lg" disableGutters sx={{ px: { sm: 3 } }}>
                <HeroSection
                    deliveryStat={heroData.deliveryStat}
                    openingHoursStat={openingHoursStat}
                    promo={heroData.promo}
                />
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
