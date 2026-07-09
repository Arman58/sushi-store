"use client";

import AddCircleOutlineIcon from "@mui/icons-material/AddCircleOutline";
import CloseIcon from "@mui/icons-material/Close";
import GetAppOutlinedIcon from "@mui/icons-material/GetAppOutlined";
import IosShareIcon from "@mui/icons-material/IosShare";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Collapse from "@mui/material/Collapse";
import IconButton from "@mui/material/IconButton";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import SwipeableDrawer from "@mui/material/SwipeableDrawer";
import Typography from "@mui/material/Typography";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import {
    type ReactNode,
    useCallback,
    useEffect,
    useRef,
    useState,
} from "react";

import { useCartStore } from "@/features/cart";

/** Soft dismiss → snooze; after this many soft dismisses → long cooldown. */
const SOFT_DISMISS_BEFORE_LONG_SNOOZE = 2;
const SHORT_SNOOZE_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const LONG_SNOOZE_MS = 90 * 24 * 60 * 60 * 1000; // 90 days
/** Min time on site before first soft prompt (marketplace-style). */
const MIN_ENGAGEMENT_MS = 45_000;
/** Extra settle delay after eligibility so we never flash over first paint. */
const SHOW_SETTLE_MS = 2_500;
const STORAGE_KEY = "east-west-pwa-install-v2";
const LEGACY_ANDROID_KEY = "east-west-pwa-install-dismissed";
const LEGACY_IOS_KEY = "ios-pwa-prompt-dismissed";
const SESSION_SHOWN_KEY = "east-west-pwa-install-shown";

type BeforeInstallPromptEvent = Event & {
    prompt: () => Promise<void>;
    userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

type PromptPlatform = "android" | "ios";

type InstallStorage = {
    dismissCount: number;
    snoozeUntil: number;
    permanentlyDismissed: boolean;
};

type IosInstructionStepProps = {
    icon: ReactNode;
    text: string;
    step: number;
};

function detectIOS(): boolean {
    if (typeof navigator === "undefined") return false;
    return (
        /iPad|iPhone|iPod/.test(navigator.userAgent) ||
        (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
    );
}

function detectStandalone(): boolean {
    if (typeof window === "undefined") return false;
    return (
        window.matchMedia("(display-mode: standalone)").matches ||
        ("standalone" in navigator &&
            (navigator as Navigator & { standalone?: boolean }).standalone === true)
    );
}

function readStorage(): InstallStorage {
    const defaults: InstallStorage = {
        dismissCount: 0,
        snoozeUntil: 0,
        permanentlyDismissed: false,
    };

    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
            const parsed = JSON.parse(raw) as Partial<InstallStorage>;
            return {
                dismissCount: Number(parsed.dismissCount) || 0,
                snoozeUntil: Number(parsed.snoozeUntil) || 0,
                permanentlyDismissed: Boolean(parsed.permanentlyDismissed),
            };
        }

        // Migrate legacy one-shot dismiss keys into a long snooze (not forever —
        // users who dismissed the old aggressive drawer get a break, then a soft banner).
        if (
            localStorage.getItem(LEGACY_ANDROID_KEY) === "1" ||
            localStorage.getItem(LEGACY_IOS_KEY) === "1"
        ) {
            const migrated: InstallStorage = {
                dismissCount: 1,
                snoozeUntil: Date.now() + SHORT_SNOOZE_MS,
                permanentlyDismissed: false,
            };
            localStorage.setItem(STORAGE_KEY, JSON.stringify(migrated));
            localStorage.removeItem(LEGACY_ANDROID_KEY);
            localStorage.removeItem(LEGACY_IOS_KEY);
            return migrated;
        }
    } catch {
        /* private mode / blocked storage */
    }

    return defaults;
}

function writeStorage(next: InstallStorage) {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
        /* ignore */
    }
}

function isBlockedPath(pathname: string): boolean {
    // Avoid competing with checkout / auth / order tracking focus.
    return (
        pathname.includes("/checkout") ||
        pathname.includes("/order/") ||
        pathname.includes("/admin")
    );
}

