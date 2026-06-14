"use client";

import AddCircleOutlineIcon from "@mui/icons-material/AddCircleOutline";
import CloseIcon from "@mui/icons-material/Close";
import GetAppOutlinedIcon from "@mui/icons-material/GetAppOutlined";
import IosShareIcon from "@mui/icons-material/IosShare";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import Stack from "@mui/material/Stack";
import SwipeableDrawer from "@mui/material/SwipeableDrawer";
import Typography from "@mui/material/Typography";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useState, type ReactNode } from "react";

const ANDROID_DISMISS_KEY = "east-west-pwa-install-dismissed";
const IOS_DISMISS_KEY = "ios-pwa-prompt-dismissed";

type BeforeInstallPromptEvent = Event & {
    prompt: () => Promise<void>;
    userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

type PromptMode = "android" | "ios" | null;

function detectIOS(): boolean {
    if (typeof navigator === "undefined") {
        return false;
    }

    return (
        /iPad|iPhone|iPod/.test(navigator.userAgent) ||
        (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
    );
}

function detectStandalone(): boolean {
    if (typeof window === "undefined") {
        return false;
    }

    return (
        window.matchMedia("(display-mode: standalone)").matches ||
        ("standalone" in navigator &&
            (navigator as Navigator & { standalone?: boolean }).standalone === true)
    );
}

const drawerPaperSx = {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    px: 2.5,
    pt: 1.5,
    pb: 3,
    background: "linear-gradient(180deg, #ffffff 0%, #f6f4f1 100%)",
} as const;

function DrawerHandle() {
    return (
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
    );
}

function IosInstructionStep({
    icon,
    text,
    step,
}: {
    icon: ReactNode;
    text: string;
    step: number;
}) {
    return (
        <Stack direction="row" spacing={1.5} alignItems="flex-start">
            <Box
                sx={{
                    width: 40,
                    height: 40,
                    borderRadius: 2,
                    bgcolor: "action.hover",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                    color: "primary.main",
                }}
            >
                {icon}
            </Box>
            <Box sx={{ flex: 1, minWidth: 0, pt: 0.25 }}>
                <Typography
                    variant="caption"
                    color="text.secondary"
                    fontWeight={700}
                    sx={{ letterSpacing: 0.4, textTransform: "uppercase" }}
                >
                    {step}
                </Typography>
                <Typography variant="body2" sx={{ mt: 0.25, lineHeight: 1.5 }}>
                    {text}
                </Typography>
            </Box>
        </Stack>
    );
}

export function InstallPwaPrompt() {
    const tInstall = useTranslations("pwa.install");
    const tIos = useTranslations("pwa");
    const [mode, setMode] = useState<PromptMode>(null);
    const [open, setOpen] = useState(false);
    const [deferredPrompt, setDeferredPrompt] =
        useState<BeforeInstallPromptEvent | null>(null);
    const [installing, setInstalling] = useState(false);

    useEffect(() => {
        if (typeof window === "undefined") {
            return;
        }

        if (detectStandalone()) {
            return;
        }

        const isIOS = detectIOS();

        if (isIOS) {
            if (localStorage.getItem(IOS_DISMISS_KEY) !== "1") {
                setMode("ios");
                setOpen(true);
            }
            return;
        }

        if (localStorage.getItem(ANDROID_DISMISS_KEY) === "1") {
            return;
        }

        const handleBeforeInstallPrompt = (event: Event) => {
            event.preventDefault();
            setDeferredPrompt(event as BeforeInstallPromptEvent);
            setMode("android");
            setOpen(true);
        };

        window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

        return () => {
            window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
        };
    }, []);

    const handleAndroidDismiss = useCallback(() => {
        localStorage.setItem(ANDROID_DISMISS_KEY, "1");
        setOpen(false);
        setMode(null);
        setDeferredPrompt(null);
    }, []);

    const handleIosDismiss = useCallback(() => {
        localStorage.setItem(IOS_DISMISS_KEY, "1");
        setOpen(false);
        setMode(null);
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
                localStorage.setItem(ANDROID_DISMISS_KEY, "1");
                setOpen(false);
                setMode(null);
            }
        } finally {
            setInstalling(false);
            setDeferredPrompt(null);
        }
    }, [deferredPrompt]);

    if (!mode) {
        return null;
    }

    const handleClose = mode === "ios" ? handleIosDismiss : handleAndroidDismiss;

    return (
        <SwipeableDrawer
            anchor="bottom"
            open={open}
            onClose={handleClose}
            onOpen={() => setOpen(true)}
            disableSwipeToOpen
            PaperProps={{ sx: drawerPaperSx }}
        >
            <DrawerHandle />

            {mode === "ios" ? (
                <>
                    <Box sx={{ display: "flex", alignItems: "flex-start", gap: 2, pr: 4 }}>
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
                                alt={tInstall("logoAlt")}
                                width={56}
                                height={56}
                                priority
                            />
                        </Box>
                        <Typography variant="subtitle1" fontWeight={800}>
                            {tIos("ios_title")}
                        </Typography>
                        <IconButton
                            aria-label={tInstall("dismissAria")}
                            onClick={handleIosDismiss}
                            sx={{ position: "absolute", top: 12, right: 12 }}
                        >
                            <CloseIcon fontSize="small" />
                        </IconButton>
                    </Box>

                    <Stack spacing={2} sx={{ mt: 2.5 }}>
                        <IosInstructionStep
                            step={1}
                            icon={<IosShareIcon fontSize="small" />}
                            text={tIos("ios_step1")}
                        />
                        <IosInstructionStep
                            step={2}
                            icon={<AddCircleOutlineIcon fontSize="small" />}
                            text={tIos("ios_step2")}
                        />
                    </Stack>

                    <Button
                        fullWidth
                        variant="contained"
                        size="large"
                        onClick={handleIosDismiss}
                        sx={{
                            mt: 2.5,
                            borderRadius: 999,
                            textTransform: "none",
                            fontWeight: 700,
                            py: 1.25,
                        }}
                    >
                        {tIos("ios_close")}
                    </Button>
                </>
            ) : (
                <>
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
                                alt={tInstall("logoAlt")}
                                width={56}
                                height={56}
                                priority
                            />
                        </Box>

                        <Box sx={{ flex: 1, minWidth: 0, pr: 4 }}>
                            <Typography variant="subtitle1" fontWeight={800} gutterBottom>
                                {tInstall("title")}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                {tInstall("body")}
                            </Typography>
                        </Box>

                        <IconButton
                            aria-label={tInstall("dismissAria")}
                            onClick={handleAndroidDismiss}
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
                            {tInstall("installCta")}
                        </Button>
                        <Button
                            variant="text"
                            onClick={handleAndroidDismiss}
                            sx={{
                                borderRadius: 999,
                                textTransform: "none",
                                fontWeight: 600,
                                whiteSpace: "nowrap",
                            }}
                        >
                            {tInstall("dismissCta")}
                        </Button>
                    </Box>
                </>
            )}
        </SwipeableDrawer>
    );
}
