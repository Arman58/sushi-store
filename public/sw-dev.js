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
    try {
        if (event.data) payload = { ...payload, ...event.data.json() };
    } catch {
        /* не-JSON payload */
    }
    event.waitUntil(
        self.registration.showNotification(payload.title, {
            body: payload.body,
            icon: "/pwa/icon-192x192.png",
            badge: "/pwa/icon-192x192.png",
            data: { url: payload.url },
        }),
    );
});

self.addEventListener("notificationclick", (event) => {
    event.notification.close();
    const url =
        (event.notification.data && event.notification.data.url) || "/";
    event.waitUntil(
        self.clients
            .matchAll({ type: "window", includeUncontrolled: true })
            .then((clients) => {
                for (const client of clients) {
                    if ("focus" in client) {
                        client.navigate(url);
                        return client.focus();
                    }
                }
                return self.clients.openWindow(url);
            }),
    );
});
