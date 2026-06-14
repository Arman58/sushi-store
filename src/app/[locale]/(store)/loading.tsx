/**
 * Route-level loading UI — mirrors home Suspense fallbacks (hero + carousel + grid).
 */

import Box from "@mui/material/Box";
import Container from "@mui/material/Container";

import { HeroSectionSkeleton } from "@/widgets/home/skeletons/hero-section-skeleton";
import { PopularSectionSkeleton } from "@/widgets/home/skeletons/popular-section-skeleton";
import { PromoCarouselSkeleton } from "@/widgets/home/skeletons/promo-carousel-skeleton";

const sectionContainerSx = {
    maxWidth: "lg",
    px: { xs: 2, md: 6 },
} as const;

export default function RootLoading() {
    return (
        <>
            <Container
                maxWidth="lg"
                disableGutters
                sx={{ ...sectionContainerSx, px: { xs: 0, sm: 3, md: 6 } }}
            >
                <HeroSectionSkeleton />
            </Container>

            <Container sx={{ ...sectionContainerSx, mt: { xs: 3, md: 6 } }}>
                <PromoCarouselSkeleton />
            </Container>

            <Container sx={{ ...sectionContainerSx, mt: { xs: 3, md: 6 } }}>
                <PopularSectionSkeleton />
            </Container>

            <Box sx={{ height: { xs: 32, sm: 48, md: 64 } }} />
        </>
    );
}
