/// <reference lib="esnext" />
/// <reference lib="webworker" />

import { PAGES_CACHE_NAME } from "@serwist/next/worker";
import type { PrecacheEntry, RuntimeCaching, SerwistGlobalConfig } from "serwist";
import {
    CacheFirst,
    ExpirationPlugin,
    NetworkFirst,
    NetworkOnly,
    Serwist,
    StaleWhileRevalidate,
} from "serwist";

declare global {
    interface WorkerGlobalScope extends SerwistGlobalConfig {
        __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
    }
}

declare const self: ServiceWorkerGlobalScope;

const THIRTY_DAYS_SECONDS = 30 * 24 * 60 * 60;

const imageExpirationPlugins = [
    new ExpirationPlugin({
        maxEntries: 100,
        maxAgeSeconds: THIRTY_DAYS_SECONDS,
        maxAgeFrom: "last-used",
    }),
];

function isMenuPath(pathname: string): boolean {
    return pathname === "/menu" || /^\/(hy|en|ru)\/menu(\/?|$)/.test(pathname);
}

function isAdminPath(pathname: string): boolean {
    return pathname.startsWith("/admin") || pathname.startsWith("/api/admin");
}

function isSensitiveApiPath(pathname: string): boolean {
    return (
        pathname.startsWith("/api/order") ||
        pathname.startsWith("/api/auth") ||
        pathname.startsWith("/api/push") ||
        pathname.startsWith("/api/profile") ||
        pathname.startsWith("/api/validate-cart") ||
        pathname.startsWith("/api/validate-promo") ||
        pathname.startsWith("/api/admin/login") ||
        pathname.startsWith("/api/upload") ||
        pathname.startsWith("/api/telegram")
    );
}

function isMenuApiPath(pathname: string): boolean {
    return pathname.startsWith("/api/delivery-zones") || pathname.startsWith("/api/menu");
}

const productionRuntimeCaching: RuntimeCaching[] = [
    {
        matcher: ({ request }) => request.method !== "GET",
        handler: new NetworkOnly(),
    },
    {
        matcher: ({ url: { pathname }, sameOrigin }) =>
            sameOrigin && isAdminPath(pathname),
        handler: new NetworkOnly(),
    },
    {
        matcher: ({ url: { pathname }, sameOrigin }) =>
            sameOrigin && isSensitiveApiPath(pathname),
        handler: new NetworkOnly(),
    },
    {
        matcher: ({ url: { pathname }, sameOrigin, request }) =>
            sameOrigin && request.method === "GET" && isMenuApiPath(pathname),
        handler: new StaleWhileRevalidate({
            cacheName: "menu-api",
            plugins: [
                new ExpirationPlugin({
                    maxEntries: 16,
                    maxAgeSeconds: 24 * 60 * 60,
                    maxAgeFrom: "last-used",
                }),
            ],
        }),
    },
    {
        matcher: /^https:\/\/res\.cloudinary\.com\/.*/i,
        handler: new CacheFirst({
            cacheName: "cloudinary-images",
            plugins: imageExpirationPlugins,
        }),
    },
    {
        matcher: /^https:\/\/images\.unsplash\.com\/.*/i,
        handler: new CacheFirst({
            cacheName: "unsplash-images",
            plugins: imageExpirationPlugins,
        }),
    },
    {
        matcher: /\/_next\/static\/.+\.js$/i,
        handler: new CacheFirst({ cacheName: "next-static-js" }),
    },
    {
        matcher: /\/_next\/static\/.+\.css$/i,
        handler: new CacheFirst({ cacheName: "next-static-css" }),
    },
    {
        matcher: /\.(?:woff2|woff|ttf|otf|eot)$/i,
        handler: new CacheFirst({ cacheName: "static-fonts" }),
    },
    {
        matcher: ({ url: { pathname }, sameOrigin, request }) =>
            sameOrigin &&
            request.method === "GET" &&
            request.destination === "document" &&
            isMenuPath(pathname),
        handler: new StaleWhileRevalidate({
            cacheName: "menu-pages",
            plugins: [
                new ExpirationPlugin({
                    maxEntries: 8,
                    maxAgeSeconds: 7 * 24 * 60 * 60,
                    maxAgeFrom: "last-used",
                }),
            ],
        }),
    },
    {
        matcher: ({ request, url: { pathname }, sameOrigin }) =>
            request.headers.get("RSC") === "1" &&
            request.headers.get("Next-Router-Prefetch") === "1" &&
            sameOrigin &&
            !pathname.startsWith("/api/") &&
            !isAdminPath(pathname),
        handler: new NetworkFirst({
            cacheName: PAGES_CACHE_NAME.rscPrefetch,
            plugins: [
                new ExpirationPlugin({
                    maxEntries: 32,
                    maxAgeSeconds: 24 * 60 * 60,
                }),
            ],
        }),
    },
    {
        matcher: ({ request, url: { pathname }, sameOrigin }) =>
            request.headers.get("RSC") === "1" &&
            sameOrigin &&
            !pathname.startsWith("/api/") &&
            !isAdminPath(pathname),
        handler: new NetworkFirst({
            cacheName: PAGES_CACHE_NAME.rsc,
            plugins: [
                new ExpirationPlugin({
                    maxEntries: 32,
                    maxAgeSeconds: 24 * 60 * 60,
                }),
            ],
        }),
    },
    {
        matcher: ({ request, url: { pathname }, sameOrigin }) =>
            request.destination === "document" &&
            sameOrigin &&
            !pathname.startsWith("/api/") &&
            !isAdminPath(pathname),
        handler: new NetworkFirst({
            cacheName: PAGES_CACHE_NAME.html,
            plugins: [
                new ExpirationPlugin({
                    maxEntries: 32,
                    maxAgeSeconds: 24 * 60 * 60,
                }),
            ],
        }),
    },
    {
        matcher: ({ url: { pathname }, sameOrigin }) =>
            sameOrigin && !pathname.startsWith("/api/") && !isAdminPath(pathname),
        handler: new NetworkFirst({
            cacheName: "storefront-assets",
            plugins: [
                new ExpirationPlugin({
                    maxEntries: 32,
                    maxAgeSeconds: 24 * 60 * 60,
                }),
            ],
        }),
    },
    {
        matcher: /.*/i,
        method: "GET",
        handler: new NetworkOnly(),
    },
];

