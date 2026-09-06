import type { MetadataRoute } from "next";

import {
    PWA_APPLE_TOUCH_ICON,
    PWA_ICON_192,
    PWA_ICON_512,
} from "@/shared/lib/pwa-install";

export default function manifest(): MetadataRoute.Manifest {
    return {
        name: "East West Delivery",
        short_name: "East West",
        description: "Sushi & Pizza delivery in Nor Hachn and Yerevan",
        start_url: "/",
        scope: "/",
        display: "standalone",
        background_color: "#ffffff",
        theme_color: "#27AE60",
        orientation: "portrait",
        categories: ["food"],
        icons: [
            {
                src: PWA_ICON_192,
                sizes: "192x192",
                type: "image/png",
                purpose: "maskable",
            },
            {
                src: PWA_ICON_512,
                sizes: "512x512",
                type: "image/png",
                purpose: "any",
            },
            {
                src: PWA_ICON_512,
                sizes: "512x512",
                type: "image/png",
                purpose: "maskable",
            },
            {
                src: PWA_APPLE_TOUCH_ICON,
                sizes: "180x180",
                type: "image/png",
            },
        ],
        // Locale-agnostic paths: next-intl `as-needed` redirects to the user's locale.
        shortcuts: [
            {
                name: "Меню",
                short_name: "Меню",
                url: "/menu",
                icons: [
                    {
                        src: PWA_ICON_192,
                        sizes: "192x192",
                        type: "image/png",
                    },
                ],
            },
            {
                name: "Мои заказы",
                short_name: "Заказы",
                url: "/profile",
                icons: [
                    {
                        src: PWA_ICON_192,
                        sizes: "192x192",
                        type: "image/png",
                    },
                ],
            },
            {
                name: "Контакты",
                short_name: "Контакты",
                url: "/contacts",
                icons: [
                    {
                        src: PWA_ICON_192,
                        sizes: "192x192",
                        type: "image/png",
                    },
                ],
            },
        ],
    };
}
