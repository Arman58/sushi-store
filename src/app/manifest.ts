import type { MetadataRoute } from "next";

import { getCanonicalOrigin } from "@/lib/canonical-host";

export default function manifest(): MetadataRoute.Manifest {
    const canonicalOrigin = getCanonicalOrigin();

    return {
        name: "East West Delivery",
        short_name: "East West",
        description: "Sushi & Pizza delivery in Nor Hachn and Yerevan",
        start_url: canonicalOrigin ? `${canonicalOrigin}/` : "/",
        display: "standalone",
        background_color: "#ffffff",
        theme_color: "#00B341",
        orientation: "portrait",
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
            },
        ],
    };
}
