"use client";

import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { handleSessionExpired } from "@/features/auth/handle-session-expired";
import { LoginDialog } from "@/features/auth/ui/login-dialog";
import { showAppToast } from "@/shared/lib/show-app-toast";

type ProfileEmailVerificationAlertProps = {
    email: string;
};

export function ProfileEmailVerificationAlert({
    email,
}: ProfileEmailVerificationAlertProps) {
    const [loading, setLoading] = useState(false);
    const [loginOpen, setLoginOpen] = useState(false);
    const t = useTranslations("profile.email");
    const tProfile = useTranslations("profile.login");
    const tCommon = useTranslations("common");

    const handleResend = async () => {
        setLoading(true);

        try {
            const res = await fetch("/api/auth/resend-verification", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email }),
            });

            if (res.status === 401) {
                await handleSessionExpired(() => setLoginOpen(true));
                showAppToast(tProfile("sessionExpired"), "error");
                return;
            }

            const data = (await res.json().catch(() => null)) as {
                error?: string;
                ok?: boolean;
            } | null;

            if (!res.ok) {
                const msg = data?.error ?? t("resendFailed");
                showAppToast(msg, "error");
                return;
            }

            showAppToast(t("resendSuccess"));
        } catch {
            showAppToast(tCommon("networkError"), "error");
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            <Alert
                severity="warning"
                sx={{ mb: 3, borderRadius: 2, py: 1, px: 1.5 }}
            >
                <Stack direction="column" spacing={1}>
                    <Typography variant="body2">{t("verifyPrompt")}</Typography>
                    <Button
                        color="inherit"
                        size="small"
                        disabled={loading}
                        onClick={() => void handleResend()}
                        sx={{
                            alignSelf: { xs: "stretch", sm: "flex-start" },
                            width: { xs: "100%", sm: "auto" },
                            textTransform: "none",
                            fontWeight: 600,
                            whiteSpace: { xs: "normal", sm: "nowrap" },
                        }}
                    >
                        {loading ? (
                            <CircularProgress size={18} color="inherit" />
                        ) : (
                            t("resend")
                        )}
                    </Button>
                </Stack>
            </Alert>
            <LoginDialog open={loginOpen} onClose={() => setLoginOpen(false)} />
        </>
    );
}
