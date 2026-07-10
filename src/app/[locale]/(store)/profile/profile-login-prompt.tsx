"use client";

import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { useSession } from "next-auth/react";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";

import { handleSessionExpired } from "@/features/auth/handle-session-expired";
import { LoginDialog } from "@/features/auth/ui/login-dialog";
import { useRouter } from "@/i18n/server";
import { PageContainer, SectionTitle } from "@/shared/ui";

export type ProfileLoginPromptReason = "no_session" | "session_expired";

type ProfileLoginPromptProps = {
    reason: ProfileLoginPromptReason;
};

export function ProfileLoginPrompt({ reason }: ProfileLoginPromptProps) {
    const { status } = useSession();
    const router = useRouter();
    const [loginOpen, setLoginOpen] = useState(false);
    const staleSessionHandled = useRef(false);
    const refreshedAfterAuth = useRef(false);
    const t = useTranslations("profile.login");
    const tProfile = useTranslations("profile");
    const tAuth = useTranslations("auth");

    useEffect(() => {
        if (status === "loading") return;

        // Fresh login while this prompt is still mounted: refresh RSC so the
        // server layout swaps to the real profile (do NOT signOut).
        // Закрытие диалога - производным значением на рендере (dialogOpen),
        // а не setState в эффекте (react-hooks/set-state-in-effect).
        if (reason === "no_session" && status === "authenticated") {
            if (refreshedAfterAuth.current) return;
            refreshedAfterAuth.current = true;
            router.refresh();
            return;
        }

        // Only clear a truly expired client cookie when the server said so.
        if (reason === "session_expired" && !staleSessionHandled.current) {
            staleSessionHandled.current = true;
            void handleSessionExpired(() => setLoginOpen(true));
        }
    }, [status, reason, router]);

    const closeLogin = () => {
        if (document.activeElement instanceof HTMLElement) {
            document.activeElement.blur();
        }
        setLoginOpen(false);
    };

    // Аутентифицированному пользователю диалог не показываем - React сам
    // закроет его на этом же рендере, эффект выше только обновляет RSC.
    const dialogOpen =
        loginOpen && !(reason === "no_session" && status === "authenticated");

    return (
        <PageContainer>
            {/* Title is the LCP candidate — no large MUI Alert in the first viewport. */}
            <SectionTitle pageTitle>{tProfile("pageTitle")}</SectionTitle>
            <Stack spacing={2} sx={{ maxWidth: 480 }}>
                <Typography
                    component="p"
                    variant="body1"
                    color="text.secondary"
                    role="status"
                    sx={{ lineHeight: 1.5 }}
                >
                    {reason === "session_expired"
                        ? t("sessionExpired")
                        : t("noSession")}
                </Typography>
                <Button
                    variant="contained"
                    color="primary"
                    onClick={() => setLoginOpen(true)}
                    sx={{ alignSelf: "flex-start", fontWeight: 700 }}
                >
                    {tAuth("login")}
                </Button>
            </Stack>
            <LoginDialog open={dialogOpen} onClose={closeLogin} />
        </PageContainer>
    );
}
