"use client";

import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import { useSession } from "next-auth/react";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";

import { handleSessionExpired } from "@/features/auth/handle-session-expired";
import { LoginDialog } from "@/features/auth/ui/login-dialog";
import { PageContainer, SectionTitle } from "@/shared/ui";

export type ProfileLoginPromptReason = "no_session" | "session_expired";

type ProfileLoginPromptProps = {
    reason: ProfileLoginPromptReason;
};

export function ProfileLoginPrompt({ reason }: ProfileLoginPromptProps) {
    const { status } = useSession();
    const [loginOpen, setLoginOpen] = useState(false);
    const staleSessionHandled = useRef(false);
    const t = useTranslations("profile.login");
    const tProfile = useTranslations("profile");
    const tAuth = useTranslations("auth");

    useEffect(() => {
        if (staleSessionHandled.current) return;
        if (status === "loading") return;

        const hasStaleClientSession = status === "authenticated";

        if (hasStaleClientSession || reason === "session_expired") {
            staleSessionHandled.current = true;
            void handleSessionExpired(() => setLoginOpen(true));
        }
    }, [status, reason]);

    return (
        <PageContainer>
                <SectionTitle pageTitle>{tProfile("pageTitle")}</SectionTitle>
                <Stack spacing={2.5} sx={{ maxWidth: 480 }}>
                    <Alert severity="warning">
                        {reason === "session_expired"
                            ? t("sessionExpired")
                            : t("noSession")}
                    </Alert>
                    <Button
                        variant="contained"
                        color="primary"
                        onClick={() => setLoginOpen(true)}
                        sx={{ alignSelf: "flex-start", fontWeight: 700 }}
                    >
                        {tAuth("login")}
                    </Button>
                </Stack>
                <LoginDialog open={loginOpen} onClose={() => setLoginOpen(false)} />
        </PageContainer>
    );
}