function IosInstructionStep({ icon, text, step }: IosInstructionStepProps) {
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
    const pathname = usePathname() ?? "";
    const cartCount = useCartStore((s) => s.items.length);

    const [platform, setPlatform] = useState<PromptPlatform | null>(null);
    const [bannerOpen, setBannerOpen] = useState(false);
    const [iosGuideOpen, setIosGuideOpen] = useState(false);
    const [deferredPrompt, setDeferredPrompt] =
        useState<BeforeInstallPromptEvent | null>(null);
    const [installing, setInstalling] = useState(false);
    const [eligible, setEligible] = useState(false);

    const showTimerRef = useRef<number | null>(null);
    const engagementStartedRef = useRef(false);

    const markEngaged = useCallback(() => {
        setEligible(true);
    }, []);

    const snooze = useCallback((permanent = false) => {
        const prev = readStorage();
        const dismissCount = permanent ? prev.dismissCount : prev.dismissCount + 1;
        const snoozeMs =
            permanent || dismissCount >= SOFT_DISMISS_BEFORE_LONG_SNOOZE
                ? LONG_SNOOZE_MS
                : SHORT_SNOOZE_MS;

        writeStorage({
            dismissCount,
            snoozeUntil: Date.now() + snoozeMs,
            permanentlyDismissed: permanent,
        });

        setBannerOpen(false);
        setIosGuideOpen(false);
        try {
            sessionStorage.setItem(SESSION_SHOWN_KEY, "1");
        } catch {
            /* ignore */
        }
    }, []);

    const dismissSoft = useCallback(() => {
        if (document.activeElement instanceof HTMLElement) {
            document.activeElement.blur();
        }
        snooze(false);
    }, [snooze]);

    // Capture beforeinstallprompt without showing UI (Chrome best practice).
    useEffect(() => {
        if (typeof window === "undefined" || detectStandalone()) return;

        const isIOS = detectIOS();
        setPlatform(isIOS ? "ios" : "android");

        if (isIOS) return;

        const handleBeforeInstallPrompt = (event: Event) => {
            event.preventDefault();
            setDeferredPrompt(event as BeforeInstallPromptEvent);
        };

        const handleAppInstalled = () => {
            writeStorage({
                dismissCount: 0,
                snoozeUntil: Number.MAX_SAFE_INTEGER,
                permanentlyDismissed: true,
            });
            setBannerOpen(false);
            setDeferredPrompt(null);
        };

        window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
        window.addEventListener("appinstalled", handleAppInstalled);

        return () => {
            window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
            window.removeEventListener("appinstalled", handleAppInstalled);
        };
    }, []);

    // Engagement: time on site, return visit in session, or cart activity.
    useEffect(() => {
        if (typeof window === "undefined" || detectStandalone()) return;
        if (engagementStartedRef.current) return;
        engagementStartedRef.current = true;

        const storage = readStorage();
        if (storage.permanentlyDismissed || storage.snoozeUntil > Date.now()) {
            return;
        }

        try {
            if (sessionStorage.getItem(SESSION_SHOWN_KEY) === "1") return;
        } catch {
            /* ignore */
        }

        const visitKey = "east-west-pwa-visits";
        let visits = 1;
        try {
            visits = Number(sessionStorage.getItem(visitKey) ?? "0") + 1;
            sessionStorage.setItem(visitKey, String(visits));
        } catch {
            /* ignore */
        }

        // Existing cart (hydrated) or a return visit in this tab → show sooner.
        if (visits >= 2) {
            markEngaged();
            return;
        }

        const timer = window.setTimeout(() => {
            markEngaged();
        }, MIN_ENGAGEMENT_MS);

        return () => window.clearTimeout(timer);
    }, [markEngaged]);

    // Cart activity counts as engagement (marketplace pattern: prompt after intent).
    useEffect(() => {
        if (cartCount > 0) markEngaged();
    }, [cartCount, markEngaged]);

    // Show soft banner only when eligible + platform ready + not on blocked paths.
    useEffect(() => {
        if (!eligible || !platform) return;
        if (detectStandalone()) return;
        if (isBlockedPath(pathname)) {
            setBannerOpen(false);
            return;
        }

        const storage = readStorage();
        if (storage.permanentlyDismissed || storage.snoozeUntil > Date.now()) {
            return;
        }

        try {
            if (sessionStorage.getItem(SESSION_SHOWN_KEY) === "1") return;
        } catch {
            /* ignore */
        }

        // Android: wait until we can actually install (have deferred prompt).
        if (platform === "android" && !deferredPrompt) return;

        if (showTimerRef.current != null) {
            window.clearTimeout(showTimerRef.current);
        }

        showTimerRef.current = window.setTimeout(() => {
            setBannerOpen(true);
            try {
                sessionStorage.setItem(SESSION_SHOWN_KEY, "1");
            } catch {
                /* ignore */
            }
        }, SHOW_SETTLE_MS);

        return () => {
            if (showTimerRef.current != null) {
                window.clearTimeout(showTimerRef.current);
                showTimerRef.current = null;
            }
        };
    }, [eligible, platform, deferredPrompt, pathname]);

    const handleInstall = useCallback(async () => {
        if (platform === "ios") {
            setIosGuideOpen(true);
            return;
        }

        if (!deferredPrompt) return;

        setInstalling(true);
        try {
            await deferredPrompt.prompt();
            const choice = await deferredPrompt.userChoice;
            if (choice.outcome === "accepted") {
                writeStorage({
                    dismissCount: 0,
                    snoozeUntil: Number.MAX_SAFE_INTEGER,
                    permanentlyDismissed: true,
                });
                setBannerOpen(false);
            } else {
                // Native sheet dismissed — snooze so we don't nag on every navigation.
                snooze(false);
            }
        } finally {
            setInstalling(false);
            setDeferredPrompt(null);
        }
    }, [deferredPrompt, platform, snooze]);

    const closeIosGuide = useCallback(() => {
        if (document.activeElement instanceof HTMLElement) {
            document.activeElement.blur();
        }
        setIosGuideOpen(false);
        snooze(false);
    }, [snooze]);

    if (!platform) return null;

    return (
        <>
            <Collapse in={bannerOpen && !iosGuideOpen} unmountOnExit>
                <Box
                    sx={{
                        position: "fixed",
                        left: 0,
                        right: 0,
                        bottom: {
                            xs: "calc(72px + env(safe-area-inset-bottom))",
                            sm: "calc(16px + env(safe-area-inset-bottom))",
                        },
                        zIndex: 1150,
                        px: { xs: 1.5, sm: 2 },
                        pointerEvents: "none",
                        display: "flex",
                        justifyContent: "center",
                    }}
                >
                    <Paper
                        elevation={8}
                        sx={{
                            pointerEvents: "auto",
                            width: "100%",
                            maxWidth: 480,
                            borderRadius: 3,
                            px: 1.5,
                            py: 1.25,
                            display: "flex",
                            alignItems: "center",
                            gap: 1.25,
                            border: "1px solid",
                            borderColor: "divider",
                            bgcolor: "background.paper",
                        }}
                    >
                        <Box
                            sx={{
                                width: 40,
                                height: 40,
                                borderRadius: 2,
                                overflow: "hidden",
                                flexShrink: 0,
                            }}
                        >
                            <Image
                                src="/pwa/icon-192x192.png"
                                alt={tInstall("logoAlt")}
                                width={40}
                                height={40}
                            />
                        </Box>

                        <Box sx={{ flex: 1, minWidth: 0 }}>
                            <Typography variant="body2" fontWeight={800} noWrap>
                                {tInstall("title")}
                            </Typography>
                            <Typography
                                variant="caption"
                                color="text.secondary"
                                sx={{
                                    display: "-webkit-box",
                                    WebkitLineClamp: 2,
                                    WebkitBoxOrient: "vertical",
                                    overflow: "hidden",
                                }}
                            >
                                {tInstall("body")}
                            </Typography>
                        </Box>

                        <Button
                            size="small"
                            variant="contained"
                            onClick={() => void handleInstall()}
                            disabled={installing}
                            startIcon={
                                platform === "android" ? (
                                    <GetAppOutlinedIcon sx={{ fontSize: 16 }} />
                                ) : undefined
                            }
                            sx={{
                                flexShrink: 0,
                                borderRadius: 999,
                                textTransform: "none",
                                fontWeight: 700,
                                px: 1.5,
                                minWidth: 0,
                            }}
                        >
                            {tInstall("installCta")}
                        </Button>

                        <IconButton
                            size="small"
                            aria-label={tInstall("dismissAria")}
                            onClick={dismissSoft}
                            sx={{ flexShrink: 0, ml: -0.5 }}
                        >
                            <CloseIcon fontSize="small" />
                        </IconButton>
                    </Paper>
                </Box>
            </Collapse>

            <SwipeableDrawer
                anchor="bottom"
                open={iosGuideOpen}
                onClose={closeIosGuide}
                onOpen={() => setIosGuideOpen(true)}
                disableSwipeToOpen
                disableRestoreFocus
                disableScrollLock
                PaperProps={{
                    sx: {
                        borderTopLeftRadius: 20,
                        borderTopRightRadius: 20,
                        px: 2.5,
                        pt: 1.5,
                        pb: "calc(24px + env(safe-area-inset-bottom))",
                        bgcolor: "background.paper",
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

                <Box sx={{ display: "flex", alignItems: "flex-start", gap: 2, pr: 4 }}>
                    <Box
                        sx={{
                            width: 56,
                            height: 56,
                            borderRadius: 3,
                            overflow: "hidden",
                            flexShrink: 0,
                        }}
                    >
                        <Image
                            src="/pwa/icon-192x192.png"
                            alt={tInstall("logoAlt")}
                            width={56}
                            height={56}
                        />
                    </Box>
                    <Typography variant="subtitle1" fontWeight={800} sx={{ pt: 0.5 }}>
                        {tIos("ios_title")}
                    </Typography>
                    <IconButton
                        aria-label={tInstall("dismissAria")}
                        onClick={closeIosGuide}
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
                    onClick={closeIosGuide}
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
            </SwipeableDrawer>
        </>
    );
}
