"use client";

import dynamic from "next/dynamic";

export const FeaturesBlock = dynamic(
    () =>
        import("@/widgets/features-block").then((m) => m.FeaturesBlock),
    { ssr: false },
);
