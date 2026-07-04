"use client";

import { Box, CircularProgress, Stack, Typography } from "@mui/material";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { useEffect, useMemo, useRef, useState } from "react";

import type { KitchenOrderDto, KitchenOrdersResponse } from "@/lib/kitchen-orders";

import { KitchenOrderCard } from "./KitchenOrderCard";

const POLL_INTERVAL_MS = 5_000;
const SOUND_PATH = "/sounds/new-order.mp3";

const KITCHEN_QUERY_KEY = ["kitchen-orders"] as const;

const CARD_LIST_SX = {
    overflowY: "auto" as const,
    p: 2,
    display: "flex",
    flexDirection: "column" as const,
    gap: 2,
    flex: 1,
    minHeight: 0,
    scrollbarWidth: "none" as const,
    msOverflowStyle: "none" as const,
    "&::-webkit-scrollbar": { display: "none" },
};

function formatClockTime(nowMs: number): string {
    const date = new Date(nowMs);
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");
    return `${hours}:${minutes}`;
}

async function fetchKitchenOrders(): Promise<KitchenOrdersResponse> {
    const res = await fetch("/api/admin/kitchen-orders", {
        credentials: "same-origin",
        cache: "no-store",
    });
    if (!res.ok) {
        throw new Error(await res.text().catch(() => res.statusText));
    }
    return res.json();
}

async function updateOrderStatus(
    orderId: number,
    status: "COOKING" | "DELIVERING" | "DONE",
) {
    const res = await fetch(`/api/admin/orders/${orderId}/status`, {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
    });
    if (!res.ok) {
        throw new Error(await res.text().catch(() => res.statusText));
    }
}

type KitchenColumnProps = {
    title: string;
    orders: KitchenOrderDto[];
    nowMs: number | null;
    emptyLabel: string;
    dimmed?: boolean;
    updatingOrderId: number | null;
    onStartCooking?: (orderId: number) => void;
    onMarkReady?: (orderId: number) => void;
    onPickedUp?: (orderId: number) => void;
    showPickupButton?: boolean;
};

function KitchenColumn({
    title,
    orders,
    nowMs,
    emptyLabel,
    dimmed,
    updatingOrderId,
    onStartCooking,
    onMarkReady,
    onPickedUp,
    showPickupButton,
}: KitchenColumnProps) {
    return (
        <Box
            sx={{
                width: { xs: "85vw", md: 360 },
                flexShrink: 0,
                minHeight: "200px",
                maxHeight: "calc(100vh - 140px)",
                display: "flex",
                flexDirection: "column",
                bgcolor: "#FFFFFF",
                borderRadius: "16px",
                border: "1px solid #E2E8F0",
                boxShadow: "0 1px 3px 0 rgba(0, 0, 0, 0.05)",
            }}
        >
            <Stack
                direction="row"
                alignItems="center"
                spacing={1}
                component="h2"
                sx={{
                    position: "sticky",
                    top: 0,
                    bgcolor: "#FFFFFF",
                    px: 3,
                    py: 2.5,
                    borderBottom: "1px solid #E2E8F0",
                    borderTopLeftRadius: "16px",
                    borderTopRightRadius: "16px",
                    zIndex: 2,
                    m: 0,
                }}
            >
                <Typography
                    component="span"
                    sx={{
                        fontSize: 14,
                        fontWeight: 700,
                        textTransform: "uppercase",
                        letterSpacing: "1px",
                        color: "#64748B",
                    }}
                >
                    {title}
                </Typography>
                <Box
                    component="span"
                    sx={{
                        bgcolor: "#F1F5F9",
                        color: "#0F172A",
                        borderRadius: "20px",
                        px: 1.5,
                        minWidth: 28,
                        textAlign: "center",
                        fontSize: 12,
                        fontWeight: 700,
                        lineHeight: "22px",
                    }}
                >
                    {orders.length}
                </Box>
            </Stack>

            <Box sx={CARD_LIST_SX}>
                {orders.length === 0 ? (
                    <Box
                        sx={{
                            border: "1px dashed #E2E8F0",
                            borderRadius: "12px",
                            p: 3,
                            textAlign: "center",
                            color: "#94A3B8",
                            fontSize: 14,
                        }}
                    >
                        {emptyLabel}
                    </Box>
                ) : (
                    orders.map((order) => (
                        <KitchenOrderCard
                            key={order.id}
                            order={order}
                            nowMs={nowMs}
                            dimmed={dimmed}
                            isUpdating={updatingOrderId === order.id}
                            onStartCooking={
                                onStartCooking ? () => onStartCooking(order.id) : undefined
                            }
                            onMarkReady={
                                onMarkReady ? () => onMarkReady(order.id) : undefined
                            }
                            onPickedUp={
                                showPickupButton &&
                                onPickedUp &&
                                order.deliveryType === "PICKUP"
                                    ? () => onPickedUp(order.id)
                                    : undefined
                            }
                        />
                    ))
                )}
            </Box>
        </Box>
    );
}

