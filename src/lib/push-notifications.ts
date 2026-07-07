import type { OrderStatus } from "@prisma/client";
import webpush from "web-push";

import {
    getPushOrderStatusCopy,
    orderPagePath,
} from "@/lib/backend-i18n";
import { debugLog } from "@/lib/debug-log";
import { prisma } from "@/lib/prisma";
import { getVapidSubject } from "@/lib/push-vapid";

export type PushNotificationPayload = {
    title: string;
    body: string;
    url: string;
};

const PUSH_NOTIFY_STATUSES: OrderStatus[] = ["COOKING", "DELIVERING", "DONE"];

let vapidConfigured = false;

function ensureVapidConfigured(): boolean {
    if (vapidConfigured) return true;

    const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY?.trim();
    const privateKey = process.env.VAPID_PRIVATE_KEY?.trim();
    if (!publicKey || !privateKey) {
        return false;
    }

    webpush.setVapidDetails(
        getVapidSubject(),
        publicKey,
        privateKey,
    );
    vapidConfigured = true;
    return true;
}

type StoredPushKeys = {
    p256dh: string;
    auth: string;
};

function toWebPushSubscription(
    endpoint: string,
    keys: StoredPushKeys,
): webpush.PushSubscription {
    return {
        endpoint,
        keys: {
            p256dh: keys.p256dh,
            auth: keys.auth,
        },
    };
}

export async function sendPushNotification(
    userId: number,
    payload: PushNotificationPayload,
): Promise<void> {
    if (!ensureVapidConfigured()) {
        console.error("[PUSH] VAPID not configured, skipping send for user:", userId);
        return;
    }

    const subscriptions = await prisma.pushSubscription.findMany({
        where: { userId },
        select: { id: true, endpoint: true, keys: true },
    });

    if (subscriptions.length === 0) {
        debugLog("[PUSH] No subscriptions for user:", userId);
        return;
    }

    debugLog(
        "[PUSH] Sending notification to user:",
        userId,
        "subscriptions:",
        subscriptions.length,
        "payload:",
        payload.title,
    );

    const message = JSON.stringify(payload);

    await Promise.all(
        subscriptions.map(async (subscription) => {
            const keys = subscription.keys as StoredPushKeys;
            if (
                !keys ||
                typeof keys.p256dh !== "string" ||
                typeof keys.auth !== "string"
            ) {
                return;
            }

            try {
                await webpush.sendNotification(
                    toWebPushSubscription(subscription.endpoint, keys),
                    message,
                );
                debugLog("[PUSH] Sent to subscription:", subscription.id);
            } catch (error) {
                const statusCode =
                    error &&
                    typeof error === "object" &&
                    "statusCode" in error &&
                    typeof (error as { statusCode?: unknown }).statusCode === "number"
                        ? (error as { statusCode: number }).statusCode
                        : null;

                if (
                    statusCode === 410 ||
                    statusCode === 404 ||
                    statusCode === 401 ||
                    statusCode === 403
                ) {
                    debugLog(
                        "[PUSH] Removing dead subscription:",
                        subscription.id,
                        "status:",
                        statusCode,
                    );
                    await prisma.pushSubscription
                        .delete({ where: { id: subscription.id } })
                        .catch(() => undefined);
                    return;
                }

                console.error("[PUSH ERROR]", error);
            }
        }),
    );
}

export async function notifyOrderStatusPush(
    orderId: number,
    status: OrderStatus,
): Promise<void> {
    if (!PUSH_NOTIFY_STATUSES.includes(status)) return;

    const order = await prisma.order.findUnique({
        where: { id: orderId },
        select: { id: true, userId: true, locale: true },
    });

    // Подписка на пуши - самостоятельное согласие; emailVerified не требуем
    // (Lazy Verification: почти у всех пользователей email не подтверждён,
    // из-за этого условия пуши не уходили никому).
    if (!order?.userId) return;

    const message = getPushOrderStatusCopy(status, order.id, order.locale);
    const url = orderPagePath(order.id, order.locale);

    await sendPushNotification(order.userId, { ...message, url });
}
