import "./globals.css";

import { AppRouterCacheProvider } from "@mui/material-nextjs/v13-appRouter";
import { SerwistProvider } from "@serwist/next/react";
import type { Metadata, Viewport } from "next";
import { getLocale } from "next-intl/server";
import type { ReactNode } from "react";

import { routing } from "@/i18n/routing";
import {
    foodDeliveryServiceJsonLd,
    JsonLd,
    restaurantJsonLd,
} from "@/lib/seo/json-ld";
import {
    DEFAULT_OG_IMAGE,
    SITE_LOGO_PATH,
    SITE_NAME,
    SITE_URL,
} from "@/lib/site-config";
import { THEME_INIT_SCRIPT } from "@/shared/ui/theme-mode-toggle";

import { interFont } from "./fonts";
import { AppProviders } from "./providers";

const PWA_APP_NAME = "East West Delivery";

export const viewport: Viewport = {
    themeColor: "#00B341",
    viewportFit: "cover",
};

export const metadata: Metadata = {
    applicationName: PWA_APP_NAME,
    appleWebApp: {
        capable: true,
        statusBarStyle: "default",
        title: "East West",
    },
    formatDetection: {
        telephone: false,
    },
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
    icons: {
        icon: SITE_LOGO_PATH,
        apple: "/pwa/icon-192x192.png",
    },
    openGraph: {
        title: "Sushi & Pizza Delivery in Yerevan & Nor Hachn | East West",
        description:
            "Best sushi, pizza and shawarma delivery in Yerevan, Nor Hachn and Kotayk. Fast 45 min delivery. Order online!",
        url: SITE_URL,
        siteName: SITE_NAME,
        locale: "hy_AM",
        type: "website",
        images: [
            {
                url: DEFAULT_OG_IMAGE,
                width: 1200,
                height: 630,
                alt: "East West Delivery - sushi, pizza and shawarma delivery",
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

export default async function RootLayout({ children }: { children: ReactNode }) {
    let locale: string = routing.defaultLocale;
    try {
        locale = await getLocale();
    } catch {
        // /admin и прочие маршруты без next-intl контекста
    }

    return (
        <html
            lang={locale}
            className={interFont.variable}
            data-scroll-behavior="smooth"
            data-theme="light"
            suppressHydrationWarning
        >
            <head>
                {/* Ранние соединения к CDN изображений - быстрее LCP */}
                <link rel="preconnect" href="https://res.cloudinary.com" />
                <link rel="preconnect" href="https://images.unsplash.com" />
                {/* Тема до первой отрисовки - без вспышки светлого фона */}
                <script
                    dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }}
                />
            </head>
            <body
                suppressHydrationWarning
                className={interFont.className}
            >
                <JsonLd
                    data={[restaurantJsonLd(), foodDeliveryServiceJsonLd()]}
                />
                <AppRouterCacheProvider options={{ enableCssLayer: true }}>
                    <SerwistProvider
                        // Dev-тест пушей: лёгкий sw-dev.js без precache
                        // (прод-sw.js падает в dev на precache /_next/static)
                        swUrl={
                            process.env.NODE_ENV === "development"
                                ? "/sw-dev.js"
                                : "/sw.js"
                        }
                        // SW отключён в dev (кэш мешает разработке);
                        // NEXT_PUBLIC_ENABLE_SW_DEV=1 - включить для теста пушей локально
                        disable={
                            process.env.NODE_ENV === "development" &&
                            process.env.NEXT_PUBLIC_ENABLE_SW_DEV !== "1"
                        }
                    >
                        <AppProviders>{children}</AppProviders>
                    </SerwistProvider>
                </AppRouterCacheProvider>
            </body>
        </html>
    );
}
