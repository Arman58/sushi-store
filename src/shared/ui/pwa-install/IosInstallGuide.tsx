"use client";

import CheckRoundedIcon from "@mui/icons-material/CheckRounded";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import Box from "@mui/material/Box";
import IconButton from "@mui/material/IconButton";
import Stack from "@mui/material/Stack";
import SwipeableDrawer from "@mui/material/SwipeableDrawer";
import Typography from "@mui/material/Typography";
import Image from "next/image";
import { useTranslations } from "next-intl";
import type { ReactNode } from "react";

import { PWA_ICON_192 } from "@/shared/lib/pwa-install";
import { AppButton } from "@/shared/ui/AppButton";
import { tokens } from "@/shared/ui/theme";

import { IosPlusAppGlyph, IosShareGlyph, IosShareSheetPreview } from "./ios-glyphs";

type IosInstallGuideProps = {
    open: boolean;
    onClose: () => void;
};

function GuideStep({
    step,
    icon,
    title,
    hint,
}: {
    step: number;
    icon: ReactNode;
    title: string;
    hint: string;
}) {
    return (
        <Stack direction="row" spacing={1.5} alignItems="flex-start" sx={{ px: 1.5, py: 1.35 }}>
            <Box
                sx={{
                    width: 22,
                    height: 22,
                    borderRadius: "50%",
                    bgcolor: tokens.brand,
                    color: "#fff",
                    fontSize: "0.72rem",
                    fontWeight: 800,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                    mt: 0.15,
                }}
            >
                {step}
            </Box>
            <Box
                sx={{
                    width: 36,
                    height: 36,
                    borderRadius: "10px",
                    bgcolor: "rgba(0, 122, 255, 0.1)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                }}
            >
                {icon}
            </Box>
            <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography sx={{ fontWeight: 700, fontSize: "0.95rem", letterSpacing: -0.2 }}>
                    {title}
                </Typography>
                <Typography sx={{ mt: 0.2, fontSize: "0.8rem", color: "text.secondary", lineHeight: 1.4 }}>
                    {hint}
                </Typography>
            </Box>
        </Stack>
    );
}

export function IosInstallGuide({ open, onClose }: IosInstallGuideProps) {
    const t = useTranslations("pwa");
    const tInstall = useTranslations("pwa.install");

    return (
        <SwipeableDrawer
            anchor="bottom"
            open={open}
            onClose={onClose}
            onOpen={() => undefined}
            disableSwipeToOpen
            disableRestoreFocus
            disableScrollLock
            sx={{ zIndex: 1400, display: { xs: "block", sm: "none" } }}
            PaperProps={{
                role: "dialog",
                "aria-labelledby": "ew-pwa-ios-title",
                sx: {
                    position: "relative",
                    borderTopLeftRadius: 28,
                    borderTopRightRadius: 28,
                    px: 2.25,
                    pt: 1.25,
                    pb: "calc(18px + env(safe-area-inset-bottom))",
                    bgcolor: "background.paper",
                    backgroundImage: "none",
                    maxWidth: 480,
                    mx: "auto",
                    maxHeight: "min(92dvh, 760px)",
                    overflowY: "auto",
                },
            }}
        >
            <Box
                sx={{
                    width: 36,
                    height: 4,
                    borderRadius: 2,
                    bgcolor: "divider",
                    mx: "auto",
                    mb: 1,
                }}
            />

            <IconButton
                aria-label={tInstall("dismissAria")}
                onClick={onClose}
                sx={{
                    position: "absolute",
                    top: 10,
                    right: 10,
                    width: 44,
                    height: 44,
                    color: "text.secondary",
                    bgcolor: "action.hover",
                }}
            >
                <CloseRoundedIcon sx={{ fontSize: 20 }} />
            </IconButton>

            <Stack alignItems="center" sx={{ mt: 1, mb: 1.75 }}>
                <Box
                    sx={{
                        width: 72,
                        height: 72,
                        borderRadius: "18px",
                        overflow: "hidden",
                        bgcolor: "#fff",
                        boxShadow: "0 8px 24px rgba(var(--ew-text-rgb), 0.12)",
                    }}
                >
                    <Image
                        src={PWA_ICON_192}
                        alt={tInstall("logoAlt")}
                        width={72}
                        height={72}
                    />
                </Box>
            </Stack>

            <Typography
                id="ew-pwa-ios-title"
                sx={{
                    textAlign: "center",
                    fontWeight: 800,
                    fontSize: "1.28rem",
                    lineHeight: 1.2,
                    letterSpacing: -0.4,
                    px: 1,
                }}
            >
                {t("ios_title")}
            </Typography>
            <Typography
                sx={{
                    mt: 0.75,
                    textAlign: "center",
                    color: "text.secondary",
                    fontSize: "0.9rem",
                    lineHeight: 1.45,
                    px: 1,
                }}
            >
                {t("ios_subtitle")}
            </Typography>

            <Box sx={{ mt: 2.25, mb: 2 }}>
                <IosShareSheetPreview itemLabel={t("ios_share_menu_item")} />
            </Box>

            <Box
                sx={{
                    borderRadius: "16px",
                    bgcolor: "rgba(var(--ew-text-rgb), 0.04)",
                    overflow: "hidden",
                }}
            >
                <GuideStep
                    step={1}
                    icon={<IosShareGlyph size={20} />}
                    title={t("ios_step1_title")}
                    hint={t("ios_step1")}
                />
                <Box sx={{ height: "1px", bgcolor: "divider", ml: 9.5 }} />
                <GuideStep
                    step={2}
                    icon={<IosPlusAppGlyph size={20} />}
                    title={t("ios_step2_title")}
                    hint={t("ios_step2")}
                />
                <Box sx={{ height: "1px", bgcolor: "divider", ml: 9.5 }} />
                <GuideStep
                    step={3}
                    icon={<CheckRoundedIcon sx={{ fontSize: 20, color: "#007AFF" }} />}
                    title={t("ios_step3_title")}
                    hint={t("ios_step3")}
                />
            </Box>

            <AppButton
                fullWidth
                variant="contained"
                color="primary"
                size="large"
                onClick={onClose}
                sx={{
                    mt: 2.25,
                    minHeight: 48,
                    borderRadius: 3,
                    textTransform: "none",
                    fontWeight: 800,
                    fontSize: "1rem",
                }}
            >
                {t("ios_close")}
            </AppButton>
        </SwipeableDrawer>
    );
}
