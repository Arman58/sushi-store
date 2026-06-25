import type { OrderStatus } from "@prisma/client";
import webpush from "web-push";

import { orderStatusLabel } from "@/lib/order-status";
import { prisma } from "@/lib/prisma";

export type PushNotificationPayload = {
    title: string;
    body: string;
    url: string;
};

const PUSH_NOTIFY_STATUSES: OrderStatus[] = ["COOKING", "DELIVERING", "DONE"];

let vapidConfigured = false;

function getVapidSubject(): string {
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim();
    if (siteUrl) {
        try {
            return new URL(siteUrl).origin;
        } catch {
            /* fall through */
        }
    }
    return "mailto:noreply@eastwestnh.com";
}

function ensureVapidConfigured(): boolean {
    if (vapidConfigured) return true;

    const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY?.trim();
    const privateKey = process.env.VAPID_PRIVATE_KEY?.trim();
    if (!publicKey || !privateKey) {
        return false;
    }

    webpush.setVapidDetails(getVapidSubject(), publicKey, privateKey);
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
    if (!ensureVapidConfigured()) return;

    const subscriptions = await prisma.pushSubscription.findMany({
        where: { userId },
        select: { id: true, endpoint: true, keys: true },
    });

    if (subscriptions.length === 0) return;

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
            } catch (error) {
                const statusCode =
                    error &&
                    typeof error === "object" &&
                    "statusCode" in error &&
                    typeof (error as { statusCode?: unknown }).statusCode === "number"
                        ? (error as { statusCode: number }).statusCode
                        : null;

                if (statusCode === 410 || statusCode === 404) {
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
        select: {
            id: true,
            userId: true,
            user: { select: { emailVerified: true } },
        },
    });

    if (!order?.userId || order.user?.emailVerified == null) return;

    await sendPushNotification(order.userId, {
        title: `Заказ #${order.id}`,
        body: `Статус: ${orderStatusLabel(status)}`,
        url: `/order/${order.id}`,
    });
}
