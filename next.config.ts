// Serwist PWA: configurator mode via serwist.config.mjs + `serwist build` after `next build`.
// Avoids wrapping this file again and keeps Sentry + next-intl + Turbopack compatible.

import { withSentryConfig } from "@sentry/nextjs";
import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const ONE_YEAR_CACHE = "public, max-age=31536000, immutable";

/**
 * Базовые security-заголовки для всех ответов.
 * CSP выставляется динамически в proxy.ts (per-request nonce) — здесь его нет.
 */
const SECURITY_HEADERS = [
    // Запрет встраивания в iframe (кликджекинг, особенно /admin).
    { key: "X-Frame-Options", value: "DENY" },
    // Запрет MIME-sniffing.
    { key: "X-Content-Type-Options", value: "nosniff" },
    // HTTPS-only на 2 года, включая поддомены (www).
    {
        key: "Strict-Transport-Security",
        value: "max-age=63072000; includeSubDomains",
    },
    // Не отдаём полный URL (с query) на чужие origin-ы.
    { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
    // Явно отключаем ненужные браузерные API.
    {
        key: "Permissions-Policy",
        value: "camera=(), microphone=(), payment=(), usb=()",
    },
];

const nextConfig: NextConfig = {
    trailingSlash: false,
    // POST webhooks (Telegram) must not get 308 when the URL has a trailing slash.
    skipTrailingSlashRedirect: true,
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
                source: "/:path*",
                headers: SECURITY_HEADERS,
            },
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
