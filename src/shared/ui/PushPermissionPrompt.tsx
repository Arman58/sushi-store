"use client";

import NotificationsActiveOutlinedIcon from "@mui/icons-material/NotificationsActiveOutlined";
import Alert from "@mui/material/Alert";
import CircularProgress from "@mui/material/CircularProgress";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";

import { debugLog } from "@/lib/debug-log";
import { urlBase64ToUint8Array } from "@/lib/push-utils";
import { AppButton } from "@/shared/ui";

const IS_DEV = process.env.NODE_ENV === "development";
/** В dev прод-sw.js падает на precache /_next/static - используем лёгкий sw-dev.js (только push). */
const SW_URL = IS_DEV ? "/sw-dev.js" : "/sw.js";
const SW_SCOPE = "/";
const SW_READY_TIMEOUT_MS = 5_000;

type PushStatus = "idle" | "loading" | "success" | "error";

export function PushPermissionPrompt() {
    const t = useTranslations("profile.push");
    const [status, setStatus] = useState<PushStatus>("idle");
    const [errorMessage, setErrorMessage] = useState("");

    useEffect(() => {
        if (!("serviceWorker" in navigator)) return;

        let cancelled = false;

        void navigator.serviceWorker
            .getRegistration(SW_SCOPE)
            .then((registration) => {
                if (cancelled || !registration) return null;
                return registration.pushManager.getSubscription();
            })
            .then((subscription) => {
                if (cancelled || !subscription) return;
                setStatus("success");
            })
            .catch(() => {
                /* ignore — не блокируем UI */
            });

        return () => {
            cancelled = true;
        };
    }, []);

    const handleRequestPush = async () => {
        setStatus("loading");
        setErrorMessage("");

        try {
            if (
                !("serviceWorker" in navigator) ||
                !("PushManager" in window) ||
                !("Notification" in window)
            ) {
                setStatus("error");
                setErrorMessage(t("no_support"));
                return;
            }

            const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY?.trim();
            if (!vapidPublicKey) {
                setStatus("error");
                setErrorMessage(t("vapid_missing"));
                return;
            }

            debugLog("[PUSH] Requesting notification permission…");
            const permission = await Notification.requestPermission();
            debugLog("[PUSH] Notification permission:", permission);

            if (permission !== "granted") {
                setStatus("error");
                setErrorMessage(t("denied"));
                return;
            }

            debugLog("[PUSH] Registering service worker…");
            await navigator.serviceWorker.register(SW_URL, {
                scope: SW_SCOPE,
                updateViaCache: "none",
            });

            const reg = await Promise.race([
                navigator.serviceWorker.ready,
                new Promise<ServiceWorkerRegistration>((_, reject) => {
                    window.setTimeout(() => {
                        reject(new Error("SW timeout"));
                    }, SW_READY_TIMEOUT_MS);
                }),
            ]);

            debugLog("[PUSH] Service worker ready, scope:", reg.scope);

            let sub = await reg.pushManager.getSubscription();
            if (!sub) {
                debugLog("[PUSH] Subscribing to push manager…");
                sub = await reg.pushManager.subscribe({
                    userVisibleOnly: true,
                    applicationServerKey: urlBase64ToUint8Array(
                        vapidPublicKey,
                    ) as BufferSource,
                });
                debugLog("[PUSH] Push subscription created:", sub.endpoint);
            }

            const subscriptionJson = sub.toJSON();
            if (
                !subscriptionJson.endpoint ||
                !subscriptionJson.keys?.p256dh ||
                !subscriptionJson.keys?.auth
            ) {
                setStatus("error");
                setErrorMessage(t("subscribe_error"));
                return;
            }

            debugLog("[PUSH] Sending subscription to backend…");
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
                setStatus("error");
                setErrorMessage(data.error ?? t("server_error"));
                return;
            }

            debugLog("[PUSH] Subscription saved successfully");
            setStatus("success");
        } catch (error) {
            console.error("[PUSH] Subscribe flow failed:", error);

            if (error instanceof Error && error.message === "SW timeout") {
                setStatus("error");
                setErrorMessage(t("sw_timeout"));
                return;
            }

            setStatus("error");
            setErrorMessage(
                error instanceof Error ? error.message : t("subscribe_error"),
            );
        }
    };

    if (status === "success") {
        return (
            <Alert severity="success" icon={<NotificationsActiveOutlinedIcon />} sx={{ mb: 3 }}>
                {t("success")}
            </Alert>
        );
    }

    return (
        <Stack spacing={2} sx={{ mb: 3 }}>
            {IS_DEV ? <Alert severity="info">{t("dev_warning")}</Alert> : null}

            {status === "error" && errorMessage ? (
                <Alert severity="error" onClose={() => setStatus("idle")}>
                    {errorMessage}
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
                    disabled={status === "loading"}
                    onClick={() => void handleRequestPush()}
                    startIcon={
                        status === "loading" ? (
                            <CircularProgress size={18} color="inherit" />
                        ) : (
                            <NotificationsActiveOutlinedIcon />
                        )
                    }
                    sx={{ whiteSpace: "nowrap" }}
                >
                    {status === "loading" ? t("loading") : t("enable")}
                </AppButton>
            </Stack>
        </Stack>
    );
}
