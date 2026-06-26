const SW_URL = "/sw.js";
const SW_SCOPE = "/";
export const SW_READY_TIMEOUT_MS = 10_000;

export function urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
}

function waitUntilServiceWorkerActive(
    registration: ServiceWorkerRegistration,
    timeoutMs: number,
): Promise<void> {
    if (registration.active) {
        return Promise.resolve();
    }

    return new Promise((resolve, reject) => {
        const timeoutId = window.setTimeout(() => {
            reject(new Error("SW_TIMEOUT"));
        }, timeoutMs);

        const finish = () => {
            window.clearTimeout(timeoutId);
            resolve();
        };

        const fail = (error: Error) => {
            window.clearTimeout(timeoutId);
            reject(error);
        };

        const watchWorker = (worker: ServiceWorker | null) => {
            if (!worker) return;

            if (worker.state === "activated" || registration.active) {
                finish();
                return;
            }

            worker.addEventListener("statechange", () => {
                if (worker.state === "activated" || registration.active) {
                    finish();
                } else if (worker.state === "redundant") {
                    fail(new Error("SW install failed"));
                }
            });
        };

        if (registration.waiting) {
            registration.waiting.postMessage({ type: "SKIP_WAITING" });
        }

        watchWorker(registration.installing);
        watchWorker(registration.waiting);

        registration.addEventListener("updatefound", () => {
            watchWorker(registration.installing);
        });

        if (!registration.installing && !registration.waiting) {
            void navigator.serviceWorker.ready
                .then(() => finish())
                .catch((error: unknown) => {
                    fail(error instanceof Error ? error : new Error(String(error)));
                });
        }
    });
}

/** Регистрация SW + navigator.serviceWorker.ready с таймаутом (для push-подписки). */
export async function getServiceWorkerRegistrationForPush(
    timeoutMs = SW_READY_TIMEOUT_MS,
): Promise<ServiceWorkerRegistration> {
    if (!("serviceWorker" in navigator)) {
        throw new Error("Service worker not supported");
    }

    console.log("[PUSH] Registering service worker at", SW_URL);

    await navigator.serviceWorker.register(SW_URL, {
        scope: SW_SCOPE,
        updateViaCache: "none",
    });

    const registration = await Promise.race([
        navigator.serviceWorker.ready,
        new Promise<ServiceWorkerRegistration>((_, reject) => {
            window.setTimeout(() => {
                reject(new Error("SW_TIMEOUT"));
            }, timeoutMs);
        }),
    ]);

    console.log("[PUSH] Service worker ready, scope:", registration.scope);
    return registration;
}

/** Регистрация + ожидание active worker (не только navigator.serviceWorker.ready). */
export async function getPushServiceWorkerRegistration(): Promise<ServiceWorkerRegistration> {
    if (!("serviceWorker" in navigator)) {
        throw new Error("Service worker not supported");
    }

    let registration = await navigator.serviceWorker.getRegistration(SW_SCOPE);

    if (!registration) {
        registration = await navigator.serviceWorker.register(SW_URL, {
            scope: SW_SCOPE,
            updateViaCache: "none",
        });
    }

    if (registration.active) {
        return registration;
    }

    try {
        await waitUntilServiceWorkerActive(registration, SW_READY_TIMEOUT_MS * 3);
        return registration;
    } catch {
        await registration.unregister().catch(() => undefined);

        const freshRegistration = await navigator.serviceWorker.register(SW_URL, {
            scope: SW_SCOPE,
            updateViaCache: "none",
        });

        await waitUntilServiceWorkerActive(freshRegistration, SW_READY_TIMEOUT_MS * 3);
        return freshRegistration;
    }
}

/** @deprecated Use getServiceWorkerRegistrationForPush */
export async function waitForServiceWorkerReady(
    timeoutMs = SW_READY_TIMEOUT_MS,
): Promise<ServiceWorkerRegistration> {
    return getServiceWorkerRegistrationForPush(timeoutMs);
}

/** Прогрев SW при загрузке приложения — к моменту клика worker уже active. */
export function warmUpPushServiceWorker(): void {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;

    console.log("[PUSH] Warming up service worker…");
    void getPushServiceWorkerRegistration()
        .then((registration) => {
            console.log("[PUSH] Service worker warmup complete, scope:", registration.scope);
        })
        .catch((error: unknown) => {
            console.warn("[PUSH] Service worker warmup failed:", error);
        });
}
