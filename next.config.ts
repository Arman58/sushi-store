// Serwist PWA: configurator mode via serwist.config.mjs + `serwist build` after `next build`.
// Avoids wrapping this file again and keeps Sentry + next-intl + Turbopack compatible.

import { withSentryConfig } from "@sentry/nextjs";
import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const ONE_YEAR_CACHE = "public, max-age=31536000, immutable";

const nextConfig: NextConfig = {
    images: {
        remotePatterns: [
            {
                protocol: "https",
                hostname: "res.cloudinary.com",
            },
            {
                protocol: "https",
                hostname: "images.unsplash.com",
            },
            {
                protocol: "https",
                hostname: "placehold.co",
            },
        ],
    },
    async headers() {
        return [
            {
                source: "/:path*\\.(woff2|woff|ttf|otf)",
                headers: [
                    {
                        key: "Cache-Control",
                        value: ONE_YEAR_CACHE,
                    },
                ],
            },
            {
                source: "/:path*\\.(jpg|jpeg|png|gif|webp|svg|ico|avif)",
                headers: [
                    {
                        key: "Cache-Control",
                        value: ONE_YEAR_CACHE,
                    },
                ],
            },
        ];
    },
};

const sentryWebpackPluginOptions = {
    org: process.env.SENTRY_ORG,
    project: process.env.SENTRY_PROJECT,
    authToken: process.env.SENTRY_AUTH_TOKEN,
    silent: !process.env.CI,
    sourcemaps: {
        disable: !process.env.SENTRY_AUTH_TOKEN,
    },
};

export default withSentryConfig(withNextIntl(nextConfig), sentryWebpackPluginOptions);
