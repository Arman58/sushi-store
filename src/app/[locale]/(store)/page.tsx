/**
 * Home page - Server Component with Streaming SSR via Suspense boundaries.
 */

import Box from "@mui/material/Box";
import Container from "@mui/material/Container";
import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { Suspense } from "react";

import { buildLocalizedMetadata } from "@/lib/seo/metadata";
import { HomeCategoryPillsSection } from "@/widgets/home/home-category-pills-section";
import {
    RecentlyViewedSection,
    WelcomePromoDrawer,
} from "@/widgets/home/home-client-islands";
import { HomeHeroSection } from "@/widgets/home/home-hero-section";
import { HomeNewArrivalsSection } from "@/widgets/home/home-new-arrivals-section";
import { FeaturesBlock } from "@/widgets/home/lazy-home-widgets";
import { PromoBannersSection } from "@/widgets/home/promo-banners-section";
import { CategoryPillsSkeleton } from "@/widgets/home/skeletons/category-pills-skeleton";
import { PopularSectionSkeleton } from "@/widgets/home/skeletons/popular-section-skeleton";
import { SeoText } from "@/widgets/seo-text";

export const revalidate = 60;

const sectionContainerSx = {
    maxWidth: "lg",
    px: { xs: 2, md: 6 },
} as const;

export async function generateMetadata(): Promise<Metadata> {
    const locale = await getLocale();
    const t = await getTranslations("metadata.home");

    return buildLocalizedMetadata({
        locale,
        href: "/",
        title: t("title"),
        description: t("description"),
        titleAbsolute: true,
    });
}

export default function HomePage() {
    return (
        <>
            <Container
                maxWidth="lg"
                disableGutters
                sx={{ ...sectionContainerSx, px: { xs: 0, sm: 3, md: 6 } }}
            >
                {/* No Suspense: LCP img must be in the initial HTML, not behind a skeleton. */}
                <HomeHeroSection />
            </Container>

            <Suspense fallback={null}>
                {/* No tall skeleton: empty banners would collapse 200px+ (CLS).
                    When banners exist they appear below hero with reserved aspect-ratio. */}
                <PromoBannersSection />
            </Suspense>

            <Suspense fallback={<CategoryPillsSkeleton />}>
                <HomeCategoryPillsSection />
            </Suspense>

            <Suspense fallback={
                <Container sx={{ ...sectionContainerSx, mt: { xs: 3, md: 6 } }}>
                    <PopularSectionSkeleton />
                </Container>
            }>
                <HomeNewArrivalsSection />
            </Suspense>

            <RecentlyViewedSection />

            <Container
                sx={{
                    ...sectionContainerSx,
                    mt: { xs: 3, md: 6 },
                    pb: { xs: 2, md: 4 },
                }}
            >
                <FeaturesBlock />
            </Container>

            <SeoText />

            <Box sx={{ height: { xs: 32, sm: 48, md: 64 } }} />

            <WelcomePromoDrawer />
        </>
    );
}
