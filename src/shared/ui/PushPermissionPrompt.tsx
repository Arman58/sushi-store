"use client";

import NotificationsActiveOutlinedIcon from "@mui/icons-material/NotificationsActiveOutlined";
import Alert from "@mui/material/Alert";
import CircularProgress from "@mui/material/CircularProgress";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";

import { isApexHost, redirectToCanonicalHost } from "@/lib/canonical-host";
import {
    getPushServiceWorkerRegistration,
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
    const [swReady, setSwReady] = useState(false);

    useEffect(() => {
        if (redirectToCanonicalHost()) return;
        if (!isPushSupported() || isApexHost()) return;

        let cancelled = false;

        void (async () => {
            try {
                const registration = await getPushServiceWorkerRegistration();
                if (cancelled) return;

                setSwReady(true);

                const existing = await registration.pushManager.getSubscription();
                if (existing) {
                    setSuccess(true);
                }
            } catch (warmupError) {
                console.warn("[PUSH] SW warmup on profile:", warmupError);
            }
        })();

        return () => {
            cancelled = true;
        };
    }, []);

    const handleEnablePush = async () => {
        setError(null);

        if (!isPushSupported()) {
            setError(t("no_support"));
            return;
        }

        const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY?.trim();
        if (!vapidPublicKey) {
            setError(t("vapid_missing"));
            return;
        }

        if (isApexHost()) {
            redirectToCanonicalHost();
            return;
        }

        setIsLoading(true);

        try {
            const permission = await Notification.requestPermission();
            if (permission !== "granted") {
                setError(t("denied"));
                return;
            }

            let registration: ServiceWorkerRegistration;
            try {
                registration = await getPushServiceWorkerRegistration();
                setSwReady(true);
            } catch (swError) {
                const message =
                    swError instanceof Error && swError.message === "SW_TIMEOUT"
                        ? t("sw_timeout")
                        : swError instanceof Error
                          ? swError.message
                          : t("sw_timeout");
                setError(message);
                return;
            }

            let subscription = await registration.pushManager.getSubscription();

            if (!subscription) {
                try {
                    subscription = await registration.pushManager.subscribe({
                        userVisibleOnly: true,
                        applicationServerKey: urlBase64ToUint8Array(
                            vapidPublicKey,
                        ) as BufferSource,
                    });
                } catch (subscribeError) {
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
                setError(t("subscribe_error"));
                return;
            }

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
                /* ignore */
            }

            if (!res.ok) {
                setError(data.error ?? t("backend_error"));
                return;
            }

            setSuccess(true);
        } catch (unexpectedError) {
            console.error("[PUSH SUBSCRIBE] Unexpected error:", unexpectedError);
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

            {!swReady && !isLoading && !IS_DEV ? (
                <Alert severity="info">{t("sw_preparing")}</Alert>
            ) : null}

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
                    disabled={isLoading || (!swReady && !IS_DEV)}
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
