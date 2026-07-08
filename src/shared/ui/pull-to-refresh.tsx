"use client";

import ArrowDownwardIcon from "@mui/icons-material/ArrowDownward";
import Box from "@mui/material/Box";
import CircularProgress from "@mui/material/CircularProgress";
import Paper from "@mui/material/Paper";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState, useTransition } from "react";

import { triggerHaptic } from "@/shared/lib/haptic";

import { tokens } from "./theme";

const PULL_THRESHOLD = 80; // Distance required to trigger refresh (px)
const MAX_PULL = 130; // Hard limit on pull distance (px)
const RESISTANCE = 0.45; // Pull damping factor
const MIN_SPINNER_MS = 350; // Spinner visible long enough to feel intentional

export function PullToRefresh() {
    const router = useRouter();
    const queryClient = useQueryClient();
    const [isRefreshPending, startRefresh] = useTransition();

    const [pullDistance, setPullDistance] = useState(0);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [isPulling, setIsPulling] = useState(false);

    const startYRef = useRef<number | null>(null);
    const isAtTopRef = useRef(true);

    // Мягкое обновление завершилось (RSC refetch) - убираем спиннер.
    useEffect(() => {
        if (!isRefreshing || isRefreshPending) return;
        const timer = window.setTimeout(() => {
            setIsRefreshing(false);
            setPullDistance(0);
        }, MIN_SPINNER_MS);
        return () => window.clearTimeout(timer);
    }, [isRefreshing, isRefreshPending]);

    useEffect(() => {
        if (typeof window === "undefined") return;

        const checkScroll = () => {
            const scrollTop = window.scrollY || document.documentElement.scrollTop;
            isAtTopRef.current = scrollTop <= 0;
        };

        window.addEventListener("scroll", checkScroll, { passive: true });
        return () => window.removeEventListener("scroll", checkScroll);
    }, []);

    useEffect(() => {
        if (typeof window === "undefined") return;

        const handleTouchStart = (e: TouchEvent) => {
            if (isRefreshing) return;
            
            // Check if we are at the top
            const scrollTop = window.scrollY || document.documentElement.scrollTop;
            isAtTopRef.current = scrollTop <= 0;

            if (isAtTopRef.current) {
                startYRef.current = e.touches[0].pageY;
            }
        };

        const handleTouchMove = (e: TouchEvent) => {
            if (startYRef.current === null || isRefreshing) return;

            const currentY = e.touches[0].pageY;
            const diffY = currentY - startYRef.current;

            if (diffY > 0 && isAtTopRef.current) {
                setIsPulling(true);
                // Apply exponential damping / resistance
                const pulled = Math.min(MAX_PULL, diffY * RESISTANCE);
                setPullDistance(pulled);

                // Prevent default native scroll bounce on mobile when pulling
                if (e.cancelable) {
                    e.preventDefault();
                }
            }
        };

        const handleTouchEnd = () => {
            if (startYRef.current === null || isRefreshing) return;

            startYRef.current = null;
            setIsPulling(false);

            if (pullDistance >= PULL_THRESHOLD) {
                setIsRefreshing(true);
                setPullDistance(PULL_THRESHOLD);
                triggerHaptic("medium");

                // Мягкий refresh: RSC-данные + клиентские query,
                // без полной перезагрузки и потери скролла/состояния.
                void queryClient.invalidateQueries();
                startRefresh(() => {
                    router.refresh();
                });
            } else {
                setPullDistance(0);
            }
        };

        window.addEventListener("touchstart", handleTouchStart, { passive: false });
        window.addEventListener("touchmove", handleTouchMove, { passive: false });
        window.addEventListener("touchend", handleTouchEnd, { passive: true });

        return () => {
            window.removeEventListener("touchstart", handleTouchStart);
            window.removeEventListener("touchmove", handleTouchMove);
            window.removeEventListener("touchend", handleTouchEnd);
        };
    }, [pullDistance, isRefreshing]);

    const isVisible = pullDistance > 0 || isRefreshing;
    const progress = Math.min(1, pullDistance / PULL_THRESHOLD);
    const rotation = progress * 360;

    if (!isVisible) return null;

    return (
        <Box
            sx={{
                position: "fixed",
                top: 0,
                left: 0,
                right: 0,
                display: "flex",
                justifyContent: "center",
                zIndex: 2000, // Above everything, including sticky headers and drawer overlays
                pointerEvents: "none",
                transform: `translateY(${Math.max(-40, pullDistance - 50)}px)`,
                transition: isPulling ? "none" : "transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)",
            }}
        >
            <Paper
                elevation={3}
                sx={{
                    width: 40,
                    height: 40,
                    borderRadius: "50%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    bgcolor: "var(--ew-surface)",
                    border: "1px solid",
                    borderColor: tokens.border,
                    boxShadow: "0 4px 16px rgba(0, 0, 0, 0.15)",
                }}
            >
                {isRefreshing ? (
                    <CircularProgress
                        size={20}
                        thickness={5}
                        sx={{ color: tokens.brand }}
                    />
                ) : (
                    <ArrowDownwardIcon
                        sx={{
                            fontSize: 18,
                            color: progress >= 1 ? tokens.brand : "text.secondary",
                            transform: `rotate(${rotation}deg)`,
                            transition: "color 0.2s ease, transform 0.05s linear",
                        }}
                    />
                )}
            </Paper>
        </Box>
    );
}
