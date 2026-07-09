"use client";

import RefreshIcon from "@mui/icons-material/Refresh";
import Box from "@mui/material/Box";
import CircularProgress from "@mui/material/CircularProgress";
import { alpha, useTheme } from "@mui/material/styles";
import { usePathname, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useRef, useState } from "react";

import { useMobileViewport } from "@/shared/lib/use-mobile-viewport";

const PULL_THRESHOLD = 72;
const MAX_PULL = 96;

/**
 * Pull-to-refresh без non-passive touch-слушателей:
 * только passive listeners, без preventDefault — не блокирует тапы.
 */
export function PullToRefresh() {
    const router = useRouter();
    const pathname = usePathname();
    const theme = useTheme();
    const t = useTranslations("common");
    const isMobile = useMobileViewport();
    const [pull, setPull] = useState(0);
    const [refreshing, setRefreshing] = useState(false);
    const pullRef = useRef(0);
    const touchRef = useRef({ startY: 0, tracking: false });

    const disabled =
        !isMobile ||
        pathname.startsWith("/admin") ||
        pathname.includes("/checkout");

    const finishRefresh = useCallback(async () => {
        setRefreshing(true);
        setPull(0);
        pullRef.current = 0;
        router.refresh();
        await new Promise((resolve) => window.setTimeout(resolve, 450));
        setRefreshing(false);
    }, [router]);

    useEffect(() => {
        if (disabled) return;

        const getScrollTop = () =>
            window.scrollY || document.documentElement.scrollTop || 0;

        const onTouchStart = (event: TouchEvent) => {
            if (refreshing || getScrollTop() > 2) {
                touchRef.current.tracking = false;
                return;
            }
            touchRef.current = {
                startY: event.touches[0]?.clientY ?? 0,
                tracking: true,
            };
        };

        const onTouchMove = (event: TouchEvent) => {
            if (!touchRef.current.tracking || refreshing) return;
            if (getScrollTop() > 2) {
                touchRef.current.tracking = false;
                pullRef.current = 0;
                setPull(0);
                return;
            }
            const delta =
                (event.touches[0]?.clientY ?? 0) - touchRef.current.startY;
            if (delta > 0) {
                const next = Math.min(delta * 0.45, MAX_PULL);
                pullRef.current = next;
                setPull(next);
            } else {
                touchRef.current.tracking = false;
                pullRef.current = 0;
                setPull(0);
            }
        };

        const onTouchEnd = () => {
            if (!touchRef.current.tracking) return;
            touchRef.current.tracking = false;
            if (pullRef.current >= PULL_THRESHOLD) {
                void finishRefresh();
                return;
            }
            pullRef.current = 0;
            setPull(0);
        };

        window.addEventListener("touchstart", onTouchStart, { passive: true });
        window.addEventListener("touchmove", onTouchMove, { passive: true });
        window.addEventListener("touchend", onTouchEnd, { passive: true });
        window.addEventListener("touchcancel", onTouchEnd, { passive: true });

        return () => {
            window.removeEventListener("touchstart", onTouchStart);
            window.removeEventListener("touchmove", onTouchMove);
            window.removeEventListener("touchend", onTouchEnd);
            window.removeEventListener("touchcancel", onTouchEnd);
        };
    }, [disabled, finishRefresh, refreshing]);

    if (disabled) return null;

    const visible = pull > 4 || refreshing;
    const progress = refreshing
        ? 1
        : Math.min(pull / PULL_THRESHOLD, 1);

    return (
        <Box
            aria-hidden={!visible}
            aria-live="polite"
            sx={{
                position: "fixed",
                top: "calc(56px + env(safe-area-inset-top))",
                left: 0,
                right: 0,
                zIndex: 1250,
                display: "flex",
                justifyContent: "center",
                pointerEvents: "none",
                transform: `translateY(${visible ? pull * 0.35 : 0}px)`,
                opacity: visible ? Math.min(progress + 0.15, 1) : 0,
                transition: pull > 0 ? "none" : "opacity 0.2s ease, transform 0.2s ease",
            }}
        >
            <Box
                sx={{
                    mt: 1,
                    width: 36,
                    height: 36,
                    borderRadius: "50%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    bgcolor: alpha(theme.palette.background.paper, 0.96),
                    border: `1px solid ${alpha(theme.palette.divider, 0.9)}`,
                    boxShadow: `0 4px 14px ${alpha(theme.palette.common.black, 0.12)}`,
                }}
            >
                {refreshing ? (
                    <CircularProgress size={18} aria-label={t("loading")} />
                ) : (
                    <RefreshIcon
                        sx={{
                            fontSize: 20,
                            color: "primary.main",
                            transform: `rotate(${progress * 180}deg)`,
                            transition: "transform 0.1s linear",
                        }}
                    />
                )}
            </Box>
        </Box>
    );
}
