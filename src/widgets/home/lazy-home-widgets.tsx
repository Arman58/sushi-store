"use client";

import dynamic from "next/dynamic";
import Box from "@mui/material/Box";

export const PopularSection = dynamic(
    () => import("@/widgets/home/popular-section").then((m) => m.PopularSection),
    {
        loading: () => <Box sx={{ height: 300 }} />,
        ssr: false,
    },
);

export const BannerCarousel = dynamic(
    () =>
        import("@/widgets/home/promo-banner-carousel").then(
            (m) => m.PromoBannerCarousel,
        ),
    { ssr: false },
);
