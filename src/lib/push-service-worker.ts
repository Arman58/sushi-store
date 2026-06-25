const SW_URL = "/sw.js";
const SW_READY_TIMEOUT_MS = 15_000;

export async function getServiceWorkerRegistration(): Promise<ServiceWorkerRegistration> {
    if (!("serviceWorker" in navigator)) {
        throw new Error("Service worker not supported");
    }

    let registration = await navigator.serviceWorker.getRegistration();
    if (!registration) {
        registration = await navigator.serviceWorker.register(SW_URL, { scope: "/" });
    }

    await Promise.race([
        navigator.serviceWorker.ready,
        new Promise<never>((_, reject) => {
            window.setTimeout(() => {
                reject(new Error("Service worker activation timeout"));
            }, SW_READY_TIMEOUT_MS);
        }),
    ]);

    return registration;
}
