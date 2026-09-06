"use client";

import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

import { useCartStore } from "@/features/cart";
import { triggerHaptic } from "@/shared/lib/haptic";
import {
    clearJustOrdered,
    hasSeenWelcomePromo,
    isStoreHomePath,
    peekJustOrdered,
    PWA_UI_BLOCK_EVENT,
    todayKey,
} from "@/shared/lib/pwa-install";

import { IosInstallGuide } from "./pwa-install/IosInstallGuide";
import { PwaInstallBanner } from "./pwa-install/PwaInstallBanner";

/** Soft dismiss → snooze; after this many soft dismisses → long cooldown. */
const SOFT_DISMISS_BEFORE_LONG_SNOOZE = 2;
const SHORT_SNOOZE_MS = 7 * 24 * 60 * 60 * 1000;
const LONG_SNOOZE_MS = 90 * 24 * 60 * 60 * 1000;
const MIN_ENGAGEMENT_MS = 5_000;
const SHOW_SETTLE_MS = 1_500;
const STORAGE_KEY = "east-west-pwa-install-v3";
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
    lastVisitDay: string;
    visitDayCount: number;
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

function emptyVisitFields(): Pick<InstallStorage, "lastVisitDay" | "visitDayCount"> {
    return { lastVisitDay: "", visitDayCount: 0 };
}

