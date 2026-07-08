"use client";

import dynamic from "next/dynamic";

export const RecentlyViewedSection = dynamic(
    () =>
        import("@/widgets/home/recently-viewed-section").then(
            (m) => m.RecentlyViewedSection,
        ),
    { ssr: false },
);

export const WelcomePromoDrawer = dynamic(
    () =>
        import("@/widgets/home/welcome-promo-drawer").then(
            (m) => m.WelcomePromoDrawer,
        ),
    { ssr: false },
);
