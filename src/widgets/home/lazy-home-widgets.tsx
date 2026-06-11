"use client";

import Box from "@mui/material/Box";
import dynamic from "next/dynamic";

import { tokens } from "@/shared/ui/theme";

function HeroSectionFallback() {
    return (
        <Box
            sx={{
                mb: { xs: 0, sm: 4 },
                borderRadius: { xs: 0, sm: "24px" },
                minHeight: { xs: 380, sm: 420, md: 460 },
                bgcolor: tokens.surface,
                border: `1px solid ${tokens.border}`,
            }}
        />
    );
}

export const HeroSection = dynamic(
    () =>
        import("@/widgets/hero/hero-section").then((m) => m.HeroSection),
    {
        ssr: true,
        loading: () => <HeroSectionFallback />,
    },
);

export const PopularSection = dynamic(
    () => import("@/widgets/home/popular-section").then((m) => m.PopularSection),
    {
        loading: () => null,
        ssr: false,
    },
);

export const PromoCarousel = dynamic(
    () =>
        import("@/widgets/promo-carousel").then((m) => m.PromoCarousel),
    { ssr: false },
);

export const FeaturesBlock = dynamic(
    () =>
        import("@/widgets/features-block").then((m) => m.FeaturesBlock),
    { ssr: false },
);

export const CategoryScroll = dynamic(
    () =>
        import("@/widgets/home/category-scroll").then(
            (m) => m.CategoryScroll,
        ),
    { ssr: false, loading: () => null },
);
