"use client";

import { debugLog } from "@/lib/debug-log";
import { urlBase64ToUint8Array } from "@/lib/push-utils";

export const PUSH_SW_SCOPE = "/";
export const PUSH_SW_READY_TIMEOUT_MS = 10_000;

/** В dev — лёгкий sw-dev.js; в prod — Serwist sw.js (см. layout.tsx). */
export function getPushServiceWorkerUrl(): string {
    return process.env.NODE_ENV === "development" ? "/sw-dev.js" : "/sw.js";
}

export function isPushSupported(): boolean {
    return (
        typeof window !== "undefined" &&
        "serviceWorker" in navigator &&
        "PushManager" in window &&
        "Notification" in window
    );
}

export async function ensureServiceWorkerRegistration(): Promise<ServiceWorkerRegistration> {
    const existing = await navigator.serviceWorker.getRegistration(PUSH_SW_SCOPE);
    if (existing) {
        return existing;
    }

    debugLog("[PUSH] Registering service worker…");
    return navigator.serviceWorker.register(getPushServiceWorkerUrl(), {
        scope: PUSH_SW_SCOPE,
        updateViaCache: "none",
    });
}

export async function waitForServiceWorkerReady(
    timeoutMs = PUSH_SW_READY_TIMEOUT_MS,
): Promise<ServiceWorkerRegistration> {
    await ensureServiceWorkerRegistration();

    return Promise.race([
        navigator.serviceWorker.ready,
        new Promise<ServiceWorkerRegistration>((_, reject) => {
            window.setTimeout(() => reject(new Error("SW timeout")), timeoutMs);
        }),
    ]);
}

export async function getExistingPushSubscription(): Promise<PushSubscription | null> {
    if (!isPushSupported()) return null;

    const registration = await navigator.serviceWorker.getRegistration(PUSH_SW_SCOPE);
    if (!registration) return null;

    return registration.pushManager.getSubscription();
}

export async function subscribeToPush(
    vapidPublicKey: string,
    options?: { renew?: boolean },
): Promise<PushSubscription> {
    const registration = await waitForServiceWorkerReady();

    let subscription = await registration.pushManager.getSubscription();
    if (options?.renew && subscription) {
        await subscription.unsubscribe();
        subscription = null;
    }

    if (!subscription) {
        debugLog("[PUSH] Subscribing to push manager…");
        subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(vapidPublicKey) as BufferSource,
        });
        debugLog("[PUSH] Push subscription created:", subscription.endpoint);
    }

    return subscription;
}

export async function persistPushSubscription(
    subscription: PushSubscription,
): Promise<{ ok: true } | { ok: false; error: string }> {
    const subscriptionJson = subscription.toJSON();
    if (
        !subscriptionJson.endpoint ||
        !subscriptionJson.keys?.p256dh ||
        !subscriptionJson.keys?.auth
    ) {
        return { ok: false, error: "Invalid subscription" };
    }

    debugLog("[PUSH] Sending subscription to backend…");
    const response = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify(subscriptionJson),
    });

    let data: { error?: string } = {};
    try {
        data = (await response.json()) as { error?: string };
    } catch {
        console.warn("[PUSH] Backend response is not JSON, status:", response.status);
    }

    if (!response.ok) {
        return { ok: false, error: data.error ?? `HTTP ${response.status}` };
    }

    debugLog("[PUSH] Subscription saved successfully");
    return { ok: true };
}

/** Синхронизирует браузерную подписку с сервером (после reload / нового деплоя). */
export async function syncPushSubscriptionWithBackend(): Promise<
    "synced" | "none" | "error"
> {
    if (!isPushSupported()) return "none";
    if (Notification.permission !== "granted") return "none";

    const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY?.trim();
    if (!vapidPublicKey) return "error";

    try {
        const subscription = await getExistingPushSubscription();
        if (!subscription) return "none";

        const result = await persistPushSubscription(subscription);
        return result.ok ? "synced" : "error";
    } catch (error) {
        console.error("[PUSH] Sync failed:", error);
        return "error";
    }
}