export function KitchenBoard() {
    const t = useTranslations("admin.kitchen");
    const queryClient = useQueryClient();
    const [nowMs, setNowMs] = useState<number | null>(null);
    const [updatingOrderId, setUpdatingOrderId] = useState<number | null>(null);
    const prevNewCountRef = useRef<number | null>(null);
    const audioRef = useRef<HTMLAudioElement | null>(null);

    const { data, isLoading, isError, error } = useQuery({
        queryKey: KITCHEN_QUERY_KEY,
        queryFn: fetchKitchenOrders,
        refetchInterval: POLL_INTERVAL_MS,
        refetchIntervalInBackground: true,
        staleTime: 0,
    });

    const statusMutation = useMutation({
        mutationFn: ({
            orderId,
            status,
        }: {
            orderId: number;
            status: "COOKING" | "DELIVERING" | "DONE";
        }) => updateOrderStatus(orderId, status),
        onMutate: ({ orderId }) => {
            setUpdatingOrderId(orderId);
        },
        onSettled: async () => {
            setUpdatingOrderId(null);
            await queryClient.invalidateQueries({ queryKey: KITCHEN_QUERY_KEY });
        },
    });

    useEffect(() => {
        audioRef.current = new Audio(SOUND_PATH);
        audioRef.current.preload = "auto";
    }, []);

    useEffect(() => {
        const newCount = data?.new.length ?? 0;
        if (prevNewCountRef.current !== null && newCount > prevNewCountRef.current) {
            const audio = audioRef.current;
            if (audio) {
                audio.currentTime = 0;
                void audio.play().catch(() => {
                    // Autoplay may be blocked until user interaction on the tablet.
                });
            }
        }
        prevNewCountRef.current = newCount;
    }, [data?.new.length]);

    useEffect(() => {
        // setState только из interval-колбэка (внешняя система - таймер);
        // начальное значение задаёт useState.
        const id = window.setInterval(() => setNowMs(Date.now()), 1_000);
        return () => window.clearInterval(id);
    }, []);

    const board = useMemo(
        () => ({
            new: data?.new ?? [],
            cooking: data?.cooking ?? [],
            readyForHandoff: data?.readyForHandoff ?? [],
        }),
        [data],
    );

    return (
        <>
            <Box
                component="header"
                sx={{
                    px: 4,
                    py: 3,
                    bgcolor: "#FFFFFF",
                    borderBottom: "1px solid #E2E8F0",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                }}
            >
                <Typography
                    component="h1"
                    sx={{
                        fontSize: 24,
                        fontWeight: 700,
                        color: "#0F172A",
                    }}
                >
                    {t("title")}
                </Typography>
                <Typography
                    component="time"
                    {...(nowMs !== null ? { dateTime: new Date(nowMs).toISOString() } : {})}
                    suppressHydrationWarning
                    sx={{
                        fontSize: 24,
                        fontWeight: 500,
                        color: "#64748B",
                        fontVariantNumeric: "tabular-nums",
                    }}
                >
                    {nowMs === null ? "--:--" : formatClockTime(nowMs)}
                </Typography>
            </Box>

            {isLoading ? (
                <Box
                    sx={{
                        flex: 1,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        py: 8,
                    }}
                >
                    <CircularProgress sx={{ color: "#059669" }} size={40} />
                </Box>
            ) : isError ? (
                <Typography sx={{ p: 4, color: "#EF4444", fontSize: 14 }}>
                    {error instanceof Error ? error.message : t("loadFailed")}
                </Typography>
            ) : (
                <Box
                    sx={{
                        display: "flex",
                        gap: 3,
                        p: 4,
                        overflowX: "auto",
                        alignItems: "flex-start",
                        flex: 1,
                        WebkitOverflowScrolling: "touch",
                    }}
                >
                    <KitchenColumn
                        title={t("columnNew")}
                        orders={board.new}
                        nowMs={nowMs}
                        emptyLabel={t("emptyNew")}
                        updatingOrderId={updatingOrderId}
                        onStartCooking={(orderId) =>
                            statusMutation.mutate({ orderId, status: "COOKING" })
                        }
                    />
                    <KitchenColumn
                        title={t("columnCooking")}
                        orders={board.cooking}
                        nowMs={nowMs}
                        emptyLabel={t("emptyCooking")}
                        updatingOrderId={updatingOrderId}
                        onMarkReady={(orderId) =>
                            statusMutation.mutate({ orderId, status: "DELIVERING" })
                        }
                    />
                    <KitchenColumn
                        title={t("columnReady")}
                        orders={board.readyForHandoff}
                        nowMs={nowMs}
                        emptyLabel={t("emptyReady")}
                        dimmed
                        updatingOrderId={updatingOrderId}
                        showPickupButton
                        onPickedUp={(orderId) =>
                            statusMutation.mutate({ orderId, status: "DONE" })
                        }
                    />
                </Box>
            )}
        </>
    );
}
