"use client";

import NotificationsActiveOutlinedIcon from "@mui/icons-material/NotificationsActiveOutlined";
import Alert from "@mui/material/Alert";
import CircularProgress from "@mui/material/CircularProgress";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";

import { debugLog } from "@/lib/debug-log";
import {
    isPushSupported,
    persistPushSubscription,
    subscribeToPush,
    syncPushSubscriptionWithBackend,
} from "@/lib/push-client";

import { AppButton } from "./AppButton";

const IS_DEV = process.env.NODE_ENV === "development";

type PushStatus = "idle" | "loading" | "success" | "error";

export function PushPermissionPrompt() {
    const t = useTranslations("profile.push");
    const [status, setStatus] = useState<PushStatus>("idle");
    const [errorMessage, setErrorMessage] = useState("");

    useEffect(() => {
        if (!isPushSupported()) return;

        let cancelled = false;

        void syncPushSubscriptionWithBackend()
            .then((result) => {
                if (cancelled) return;
                if (result === "synced") {
                    setStatus("success");
                }
            })
            .catch(() => {
                /* ignore - не блокируем UI */
            });

        return () => {
            cancelled = true;
        };
    }, []);

    const handleRequestPush = async () => {
        setStatus("loading");
        setErrorMessage("");

        try {
            if (!isPushSupported()) {
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

            let subscription = await subscribeToPush(vapidPublicKey);
            let result = await persistPushSubscription(subscription);

            if (!result.ok) {
                subscription = await subscribeToPush(vapidPublicKey, { renew: true });
                result = await persistPushSubscription(subscription);
            }

            if (!result.ok) {
                setStatus("error");
                setErrorMessage(result.error ?? t("server_error"));
                return;
            }

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
