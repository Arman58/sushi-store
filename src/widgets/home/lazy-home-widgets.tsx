"use client";

import dynamic from "next/dynamic";

export const PopularSection = dynamic(
    () => import("@/widgets/home/popular-section").then((m) => m.PopularSection),
    {
        loading: () => null,
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
