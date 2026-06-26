const SW_URL = "/sw.js";
const SW_SCOPE = "/";
const ACTIVATION_TIMEOUT_MS = 30_000;

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
        await waitUntilServiceWorkerActive(registration, ACTIVATION_TIMEOUT_MS);
        return registration;
    } catch {
        await registration.unregister().catch(() => undefined);

        const freshRegistration = await navigator.serviceWorker.register(SW_URL, {
            scope: SW_SCOPE,
            updateViaCache: "none",
        });

        await waitUntilServiceWorkerActive(freshRegistration, ACTIVATION_TIMEOUT_MS);
        return freshRegistration;
    }
}

/** @deprecated Use getPushServiceWorkerRegistration */
export async function waitForServiceWorkerReady(
    timeoutMs = ACTIVATION_TIMEOUT_MS,
): Promise<ServiceWorkerRegistration> {
    const registration = await getPushServiceWorkerRegistration();
    if (!registration.active) {
        await waitUntilServiceWorkerActive(registration, timeoutMs);
    }
    return registration;
}

/** Прогрев SW при загрузке приложения — к моменту клика worker уже active. */
export function warmUpPushServiceWorker(): void {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;

    void getPushServiceWorkerRegistration().catch((error: unknown) => {
        console.warn("[PUSH] Service worker warmup failed:", error);
    });
}
