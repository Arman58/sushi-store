"use client";

import NotificationsActiveOutlinedIcon from "@mui/icons-material/NotificationsActiveOutlined";
import Alert from "@mui/material/Alert";
import CircularProgress from "@mui/material/CircularProgress";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";

import {
    getServiceWorkerRegistrationForPush,
    urlBase64ToUint8Array,
} from "@/lib/push-utils";
import { AppButton } from "@/shared/ui";

const IS_DEV = process.env.NODE_ENV === "development";

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
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    useEffect(() => {
        if (!isPushSupported()) return;

        let cancelled = false;

        void (async () => {
            try {
                console.log("[PUSH] Checking existing subscription on profile mount…");
                const registration = await getServiceWorkerRegistrationForPush();
                if (cancelled) return;

                const existing = await registration.pushManager.getSubscription();
                if (existing) {
                    console.log("[PUSH] Existing subscription found:", existing.endpoint);
                    setSuccess(true);
                } else {
                    console.log("[PUSH] No existing subscription");
                }
            } catch (warmupError) {
                console.warn("[PUSH] Profile mount SW check failed:", warmupError);
            }
        })();

        return () => {
            cancelled = true;
        };
    }, []);

    const handleEnablePush = async () => {
        setError(null);

        if (!isPushSupported()) {
            console.error("[PUSH] Browser does not support push");
            setError(t("no_support"));
            return;
        }

        const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY?.trim();
        if (!vapidPublicKey) {
            console.error("[PUSH] NEXT_PUBLIC_VAPID_PUBLIC_KEY is missing");
            setError(t("vapid_missing"));
            return;
        }

        setIsLoading(true);

        try {
            console.log("[PUSH] Requesting notification permission…");
            const permission = await Notification.requestPermission();
            console.log("[PUSH] Notification permission:", permission);

            if (permission !== "granted") {
                setError(t("denied"));
                return;
            }

            let registration: ServiceWorkerRegistration;
            try {
                registration = await getServiceWorkerRegistrationForPush();
            } catch (swError) {
                const message =
                    swError instanceof Error && swError.message === "SW_TIMEOUT"
                        ? t("sw_timeout")
                        : swError instanceof Error
                          ? swError.message
                          : t("sw_timeout");
                console.error("[PUSH] Service worker registration failed:", swError);
                setError(message);
                return;
            }

            let subscription = await registration.pushManager.getSubscription();
            console.log(
                "[PUSH] Existing push subscription:",
                subscription ? subscription.endpoint : "none",
            );

            if (!subscription) {
                try {
                    console.log("[PUSH] Subscribing to push manager…");
                    subscription = await registration.pushManager.subscribe({
                        userVisibleOnly: true,
                        applicationServerKey: urlBase64ToUint8Array(
                            vapidPublicKey,
                        ) as BufferSource,
                    });
                    console.log("[PUSH] Push subscription created:", subscription.endpoint);
                } catch (subscribeError) {
                    console.error("[PUSH] pushManager.subscribe failed:", subscribeError);
                    setError(
                        subscribeError instanceof Error
                            ? subscribeError.message
                            : t("subscribe_error"),
                    );
                    return;
                }
            }

            const subscriptionJson = subscription.toJSON();
            if (
                !subscriptionJson.endpoint ||
                !subscriptionJson.keys?.p256dh ||
                !subscriptionJson.keys?.auth
            ) {
                console.error("[PUSH] Invalid subscription JSON:", subscriptionJson);
                setError(t("subscribe_error"));
                return;
            }

            console.log("[PUSH] Sending subscription to backend…");
            const res = await fetch("/api/push/subscribe", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "same-origin",
                body: JSON.stringify(subscriptionJson),
            });

            let data: { error?: string } = {};
            try {
                data = (await res.json()) as { error?: string };
            } catch {
                console.warn("[PUSH] Backend response is not JSON, status:", res.status);
            }

            if (!res.ok) {
                console.error("[PUSH] Backend subscribe failed:", res.status, data);
                setError(data.error ?? t("backend_error"));
                return;
            }

            console.log("[PUSH] Subscription saved successfully");
            setSuccess(true);
        } catch (unexpectedError) {
            console.error("[PUSH] Unexpected subscribe error:", unexpectedError);
            setError(
                unexpectedError instanceof Error
                    ? unexpectedError.message
                    : t("subscribe_error"),
            );
        } finally {
            setIsLoading(false);
        }
    };

    if (success) {
        return (
            <Alert severity="success" icon={<NotificationsActiveOutlinedIcon />} sx={{ mb: 3 }}>
                {t("success")}
            </Alert>
        );
    }

    return (
        <Stack spacing={2} sx={{ mb: 3 }}>
            {IS_DEV ? <Alert severity="info">{t("dev_warning")}</Alert> : null}

            {error ? (
                <Alert severity="error" onClose={() => setError(null)}>
                    {error}
                </Alert>
            ) : null}

            <Stack
                direction={{ xs: "column", sm: "row" }}
                spacing={2}
                alignItems={{ sm: "center" }}
                sx={{
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
                    disabled={isLoading}
                    onClick={() => void handleEnablePush()}
                    startIcon={
                        isLoading ? (
                            <CircularProgress size={18} color="inherit" />
                        ) : (
                            <NotificationsActiveOutlinedIcon />
                        )
                    }
                    sx={{ whiteSpace: "nowrap" }}
                >
                    {isLoading ? t("loading") : t("enable")}
                </AppButton>
            </Stack>
        </Stack>
    );
}
