"use client";

import CloseIcon from "@mui/icons-material/Close";
import GetAppOutlinedIcon from "@mui/icons-material/GetAppOutlined";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import SwipeableDrawer from "@mui/material/SwipeableDrawer";
import Typography from "@mui/material/Typography";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";

const DISMISS_STORAGE_KEY = "east-west-pwa-install-dismissed";

type BeforeInstallPromptEvent = Event & {
    prompt: () => Promise<void>;
    userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

function isStandaloneMode(): boolean {
    if (typeof window === "undefined") {
        return false;
    }

    return (
        window.matchMedia("(display-mode: standalone)").matches ||
        ("standalone" in navigator &&
            (navigator as Navigator & { standalone?: boolean }).standalone === true)
    );
}

export function InstallPwaPrompt() {
    const t = useTranslations("pwa.install");
    const [deferredPrompt, setDeferredPrompt] =
        useState<BeforeInstallPromptEvent | null>(null);
    const [open, setOpen] = useState(false);
    const [installing, setInstalling] = useState(false);

    useEffect(() => {
        if (typeof window === "undefined") {
            return;
        }

        if (isStandaloneMode() || localStorage.getItem(DISMISS_STORAGE_KEY) === "1") {
            return;
        }

        const handleBeforeInstallPrompt = (event: Event) => {
            event.preventDefault();
            setDeferredPrompt(event as BeforeInstallPromptEvent);
            setOpen(true);
        };

        window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

        return () => {
            window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
        };
    }, []);

    const handleDismiss = useCallback(() => {
        localStorage.setItem(DISMISS_STORAGE_KEY, "1");
        setOpen(false);
        setDeferredPrompt(null);
    }, []);

    const handleInstall = useCallback(async () => {
        if (!deferredPrompt) {
            return;
        }

        setInstalling(true);

        try {
            await deferredPrompt.prompt();
            const choice = await deferredPrompt.userChoice;

            if (choice.outcome === "accepted") {
                localStorage.setItem(DISMISS_STORAGE_KEY, "1");
                setOpen(false);
            }
        } finally {
            setInstalling(false);
            setDeferredPrompt(null);
        }
    }, [deferredPrompt]);

    if (!deferredPrompt) {
        return null;
    }

    return (
        <SwipeableDrawer
            anchor="bottom"
            open={open}
            onClose={handleDismiss}
            onOpen={() => setOpen(true)}
            disableSwipeToOpen
            PaperProps={{
                sx: {
                    borderTopLeftRadius: 20,
                    borderTopRightRadius: 20,
                    px: 2.5,
                    pt: 1.5,
                    pb: 3,
                    background:
                        "linear-gradient(180deg, #ffffff 0%, #f6f4f1 100%)",
                },
            }}
        >
            <Box
                sx={{
                    width: 40,
                    height: 4,
                    borderRadius: 999,
                    bgcolor: "divider",
                    mx: "auto",
                    mb: 2,
                }}
            />

            <Box sx={{ display: "flex", alignItems: "flex-start", gap: 2 }}>
                <Box
                    sx={{
                        width: 56,
                        height: 56,
                        borderRadius: 3,
                        overflow: "hidden",
                        flexShrink: 0,
                        boxShadow: "0 8px 24px rgba(0,179,65,0.18)",
                    }}
                >
                    <Image
                        src="/pwa/icon-192x192.png"
                        alt={t("logoAlt")}
                        width={56}
                        height={56}
                        priority
                    />
                </Box>

                <Box sx={{ flex: 1, minWidth: 0, pr: 4 }}>
                    <Typography variant="subtitle1" fontWeight={800} gutterBottom>
                        {t("title")}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        {t("body")}
                    </Typography>
                </Box>

                <IconButton
                    aria-label={t("dismissAria")}
                    onClick={handleDismiss}
                    sx={{ position: "absolute", top: 12, right: 12 }}
                >
                    <CloseIcon fontSize="small" />
                </IconButton>
            </Box>

            <Box sx={{ display: "flex", gap: 1.5, mt: 2.5 }}>
                <Button
                    fullWidth
                    variant="contained"
                    size="large"
                    startIcon={<GetAppOutlinedIcon />}
                    onClick={handleInstall}
                    disabled={installing}
                    sx={{
                        borderRadius: 999,
                        textTransform: "none",
                        fontWeight: 700,
                        py: 1.25,
                    }}
                >
                    {t("installCta")}
                </Button>
                <Button
                    variant="text"
                    onClick={handleDismiss}
                    sx={{
                        borderRadius: 999,
                        textTransform: "none",
                        fontWeight: 600,
                        whiteSpace: "nowrap",
                    }}
                >
                    {t("dismissCta")}
                </Button>
            </Box>
        </SwipeableDrawer>
    );
}
