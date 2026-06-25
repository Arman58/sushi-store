"use client";

import NotificationsActiveOutlinedIcon from "@mui/icons-material/NotificationsActiveOutlined";
import Alert from "@mui/material/Alert";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";

import { getServiceWorkerRegistration } from "@/lib/push-service-worker";
import { showAppToast } from "@/shared/lib/show-app-toast";
import { AppButton } from "@/shared/ui";

type PushPermissionState = "idle" | "loading" | "subscribed" | "denied" | "unsupported";

function urlBase64ToUint8Array(base64String: string): BufferSource {
    const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
    const rawData = window.atob(base64);
    return Uint8Array.from([...rawData], (char) => char.charCodeAt(0));
}

function isPushSupported(): boolean {
    return (
        typeof window !== "undefined" &&
        "serviceWorker" in navigator &&
        "PushManager" in window &&
        "Notification" in window
    );
}

export function PushPermissionPrompt() {
    const t = useTranslations("profile.push");
    const [state, setState] = useState<PushPermissionState>(() =>
        isPushSupported() ? "idle" : "unsupported",
    );

    useEffect(() => {
        if (!isPushSupported()) return;

        let cancelled = false;

        void (async () => {
            try {
                const registration = await getServiceWorkerRegistration();
                const existing = await registration.pushManager.getSubscription();
                if (cancelled) return;

                if (existing) {
                    setState("subscribed");
                    return;
                }

                if (Notification.permission === "denied") {
                    setState("denied");
                }
            } catch {
                /* keep idle */
            }
        })();

        return () => {
            cancelled = true;
        };
    }, []);

    const handleEnablePush = async () => {
        if (!isPushSupported()) {
            setState("unsupported");
            return;
        }

        const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY?.trim();
        if (!vapidPublicKey) {
            setState("unsupported");
            showAppToast(t("unsupported"), "error");
            return;
        }

        setState("loading");

        try {
            const permission = await Notification.requestPermission();
            if (permission !== "granted") {
                setState("denied");
                showAppToast(t("denied"), "error");
                return;
            }

            const registration = await getServiceWorkerRegistration();
            let subscription = await registration.pushManager.getSubscription();

            if (!subscription) {
                subscription = await registration.pushManager.subscribe({
                    userVisibleOnly: true,
                    applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
                });
            }

            const subscriptionJson = subscription.toJSON();
            if (
                !subscriptionJson.endpoint ||
                !subscriptionJson.keys?.p256dh ||
                !subscriptionJson.keys?.auth
            ) {
                setState("denied");
                showAppToast(t("denied"), "error");
                return;
            }

            try {
                const res = await fetch("/api/push/subscribe", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    credentials: "same-origin",
                    body: JSON.stringify({
                        endpoint: subscriptionJson.endpoint,
                        keys: {
                            p256dh: subscriptionJson.keys.p256dh,
                            auth: subscriptionJson.keys.auth,
                        },
                    }),
                });

                if (!res.ok) {
                    console.error("[PUSH SUBSCRIBE] Backend error:", res.status);
                }
            } catch (error) {
                console.error("[PUSH SUBSCRIBE] Network error:", error);
            }

            setState("subscribed");
            showAppToast(t("enabled"));
        } catch (error) {
            console.error("[PUSH SUBSCRIBE] Client error:", error);
            setState("denied");
            showAppToast(t("denied"), "error");
        }
    };

    if (state === "unsupported") {
        return (
            <Alert severity="info" sx={{ mb: 3 }}>
                {t("unsupported")}
            </Alert>
        );
    }

    if (state === "subscribed") {
        return (
            <Alert severity="success" icon={<NotificationsActiveOutlinedIcon />} sx={{ mb: 3 }}>
                {t("enabled")}
            </Alert>
        );
    }

    if (state === "denied") {
        return (
            <Alert severity="warning" sx={{ mb: 3 }}>
                {t("denied")}
            </Alert>
        );
    }

    return (
        <Stack
            direction={{ xs: "column", sm: "row" }}
            spacing={2}
            alignItems={{ sm: "center" }}
            sx={{
                mb: 3,
                p: 2,
                borderRadius: 2,
                border: "1px solid",
                borderColor: "divider",
                bgcolor: "background.paper",
            }}
        >
            <Stack spacing={0.5} sx={{ flex: 1 }}>
                <Typography variant="subtitle2" fontWeight={700}>
                    {t("title")}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                    {t("description")}
                </Typography>
            </Stack>
            <AppButton
                variant="outlined"
                color="primary"
                disabled={state === "loading"}
                onClick={() => void handleEnablePush()}
                startIcon={<NotificationsActiveOutlinedIcon />}
                sx={{ whiteSpace: "nowrap" }}
            >
                {state === "loading" ? t("loading") : t("enable")}
            </AppButton>
        </Stack>
    );
}
