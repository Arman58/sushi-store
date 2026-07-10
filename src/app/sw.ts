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

function isMenuPath(pathname: string): boolean {
    return pathname === "/menu" || /^\/(hy|en|ru)\/menu(\/?|$)/.test(pathname);
}

function isAdminPath(pathname: string): boolean {
    return pathname.startsWith("/admin") || pathname.startsWith("/api/admin");
}

function isSensitiveApiPath(pathname: string): boolean {
    return (
        pathname.startsWith("/api/order-status") ||
        pathname.startsWith("/api/order/") ||
        pathname === "/api/order" ||
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
        // Cross-origin images (Cloudinary, Unsplash) bypass SW: browser loads them
        // under img-src. SW fetch() would require connect-src on every deploy.
        matcher: ({ sameOrigin, request }) =>
            !(request.destination === "image" && !sameOrigin),
        method: "GET",
        handler: new NetworkOnly(),
    },
];

const serwist = new Serwist({
    precacheEntries: self.__SW_MANIFEST,
    skipWaiting: true,
    clientsClaim: true,
    navigationPreload: true,
    runtimeCaching: productionRuntimeCaching,
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
    let payload = { title: "East West Delivery", body: "", url: "/" };

    if (event.data) {
        try {
            const rawData = event.data.text();
            try {
                payload = { ...payload, ...JSON.parse(rawData) };
            } catch {
                payload.body = rawData;
            }
        } catch (e) {
            console.error("Failed to parse push event data:", e);
        }
    }

    event.waitUntil(
        (async () => {
            await self.registration.showNotification(payload.title, {
                body: payload.body,
                icon: "/pwa/icon-192x192.png",
                badge: "/pwa/icon-192x192.png",
                data: { url: payload.url },
            });

            // Открытые вкладки узнают о push сразу - трекер заказа
            // перезапрашивает статус мгновенно, не дожидаясь поллинга.
            const clientList = await self.clients.matchAll({
                type: "window",
                includeUncontrolled: true,
            });
            for (const client of clientList) {
                client.postMessage({
                    type: "ORDER_STATUS_PUSH",
                    url: payload.url,
                });
            }
        })(),
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
