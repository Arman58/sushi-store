import Avatar from "@mui/material/Avatar";
import Box from "@mui/material/Box";
import Chip from "@mui/material/Chip";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { getLocale, getTranslations } from "next-intl/server";

import { auth } from "@/lib/auth";
import { formatPhoneForDisplay } from "@/lib/phone";
import { prisma } from "@/lib/prisma";
import { PageContainer, SectionTitle } from "@/shared/ui";
import { tokens } from "@/shared/ui/theme";

import { ProfileEmailVerificationAlert } from "./profile-email-verification-alert";
import { ProfileLoginPrompt } from "./profile-login-prompt";
import { ProfileSessionGuard } from "./profile-session-guard";
import { ProfileTabs } from "./profile-tabs";

export default async function ProfileLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const session = await auth();
    const userId = session?.user?.id ?? null;
    const locale = await getLocale();
    const t = await getTranslations("profile");

    if (!userId) {
        return <ProfileLoginPrompt reason="no_session" />;
    }

    let user;
    try {
        user = await prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                name: true,
                email: true,
                emailVerified: true,
                image: true,
                phone: true,
                createdAt: true,
            },
        });
    } catch {
        return <ProfileLoginPrompt reason="session_expired" />;
    }

    if (!user) {
        return <ProfileLoginPrompt reason="session_expired" />;
    }

    const displayName = (user.name ?? "").trim() || t("defaultName");
    const dateFormatter = new Intl.DateTimeFormat(locale, {
        day: "2-digit",
        month: "long",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });

    const tabLabels = {
        profile: t("pageTitle"),
        addresses: t("my_addresses"),
        orders: t("orderHistory"),
    };

    return (
        <>
            <ProfileSessionGuard />
            <PageContainer>
                <SectionTitle pageTitle>{t("pageTitle")}</SectionTitle>

                {/* User card first — preferred LCP candidate over the verify Alert. */}
                <Paper
                    elevation={0}
                    sx={{
                        p: { xs: 2.5, sm: 3 },
                        mb: 3,
                        borderRadius: 4,
                        border: `1px solid ${tokens.border}`,
                        bgcolor: "var(--ew-surface)",
                        position: "relative",
                        overflow: "hidden",
                        background: "linear-gradient(135deg, var(--ew-surface) 0%, rgba(39, 174, 96, 0.02) 100%)",
                        boxShadow: "0 4px 20px rgba(var(--ew-text-rgb), 0.04)",
                        "&::before": {
                            content: '""',
                            position: "absolute",
                            top: -100,
                            right: -100,
                            width: 200,
                            height: 200,
                            borderRadius: "50%",
                            background: `radial-gradient(circle, ${tokens.brandDim} 0%, transparent 70%)`,
                            pointerEvents: "none",
                        }
                    }}
                >
                    <Stack direction={{ xs: "column", sm: "row" }} spacing={2.5} alignItems={{ xs: "flex-start", sm: "center" }}>
                        <Box sx={{ position: "relative" }}>
                            <Avatar
                                src={user.image ?? undefined}
                                alt={displayName}
                                sx={{
                                    width: 68,
                                    height: 68,
                                    fontWeight: 800,
                                    bgcolor: tokens.brand,
                                    fontSize: "1.5rem",
                                    border: "3px solid var(--ew-surface)",
                                    boxShadow: `0 0 0 2px ${tokens.brand}`,
                                }}
                            >
                                {displayName.charAt(0).toUpperCase()}
                            </Avatar>
                        </Box>
                        <Box sx={{ flex: 1 }}>
                            <Typography component="p" variant="h6" fontWeight={800} sx={{ mb: 0.5, letterSpacing: "-0.01em" }}>
                                {displayName}
                            </Typography>
                            <Stack direction={{ xs: "column", sm: "row" }} spacing={{ xs: 0.5, sm: 2 }} sx={{ color: "text.secondary" }}>
                                {user.email ? (
                                    <Typography variant="body2">
                                        {user.email}
                                    </Typography>
                                ) : null}
                                <Typography variant="body2">
                                    {user.phone
                                        ? formatPhoneForDisplay(user.phone)
                                        : t("phoneMissing")}
                                </Typography>
                            </Stack>
                        </Box>
                        <Chip
                            label={t("memberSince", { date: dateFormatter.format(user.createdAt) })}
                            size="small"
                            variant="outlined"
                            sx={{
                                border: `1px solid ${tokens.brandGlow}`,
                                color: "primary.main",
                                bgcolor: tokens.brandDim,
                                fontWeight: 600,
                                borderRadius: 2,
                                mt: { xs: 1, sm: 0 },
                                alignSelf: { xs: "flex-start", sm: "center" },
                            }}
                        />
                    </Stack>
                </Paper>

                {user.emailVerified == null && user.email ? (
                    <ProfileEmailVerificationAlert email={user.email} />
                ) : null}

                <ProfileTabs labels={tabLabels} />

                <Box sx={{ mt: 1 }}>
                    {children}
                </Box>
            </PageContainer>
        </>
    );
}
