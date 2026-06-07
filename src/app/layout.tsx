import "./globals.css";

import { AppRouterCacheProvider } from "@mui/material-nextjs/v13-appRouter";
import type { Metadata } from "next";
import type { ReactNode } from "react";

import {
    foodDeliveryServiceJsonLd,
    JsonLd,
    restaurantJsonLd,
} from "@/lib/seo/json-ld";
import {
    DEFAULT_OG_IMAGE,
    SITE_NAME,
    SITE_URL,
} from "@/lib/site-config";

import { interFont } from "./fonts";
import { AppProviders } from "./providers";

export const metadata: Metadata = {
    ...(SITE_URL ? { metadataBase: new URL(SITE_URL) } : {}),
    title: {
        default: "Sushi & Pizza Delivery in Yerevan & Nor Hachn | East West",
        template: "%s | East West Delivery",
    },
    description:
        "Best sushi, pizza and shawarma delivery in Yerevan, Nor Hachn and Kotayk. Fast 45 min delivery. Order online!",
    keywords: [
        "sushi yerevan",
        "sushi nor hachn",
        "pizza yerevan",
        "pizza nor hachn",
        "shawarma kotayk",
        "доставка еды Котайк",
        "доставка суши Ереван",
        "доставка пиццы Нор Ачин",
    ],
    robots: { index: true, follow: true },
    alternates: {
        canonical: "./",
    },
    icons: { icon: "/east-west-logo.png" },
    openGraph: {
        title: "Sushi & Pizza Delivery in Yerevan & Nor Hachn | East West",
        description:
            "Best sushi, pizza and shawarma delivery in Yerevan, Nor Hachn and Kotayk. Fast 45 min delivery. Order online!",
        url: SITE_URL,
        siteName: SITE_NAME,
        locale: "ru_RU",
        type: "website",
        images: [
            {
                url: DEFAULT_OG_IMAGE,
                width: 1200,
                height: 630,
                alt: "East West Delivery - суши, пицца и шаурма с доставкой",
            },
        ],
    },
    twitter: {
        card: "summary_large_image",
        title: "Sushi & Pizza Delivery in Yerevan & Nor Hachn | East West",
        description:
            "Best sushi, pizza and shawarma delivery in Yerevan, Nor Hachn and Kotayk. Fast 45 min delivery.",
        images: [DEFAULT_OG_IMAGE],
    },
};

export default function RootLayout({ children }: { children: ReactNode }) {
    return (
        <html
            lang="ru"
            className={interFont.variable}
            data-scroll-behavior="smooth"
        >
            <body
                suppressHydrationWarning
                className={interFont.className}
            >
                <JsonLd
                    data={[restaurantJsonLd(), foodDeliveryServiceJsonLd()]}
                />
                <AppRouterCacheProvider options={{ enableCssLayer: true }}>
                    <AppProviders>{children}</AppProviders>
                </AppRouterCacheProvider>
            </body>
        </html>
    );
}
