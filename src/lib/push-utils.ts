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

const SW_READY_TIMEOUT_MS = 10_000;

export async function waitForServiceWorkerReady(
    timeoutMs = SW_READY_TIMEOUT_MS,
): Promise<ServiceWorkerRegistration> {
    if (!("serviceWorker" in navigator)) {
        throw new Error("Service worker not supported");
    }

    let registration = await navigator.serviceWorker.getRegistration("/");
    if (!registration) {
        registration = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
    }

    await Promise.race([
        navigator.serviceWorker.ready,
        new Promise<never>((_, reject) => {
            window.setTimeout(() => {
                reject(new Error("SW_TIMEOUT"));
            }, timeoutMs);
        }),
    ]);

    return registration;
}
