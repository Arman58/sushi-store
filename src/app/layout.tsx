import "./globals.css";

import { AppRouterCacheProvider } from "@mui/material-nextjs/v16-appRouter";
import { SerwistProvider } from "@serwist/next/react";
import { Analytics } from "@vercel/analytics/next";
import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import { getLocale } from "next-intl/server";
import type { ReactNode } from "react";

import { routing } from "@/i18n/routing";
import { resolveAdminLocale } from "@/lib/admin-locale";
import { CSP_NONCE_HEADER } from "@/lib/csp";
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
import { resolveThemeMode } from "@/lib/theme-preference.server";

import { interFont } from "./fonts";
import { AppProviders } from "./providers";

const PWA_APP_NAME = "East West Delivery";

export const viewport: Viewport = {
    themeColor: [
        { media: "(prefers-color-scheme: light)", color: "#27AE60" },
        { media: "(prefers-color-scheme: dark)", color: "#0F1214" },
    ],
    viewportFit: "cover",
};

export const metadata: Metadata = {
    applicationName: PWA_APP_NAME,
    appleWebApp: {
        capable: true,
        statusBarStyle: "black-translucent",
        title: "East West",
        startupImage: [
            // iPhone 15 Pro Max, 16 Plus (1290×2796)
            {
                url: "/pwa/splash-1290x2796.png",
                media: "(device-width: 430px) and (device-height: 932px) and (-webkit-device-pixel-ratio: 3)",
            },
            // iPhone 14 Pro, 15, 16 (1179×2556)
            {
                url: "/pwa/splash-1179x2556.png",
                media: "(device-width: 393px) and (device-height: 852px) and (-webkit-device-pixel-ratio: 3)",
            },
            // iPhone 12/13/14, 15 (1170×2532)
            {
                url: "/pwa/splash-1170x2532.png",
                media: "(device-width: 390px) and (device-height: 844px) and (-webkit-device-pixel-ratio: 3)",
            },
            // iPhone X/XS/11 Pro (1125×2436)
            {
                url: "/pwa/splash-1125x2436.png",
                media: "(device-width: 375px) and (device-height: 812px) and (-webkit-device-pixel-ratio: 3)",
            },
            // iPhone SE/8 (750×1334)
            {
                url: "/pwa/splash-750x1334.png",
                media: "(device-width: 375px) and (device-height: 667px) and (-webkit-device-pixel-ratio: 2)",
            },
        ],
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
        apple: [
            { url: "/pwa/apple-touch-icon-180x180.png", sizes: "180x180" },
            { url: "/pwa/icon-192x192.png", sizes: "192x192" },
        ],
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
        locale = await resolveAdminLocale();
    }

    const themeMode = await resolveThemeMode();
    const headerStore = await headers();
    const nonce = headerStore.get(CSP_NONCE_HEADER) ?? undefined;

    return (
        <html
            lang={locale}
            className={interFont.variable}
            data-scroll-behavior="smooth"
            data-theme={themeMode}
            suppressHydrationWarning
        >
            <head>
                {/* Ранние соединения к CDN изображений - быстрее LCP */}
                <link rel="preconnect" href="https://res.cloudinary.com" />
                <link rel="preconnect" href="https://images.unsplash.com" />
                {nonce ? (
                    <meta
                        name="csp-nonce"
                        content={nonce}
                        suppressHydrationWarning
                    />
                ) : null}
            </head>
            <body
                suppressHydrationWarning
                className={interFont.className}
            >
                <JsonLd
                    data={[restaurantJsonLd(), foodDeliveryServiceJsonLd()]}
                />
                <AppRouterCacheProvider
                    options={{ enableCssLayer: true, nonce }}
                >
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
                        <AppProviders initialTheme={themeMode} nonce={nonce}>
                            {children}
                        </AppProviders>
                    </SerwistProvider>
                </AppRouterCacheProvider>
                <Analytics />
            </body>
        </html>
    );
}
