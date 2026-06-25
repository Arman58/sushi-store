const SW_URL = "/sw.js";
const SW_READY_TIMEOUT_MS = 20_000;

function waitForActiveWorker(
    registration: ServiceWorkerRegistration,
    timeoutMs: number,
): Promise<ServiceWorkerRegistration> {
    if (registration.active) {
        return Promise.resolve(registration);
    }

    const waiting = registration.waiting;
    if (waiting) {
        waiting.postMessage({ type: "SKIP_WAITING" });
    }

    return new Promise((resolve, reject) => {
        const timeout = window.setTimeout(() => {
            reject(new Error("Service worker activation timeout"));
        }, timeoutMs);

        const finish = () => {
            window.clearTimeout(timeout);
            resolve(registration);
        };

        const onStateChange = (worker: ServiceWorker) => {
            if (worker.state === "activated" || registration.active) {
                finish();
            }
            if (worker.state === "redundant") {
                window.clearTimeout(timeout);
                reject(new Error("Service worker install failed"));
            }
        };

        const attach = (worker: ServiceWorker | null) => {
            if (!worker) return;
            if (worker.state === "activated" || registration.active) {
                finish();
                return;
            }
            worker.addEventListener("statechange", () => onStateChange(worker));
        };

        attach(registration.installing);
        attach(registration.waiting);

        if (!registration.installing && !registration.waiting) {
            void navigator.serviceWorker.ready.then(() => finish()).catch(reject);
        }
    });
}

async function registerServiceWorker(): Promise<ServiceWorkerRegistration> {
    try {
        return await navigator.serviceWorker.register(SW_URL, {
            scope: "/",
            updateViaCache: "none",
        });
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        if (
            message.includes("redirect") ||
            message.includes("Script URL") ||
            message.includes("cross-origin")
        ) {
            throw new Error(
                "Service worker blocked: open the site at www.eastwestnh.com instead of eastwestnh.com",
            );
        }
        throw error;
    }
}

export async function getServiceWorkerRegistration(): Promise<ServiceWorkerRegistration> {
    if (!("serviceWorker" in navigator)) {
        throw new Error("Service worker not supported");
    }

    let registration = await navigator.serviceWorker.getRegistration("/");

    if (!registration) {
        registration = await registerServiceWorker();
    } else if (!registration.active && !registration.installing && !registration.waiting) {
        await registration.unregister().catch(() => undefined);
        registration = await registerServiceWorker();
    }

    try {
        return await waitForActiveWorker(registration, SW_READY_TIMEOUT_MS);
    } catch {
        await registration.unregister().catch(() => undefined);
        const retryRegistration = await registerServiceWorker();
        return waitForActiveWorker(retryRegistration, SW_READY_TIMEOUT_MS);
    }
}
