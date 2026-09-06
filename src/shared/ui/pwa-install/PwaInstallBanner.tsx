"use client";

import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import Box from "@mui/material/Box";
import IconButton from "@mui/material/IconButton";
import Typography from "@mui/material/Typography";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { useRef } from "react";

import { PWA_ICON_192 } from "@/shared/lib/pwa-install";
import { useScrollHide } from "@/shared/lib/use-scroll-hide";
import { AppButton } from "@/shared/ui/AppButton";
import { tokens } from "@/shared/ui/theme";

type PwaInstallBannerProps = {
    open: boolean;
    platform: "android" | "ios";
    afterOrder: boolean;
    installing: boolean;
    onInstall: () => void;
    onDismiss: () => void;
};

const SWIPE_DISMISS_PX = 48;

export function PwaInstallBanner({
    open,
    platform,
    afterOrder,
    installing,
    onInstall,
    onDismiss,
}: PwaInstallBannerProps) {
    const t = useTranslations("pwa.install");
    const navHidden = useScrollHide(150);
    const touchStartY = useRef<number | null>(null);

    if (!open) return null;

    return (
        <Box
            role="dialog"
            aria-labelledby="ew-pwa-install-title"
            aria-describedby="ew-pwa-install-body"
            onTouchStart={(event) => {
                touchStartY.current = event.touches[0]?.clientY ?? null;
            }}
            onTouchEnd={(event) => {
                const start = touchStartY.current;
                touchStartY.current = null;
                if (start == null) return;
                const end = event.changedTouches[0]?.clientY;
                if (end != null && end - start > SWIPE_DISMISS_PX) {
                    onDismiss();
                }
            }}
            sx={{
                display: { xs: "flex", sm: "none" },
                position: "fixed",
                left: 0,
                right: 0,
                bottom: navHidden
                    ? "calc(12px + env(safe-area-inset-bottom))"
                    : "calc(80px + env(safe-area-inset-bottom))",
                zIndex: 1150,
                px: 1.5,
                justifyContent: "center",
                pointerEvents: "none",
                transition: "bottom 0.35s ease",
                "@media (prefers-reduced-motion: reduce)": {
                    transition: "none",
                },
            }}
        >
            <Box
                sx={{
                    pointerEvents: "auto",
                    width: "100%",
                    maxWidth: 420,
                    borderRadius: "20px",
                    px: 1.5,
                    pt: 1.25,
                    pb: 1.5,
                    bgcolor: "rgba(var(--ew-surface-rgb), 0.92)",
                    backdropFilter: "saturate(180%) blur(20px)",
                    WebkitBackdropFilter: "saturate(180%) blur(20px)",
                    border: "1px solid",
                    borderColor: "divider",
                    boxShadow: "0 10px 32px rgba(var(--ew-text-rgb), 0.12)",
                    animation: "ewPwaBannerIn 280ms ease both",
                    "@keyframes ewPwaBannerIn": {
                        from: { opacity: 0, transform: "translateY(16px)" },
                        to: { opacity: 1, transform: "translateY(0)" },
                    },
                    "@media (prefers-reduced-motion: reduce)": {
                        animation: "none",
                    },
                }}
            >
                <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1.25 }}>
                    <Box
                        sx={{
                            width: 52,
                            height: 52,
                            borderRadius: "14px",
                            overflow: "hidden",
                            flexShrink: 0,
                            bgcolor: "#fff",
                            boxShadow: `0 0 0 1px ${tokens.border}`,
                        }}
                    >
                        <Image
                            src={PWA_ICON_192}
                            alt={t("logoAlt")}
                            width={52}
                            height={52}
                        />
                    </Box>

                    <Box sx={{ flex: 1, minWidth: 0, pt: 0.15 }}>
                        <Typography
                            id="ew-pwa-install-title"
                            sx={{
                                fontSize: "0.98rem",
                                fontWeight: 800,
                                letterSpacing: -0.25,
                                lineHeight: 1.2,
                            }}
                        >
                            {t("title")}
                        </Typography>
                        <Typography
                            id="ew-pwa-install-body"
                            sx={{
                                mt: 0.35,
                                fontSize: "0.78rem",
                                lineHeight: 1.35,
                                color: "text.secondary",
                                display: "-webkit-box",
                                WebkitLineClamp: 2,
                                WebkitBoxOrient: "vertical",
                                overflow: "hidden",
                            }}
                        >
                            {afterOrder ? t("bodyAfterOrder") : t("body")}
                        </Typography>
                    </Box>

                    <IconButton
                        aria-label={t("dismissAria")}
                        onClick={onDismiss}
                        sx={{
                            mt: -0.5,
                            mr: -0.75,
                            width: 44,
                            height: 44,
                            color: "text.secondary",
                        }}
                    >
                        <CloseRoundedIcon sx={{ fontSize: 20 }} />
                    </IconButton>
                </Box>

                <AppButton
                    fullWidth
                    variant="contained"
                    color="primary"
                    disabled={installing}
                    onClick={onInstall}
                    sx={{
                        mt: 1.25,
                        minHeight: 44,
                        borderRadius: 999,
                        textTransform: "none",
                        fontWeight: 800,
                        fontSize: "0.95rem",
                    }}
                >
                    {platform === "ios" ? t("addCta") : t("installCta")}
                </AppButton>
            </Box>
        </Box>
    );
}
