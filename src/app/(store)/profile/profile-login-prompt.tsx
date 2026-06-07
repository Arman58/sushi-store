"use client";

import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import { useSession } from "next-auth/react";
import { useEffect, useRef, useState } from "react";

import { handleSessionExpired } from "@/features/auth/handle-session-expired";
import { LoginDialog } from "@/features/auth/ui/login-dialog";
import { PageContainer, SectionTitle } from "@/shared/ui";

export type ProfileLoginPromptReason = "no_session" | "session_expired";

const MESSAGES: Record<ProfileLoginPromptReason, string> = {
    no_session: "Войдите в аккаунт, чтобы увидеть историю заказов",
    session_expired: "Ваша сессия истекла, пожалуйста, войдите заново",
};

type ProfileLoginPromptProps = {
    reason: ProfileLoginPromptReason;
};

export function ProfileLoginPrompt({ reason }: ProfileLoginPromptProps) {
    const { status } = useSession();
    const [loginOpen, setLoginOpen] = useState(false);
    const staleSessionHandled = useRef(false);

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
                <SectionTitle pageTitle>Личный кабинет</SectionTitle>
                <Stack spacing={2.5} sx={{ maxWidth: 480 }}>
                    <Alert severity="warning">{MESSAGES[reason]}</Alert>
                    <Button
                        variant="contained"
                        color="primary"
                        onClick={() => setLoginOpen(true)}
                        sx={{ alignSelf: "flex-start", fontWeight: 700 }}
                    >
                        Войти
                    </Button>
                </Stack>
                <LoginDialog open={loginOpen} onClose={() => setLoginOpen(false)} />
        </PageContainer>
    );
}