const serwist = new Serwist({
    precacheEntries: self.__SW_MANIFEST,
    skipWaiting: true,
    clientsClaim: true,
    navigationPreload: true,
    runtimeCaching:
        process.env.NODE_ENV !== "production"
            ? [{ matcher: /.*/i, handler: new NetworkOnly() }]
            : productionRuntimeCaching,
    fallbacks: {
        entries: [
            {
                url: "/offline",
                matcher({ request }) {
                    return request.mode === "navigate";
                },
            },
        ],
    },
});

self.addEventListener("push", (event: PushEvent) => {
    const data = (() => {
        try {
            return event.data?.json() as { title?: string; body?: string; url?: string } | undefined;
        } catch {
            return undefined;
        }
    })();

    const title = data?.title ?? "East West Delivery";
    const body = data?.body ?? "";
    const url = data?.url ?? "/";

    event.waitUntil(
        self.registration.showNotification(title, {
            body,
            icon: "/pwa/icon-192x192.png",
            badge: "/pwa/icon-192x192.png",
            data: { url },
        }),
    );
});

self.addEventListener("notificationclick", (event: NotificationEvent) => {
    event.notification.close();

    const rawUrl =
        event.notification.data &&
        typeof event.notification.data === "object" &&
        "url" in event.notification.data &&
        typeof event.notification.data.url === "string"
            ? event.notification.data.url
            : "/";

    const targetUrl = new URL(rawUrl, self.location.origin).href;

    event.waitUntil(
        self.clients
            .matchAll({ type: "window", includeUncontrolled: true })
            .then((clientList) => {
                for (const client of clientList) {
                    if (client.url.startsWith(targetUrl) && "focus" in client) {
                        return client.focus();
                    }
                }

                if (self.clients.openWindow) {
                    return self.clients.openWindow(targetUrl);
                }

                return undefined;
            }),
    );
});

serwist.addEventListeners();
