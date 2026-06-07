// src/app/layout.tsx
import "./globals.css";

import { AppRouterCacheProvider } from "@mui/material-nextjs/v13-appRouter";
import type { Metadata } from "next";
import type { ReactNode } from "react";

import { JsonLd, restaurantJsonLd } from "@/lib/seo/json-ld";
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
        default:
            "East West Delivery | Доставка суши, пиццы и шаурмы в Ереване и Котайке",
        template: "%s | East West Delivery",
    },
    description:
        "Быстрая доставка вкусной еды: суши, роллы, пицца, шаурма. Бесплатная доставка в Нор Ачин. Заказ онлайн за 1 минуту!",
    keywords: [
        "доставка еды",
        "пицца Котайк",
        "суши Ереван",
        "шаварма Нор Ачин",
        "доставка роллов",
        "восток вест доставка",
    ],
    robots: { index: true, follow: true },
    alternates: {
        canonical: "./",
    },
    icons: { icon: "/east-west-logo.png" },
    openGraph: {
        title: "East West Delivery | Доставка суши, пиццы и шаурмы в Ереване и Котайке",
        description:
            "Быстрая доставка вкусной еды: суши, роллы, пицца, шаурма. Бесплатная доставка в Нор Ачин. Заказ онлайн за 1 минуту!",
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
        title: "East West Delivery | Доставка суши, пиццы и шаурмы",
        description:
            "Быстрая доставка вкусной еды: суши, роллы, пицца, шаурма в Ереване и Котайке.",
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
                <JsonLd data={restaurantJsonLd()} />
                <AppRouterCacheProvider options={{ enableCssLayer: true }}>
                    <AppProviders>{children}</AppProviders>
                </AppRouterCacheProvider>
            </body>
        </html>
    );
}
