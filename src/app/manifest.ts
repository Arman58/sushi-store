import type { MetadataRoute } from "next";

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
                src: "/pwa/icon-192x192.png",
                sizes: "192x192",
                type: "image/png",
                purpose: "maskable",
            },
            {
                src: "/pwa/icon-512x512.png",
                sizes: "512x512",
                type: "image/png",
                purpose: "any",
            },
            {
                src: "/pwa/icon-512x512.png",
                sizes: "512x512",
                type: "image/png",
                purpose: "maskable",
            },
            {
                src: "/pwa/apple-touch-icon-180x180.png",
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
                        src: "/pwa/icon-192x192.png",
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
                        src: "/pwa/icon-192x192.png",
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
                        src: "/pwa/icon-192x192.png",
                        sizes: "192x192",
                        type: "image/png",
                    },
                ],
            },
        ],
    };
}