function readStorage(): InstallStorage {
    const defaults: InstallStorage = {
        dismissCount: 0,
        snoozeUntil: 0,
        permanentlyDismissed: false,
        ...emptyVisitFields(),
    };

    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
            const parsed = JSON.parse(raw) as Partial<InstallStorage>;
            return {
                dismissCount: Number(parsed.dismissCount) || 0,
                snoozeUntil: Number(parsed.snoozeUntil) || 0,
                permanentlyDismissed: Boolean(parsed.permanentlyDismissed),
                lastVisitDay: parsed.lastVisitDay ?? "",
                visitDayCount: Number(parsed.visitDayCount) || 0,
            };
        }

        if (
            localStorage.getItem(LEGACY_ANDROID_KEY) === "1" ||
            localStorage.getItem(LEGACY_IOS_KEY) === "1"
        ) {
            const migrated: InstallStorage = {
                dismissCount: 1,
                snoozeUntil: Date.now() + SHORT_SNOOZE_MS,
                permanentlyDismissed: false,
                ...emptyVisitFields(),
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

/** Safari/Chrome keep localStorage after the home-screen app is deleted. */
function recoverAfterUninstall(storage: InstallStorage): InstallStorage {
    if (!storage.permanentlyDismissed) return storage;
    const next: InstallStorage = {
        ...storage,
        permanentlyDismissed: false,
        snoozeUntil: 0,
    };
    writeStorage(next);
    return next;
}

function hidePromptForSession() {
    try {
        sessionStorage.setItem(SESSION_SHOWN_KEY, "1");
    } catch {
        /* ignore */
    }
}

function isBlockedPath(pathname: string, justOrdered: boolean): boolean {
    if (pathname.includes("/checkout") || pathname.includes("/admin")) {
        return true;
    }
    if (pathname.includes("/order/")) {
        return !justOrdered;
    }
    return false;
}

export function InstallPwaPrompt() {
    const pathname = usePathname() ?? "";
    const cartCount = useCartStore((s) => s.items.length);

    const [platform, setPlatform] = useState<PromptPlatform | null>(null);
    const [bannerOpen, setBannerOpen] = useState(false);
    const [iosGuideOpen, setIosGuideOpen] = useState(false);
    const [afterOrder, setAfterOrder] = useState(false);
    const [deferredPrompt, setDeferredPrompt] =
        useState<BeforeInstallPromptEvent | null>(null);
    const [installing, setInstalling] = useState(false);
    const [eligible, setEligible] = useState(false);
    const [promoBlocking, setPromoBlocking] = useState(false);

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
            ...prev,
            dismissCount,
            snoozeUntil: Date.now() + snoozeMs,
            permanentlyDismissed: permanent,
        });

        setBannerOpen(false);
        setIosGuideOpen(false);
        hidePromptForSession();
    }, []);

    const dismissSoft = useCallback(() => {
        if (document.activeElement instanceof HTMLElement) {
            document.activeElement.blur();
        }
        triggerHaptic("light");
        snooze(false);
    }, [snooze]);

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
                ...readStorage(),
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

    useEffect(() => {
        if (typeof window === "undefined") return;

        if (!isStoreHomePath(pathname) || hasSeenWelcomePromo()) {
            setPromoBlocking(false);
        } else {
            setPromoBlocking(true);
        }

        const onBlock = (event: Event) => {
            setPromoBlocking(Boolean((event as CustomEvent<boolean>).detail));
        };
        window.addEventListener(PWA_UI_BLOCK_EVENT, onBlock);
        return () => window.removeEventListener(PWA_UI_BLOCK_EVENT, onBlock);
    }, [pathname]);

    useEffect(() => {
        if (typeof window === "undefined" || detectStandalone()) return;
        if (engagementStartedRef.current) return;
        engagementStartedRef.current = true;

        const storage = recoverAfterUninstall(readStorage());
        if (storage.permanentlyDismissed) return;

        const today = todayKey();
        let visitDays = storage.visitDayCount;
        if (storage.lastVisitDay !== today) {
            visitDays = storage.visitDayCount + 1;
            writeStorage({
                ...storage,
                lastVisitDay: today,
                visitDayCount: visitDays,
            });
        }

        if (peekJustOrdered() || visitDays >= 2) {
            markEngaged();
            return;
        }

        const timer = window.setTimeout(() => {
            markEngaged();
        }, MIN_ENGAGEMENT_MS);

        return () => window.clearTimeout(timer);
    }, [markEngaged]);

    useEffect(() => {
        if (cartCount > 0) markEngaged();
    }, [cartCount, markEngaged]);

    useEffect(() => {
        if (peekJustOrdered()) markEngaged();
    }, [pathname, markEngaged]);

    useEffect(() => {
        if (!eligible || !platform) return;
        if (detectStandalone()) return;

        const justOrdered = peekJustOrdered();
        if (isBlockedPath(pathname, justOrdered) || promoBlocking) {
            setBannerOpen(false);
            setIosGuideOpen(false);
            return;
        }

        const storage = recoverAfterUninstall(readStorage());
        if (storage.permanentlyDismissed) return;
        if (!justOrdered && storage.snoozeUntil > Date.now()) return;

        try {
            if (!justOrdered && sessionStorage.getItem(SESSION_SHOWN_KEY) === "1") {
                return;
            }
        } catch {
            /* ignore */
        }

        if (platform === "android" && !deferredPrompt) return;

        if (showTimerRef.current != null) {
            window.clearTimeout(showTimerRef.current);
        }

        showTimerRef.current = window.setTimeout(() => {
            setAfterOrder(justOrdered);
            setBannerOpen(true);
            clearJustOrdered();
            hidePromptForSession();
        }, SHOW_SETTLE_MS);

        return () => {
            if (showTimerRef.current != null) {
                window.clearTimeout(showTimerRef.current);
                showTimerRef.current = null;
            }
        };
    }, [eligible, platform, deferredPrompt, pathname, promoBlocking]);

    const handleInstall = useCallback(async () => {
        triggerHaptic("medium");
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
                    ...readStorage(),
                    dismissCount: 0,
                    snoozeUntil: Number.MAX_SAFE_INTEGER,
                    permanentlyDismissed: true,
                });
                setBannerOpen(false);
            } else {
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
        triggerHaptic("light");
        setIosGuideOpen(false);
        setBannerOpen(false);
        hidePromptForSession();
    }, []);

    if (!platform) return null;

    return (
        <>
            <PwaInstallBanner
                open={bannerOpen && !iosGuideOpen}
                platform={platform}
                afterOrder={afterOrder}
                installing={installing}
                onInstall={() => void handleInstall()}
                onDismiss={dismissSoft}
            />
            <IosInstallGuide open={iosGuideOpen} onClose={closeIosGuide} />
        </>
    );
}
