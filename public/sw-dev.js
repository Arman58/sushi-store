/**
 * DEV-ONLY service worker: только push-уведомления, без precache.
 * Используется при NEXT_PUBLIC_ENABLE_SW_DEV=1 (прод использует /sw.js).
 * Прод-сборка sw.js падает в dev на precache несуществующих /_next/static.
 */

self.addEventListener("install", () => {
    self.skipWaiting();
});

self.addEventListener("activate", (event) => {
    event.waitUntil(self.clients.claim());
});

self.addEventListener("push", (event) => {
    let payload = { title: "East West", body: "", url: "/" };
    
    if (event.data) {
        try {
            const rawData = event.data.text();
            try {
                payload = { ...payload, ...JSON.parse(rawData) };
            } catch {
                payload.body = rawData;
            }
        } catch (e) {
            console.error("Failed to extract push data:", e);
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

            // Уведомляем открытые вкладки - мгновенный refetch статуса заказа.
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

self.addEventListener("notificationclick", (event) => {
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
