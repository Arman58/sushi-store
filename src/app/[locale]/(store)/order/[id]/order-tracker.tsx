"use client";

import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import LocalShippingOutlinedIcon from "@mui/icons-material/LocalShippingOutlined";
import ReplayIcon from "@mui/icons-material/Replay";
import RestaurantMenuOutlinedIcon from "@mui/icons-material/RestaurantMenuOutlined";
import ScheduleOutlinedIcon from "@mui/icons-material/ScheduleOutlined";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Divider from "@mui/material/Divider";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Step from "@mui/material/Step";
import StepLabel from "@mui/material/StepLabel";
import Stepper from "@mui/material/Stepper";
import { alpha, useTheme } from "@mui/material/styles";
import Typography from "@mui/material/Typography";
import type { OrderStatus } from "@prisma/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";

import { ModifiersList, parseSelectedModifiersJson, useCartStore } from "@/features/cart";
import type { CartModifierSnapshot } from "@/features/cart/model/types";
import { useRouter } from "@/i18n/server";
import {
    formatEstimatedDeliveryTime,
    trackingActiveStep,
} from "@/lib/order-status";
import type { OrderStatusResponse } from "@/shared/api/order-api";
import { storePriceFormatter } from "@/shared/lib/format-price";
import { translateOrderStatus } from "@/shared/lib/order-status-labels";
import { tokens } from "@/shared/ui/theme";

import { RateOrderItems } from "./rate-order-items";

const POLL_INTERVAL_MS = 5_000;
const TERMINAL_STATUSES = new Set<OrderStatus>(["DONE", "CANCELLED"]);

const STEP_KEYS = ["NEW", "COOKING", "DELIVERING", "DONE"] as const satisfies readonly OrderStatus[];

const STEP_ICONS: Record<(typeof STEP_KEYS)[number], ReactNode> = {
    NEW: <ScheduleOutlinedIcon />,
    COOKING: <RestaurantMenuOutlinedIcon />,
    DELIVERING: <LocalShippingOutlinedIcon />,
    DONE: <CheckCircleOutlineIcon />,
};

function parseModifiersSnapshot(raw: unknown): CartModifierSnapshot[] {
    if (!Array.isArray(raw)) return [];
    const out: CartModifierSnapshot[] = [];
    for (const m of raw) {
        if (!m || typeof m !== "object") continue;
        const id = (m as { id?: unknown }).id;
        const name = (m as { name?: unknown }).name;
        const priceDelta = (m as { priceDelta?: unknown }).priceDelta;
        if (
            typeof id === "number" &&
            Number.isInteger(id) &&
            id > 0 &&
            typeof name === "string"
        ) {
            out.push({
                id,
                name,
                priceDelta: typeof priceDelta === "number" ? priceDelta : 0,
            });
        }
    }
    return out;
}

function normalizeEstimatedDeliveryAt(value: string | Date | null | undefined): Date | null {
    if (value == null) return null;
    const date = value instanceof Date ? value : new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
}

function EtaPanel({
    estimatedDeliveryAt,
    status,
}: {
    estimatedDeliveryAt: string | null;
    status: OrderStatus;
}) {
    const tStatus = useTranslations("order.status");
    const tTracker = useTranslations("order.tracker");
    const [tick, setTick] = useState(() => Date.now());

    const etaDate = useMemo(
        () => normalizeEstimatedDeliveryAt(estimatedDeliveryAt),
        [estimatedDeliveryAt],
    );

    useEffect(() => {
        if (!etaDate || status === "DONE" || status === "CANCELLED") return;
        const id = window.setInterval(() => setTick(Date.now()), 30_000);
        return () => window.clearInterval(id);
    }, [etaDate, status]);

    if (status === "DONE" || status === "CANCELLED") return null;

    if (!etaDate) {
        return (
            <Alert severity="info" icon={false} sx={{ borderRadius: 2 }}>
                {tStatus("etaPending")}
            </Alert>
        );
    }

    const remainingMs = etaDate.getTime() - tick;
    const isOverdue = remainingMs <= 0;
    const remainingMin = Math.max(1, Math.ceil(remainingMs / 60_000));

    return (
        <Stack spacing={1}>
            {isOverdue ? (
                <Alert severity="warning" sx={{ borderRadius: 2 }}>
                    {tTracker("overdue")}
                </Alert>
            ) : null}
            <Paper
                variant="outlined"
                sx={{
                    p: 2,
                    borderRadius: 2.5,
                    bgcolor: alpha("#00B341", 0.05),
                    borderColor: alpha("#00B341", 0.2),
                }}
            >
                <Typography fontWeight={700}>
                    {tStatus("etaUntil", {
                        time: formatEstimatedDeliveryTime(etaDate),
                    })}
                </Typography>
                {!isOverdue && (
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                        {tTracker("remainingMin", { n: remainingMin })}
                    </Typography>
                )}
            </Paper>
        </Stack>
    );
}

type OrderTrackerProps = {
    order: OrderStatusResponse;
    phone: string;
};

export function OrderTracker({ order: initial, phone }: OrderTrackerProps) {
    const theme = useTheme();
    const router = useRouter();
    const addItem = useCartStore((s) => s.addItem);
    const tTracker = useTranslations("order.tracker");
    const tStatus = useTranslations("order.status");
    const tDelivery = useTranslations("checkout.delivery.type");
    const tPayment = useTranslations("order.payment");
    const tOrder = useTranslations("order");
    const tCart = useTranslations("cart");

    const numberFormatter = storePriceFormatter;

    const steps = useMemo(
        () =>
            STEP_KEYS.map((key) => ({
                key,
                label: translateOrderStatus(key, tStatus),
                icon: STEP_ICONS[key],
            })),
        [tStatus],
    );

    const { data, dataUpdatedAt, isFetching, refetch } = useQuery<OrderStatusResponse>({
        queryKey: ["order", initial.id],
        queryFn: async () => {
            const qs = new URLSearchParams({ id: String(initial.id) });
            if (phone.trim()) {
                qs.set("phone", phone);
            }

            const res = await fetch(`/api/order-status?${qs.toString()}`, {
                method: "GET",
                cache: "no-store",
                credentials: "same-origin",
            });
            if (!res.ok) {
                throw new Error(await res.text().catch(() => res.statusText));
            }
            const json = await res.json();
            return {
                ...json,
                createdAt:
                    typeof json.createdAt === "string"
                        ? json.createdAt
                        : new Date(json.createdAt).toISOString(),
                estimatedDeliveryAt: json.estimatedDeliveryAt
                    ? typeof json.estimatedDeliveryAt === "string"
                        ? json.estimatedDeliveryAt
                        : new Date(json.estimatedDeliveryAt).toISOString()
                    : null,
            } satisfies OrderStatusResponse;
        },
        initialData: initial,
        staleTime: 4_000,
        refetchOnMount: "always",
        refetchOnWindowFocus: true,
        // SSE is primary; poll as fallback when the stream is unavailable.
        refetchIntervalInBackground: false,
        refetchInterval: (query) => {
            const status = query.state.data?.status ?? initial.status;
            return TERMINAL_STATUSES.has(status) ? false : POLL_INTERVAL_MS;
        },
    });

    // Push от service worker - мгновенный refetch
    const queryClient = useQueryClient();
    useEffect(() => {
        if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) {
            return;
        }
        const onMessage = (event: MessageEvent) => {
            const data: unknown = event.data;
            if (
                data &&
                typeof data === "object" &&
                (data as { type?: unknown }).type === "ORDER_STATUS_PUSH"
            ) {
                void queryClient.invalidateQueries({
                    queryKey: ["order", initial.id],
                });
            }
        };
        navigator.serviceWorker.addEventListener("message", onMessage);
        return () =>
            navigator.serviceWorker.removeEventListener("message", onMessage);
    }, [queryClient, initial.id]);

    // Server-Sent Events (SSE) для мгновенного обновления без поллинга
    useEffect(() => {
        const status = queryClient.getQueryData<OrderStatusResponse>(["order", initial.id])?.status || initial.status;
        if (TERMINAL_STATUSES.has(status)) return;

        const qs = new URLSearchParams({ id: String(initial.id) });
        if (phone.trim()) {
            qs.set("phone", phone);
        }

        const sse = new EventSource(`/api/order-status/stream?${qs.toString()}`);

        sse.onmessage = (event) => {
            try {
                const updatedOrder = JSON.parse(event.data);
                // Преобразуем даты из строк
                if (updatedOrder.createdAt) {
                    updatedOrder.createdAt = new Date(updatedOrder.createdAt).toISOString();
                }
                if (updatedOrder.estimatedDeliveryAt) {
                    updatedOrder.estimatedDeliveryAt = new Date(updatedOrder.estimatedDeliveryAt).toISOString();
                }
                
                queryClient.setQueryData(["order", initial.id], updatedOrder);

                if (TERMINAL_STATUSES.has(updatedOrder.status)) {
                    sse.close();
                }
            } catch (err) {
                console.error("Failed to parse SSE data", err);
            }
        };

        sse.onerror = () => {
            // Браузер сам переподключится через несколько секунд,
            // но мы можем инвалидировать текущие данные, чтобы useQuery сделал обычный fetch.
            void queryClient.invalidateQueries({ queryKey: ["order", initial.id] });
        };

        return () => {
            sse.close();
        };
    }, [initial.id, phone, queryClient]);

    const order = data ?? initial;
    const status = order.status;
    const activeStep = trackingActiveStep(status);
    const isCancelled = status === "CANCELLED";

    const repeatable = order.items.filter(
        (i) => typeof i.productId === "number" && i.productId > 0,
    );

    const onRepeatOrder = () => {
        for (const item of repeatable) {
            const mods = parseModifiersSnapshot(item.selectedModifiers);
            const calculatedItemPrice = item.price;
            const basePrice =
                calculatedItemPrice - mods.reduce((s, m) => s + m.priceDelta, 0);
            for (let i = 0; i < item.quantity; i++) {
                addItem({
                    productId: item.productId as number,
                    name: item.name,
                    basePrice,
                    selectedModifiers: mods,
                    calculatedItemPrice,
                });
            }
        }
        router.push("/menu");
    };

    return (
        <Paper
            elevation={0}
            sx={{
                maxWidth: 600,
                width: "100%",
                borderRadius: 3,
                overflow: "hidden",
                border: `1px solid ${tokens.border}`,
                boxShadow: `0 8px 32px rgba(var(--ew-text-rgb), 0.08)`,
            }}
        >
            <Box
                sx={{
                    px: { xs: 2.5, sm: 3 },
                    py: 3,
                    bgcolor: alpha(theme.palette.primary.main, 0.06),
                    borderBottom: `1px solid ${tokens.border}`,
                }}
            >
                <Typography variant="overline" color="text.secondary" sx={{ letterSpacing: 1.2 }}>
                    {tTracker("orderNumber", { id: order.id })}
                </Typography>
                <Typography variant="h5" fontWeight={800} sx={{ mt: 0.5, lineHeight: 1.2 }}>
                    {isCancelled ? tTracker("cancelled") : tTracker("tracking")}
                </Typography>
                {!TERMINAL_STATUSES.has(status) && (
                    <Stack
                        direction="row"
                        alignItems="center"
                        spacing={0.75}
                        sx={{ mt: 1, flexWrap: "wrap", rowGap: 0.5 }}
                    >
                        <Box
                            sx={{
                                width: 8,
                                height: 8,
                                borderRadius: "50%",
                                bgcolor: "primary.main",
                                flexShrink: 0,
                                animation: "ew-live-pulse 1.6s ease-in-out infinite",
                                "@keyframes ew-live-pulse": {
                                    "0%, 100%": {
                                        opacity: 1,
                                        boxShadow: `0 0 0 0 ${alpha(theme.palette.primary.main, 0.5)}`,
                                    },
                                    "70%": {
                                        opacity: 0.7,
                                        boxShadow: `0 0 0 6px ${alpha(theme.palette.primary.main, 0)}`,
                                    },
                                },
                                "@media (prefers-reduced-motion: reduce)": {
                                    animation: "none",
                                },
                            }}
                        />
                        <Typography variant="caption" color="text.secondary">
                            {tTracker("live")}
                            {dataUpdatedAt
                                ? ` · ${tTracker("lastUpdated", {
                                      time: new Date(dataUpdatedAt).toLocaleTimeString([], {
                                          hour: "2-digit",
                                          minute: "2-digit",
                                      }),
                                  })}`
                                : ""}
                        </Typography>
                        <Button
                            size="small"
                            startIcon={<ReplayIcon sx={{ fontSize: 16 }} />}
                            onClick={() => void refetch()}
                            disabled={isFetching}
                            sx={{
                                ml: "auto",
                                textTransform: "none",
                                fontWeight: 700,
                                minHeight: 32,
                            }}
                        >
                            {tTracker("refresh")}
                        </Button>
                    </Stack>
                )}
            </Box>

            <Stack spacing={3} sx={{ px: { xs: 2.5, sm: 3 }, py: 3 }}>
                {status === "DONE" && repeatable.length > 0 && (
                    <RateOrderItems
                        productIds={repeatable.map(
                            (i) => i.productId as number,
                        )}
                    />
                )}
                {isCancelled ? (
                    <Alert severity="error" sx={{ borderRadius: 2 }}>
                        {tTracker("cancelledMessage")}
                    </Alert>
                ) : (
                    <>
                        <EtaPanel
                            estimatedDeliveryAt={order.estimatedDeliveryAt}
                            status={status}
                        />

                        <Box>
                            <Stepper
                                activeStep={activeStep}
                                orientation="vertical"
                                sx={{
                                    "& .MuiStepConnector-line": {
                                        minHeight: 28,
                                        borderColor: tokens.border,
                                    },
                                    "& .MuiStepConnector-root.Mui-active .MuiStepConnector-line": {
                                        borderColor: "primary.main",
                                    },
                                    "& .MuiStepConnector-root.Mui-completed .MuiStepConnector-line": {
                                        borderColor: "primary.main",
                                    },
                                }}
                            >
                                {steps.map((step, index) => (
                                    <Step key={step.key} completed={index < activeStep}>
                                        <StepLabel
                                            StepIconComponent={() => (
                                                <Box
                                                    sx={{
                                                        width: 40,
                                                        height: 40,
                                                        borderRadius: "50%",
                                                        display: "flex",
                                                        alignItems: "center",
                                                        justifyContent: "center",
                                                        bgcolor:
                                                            index <= activeStep
                                                                ? "primary.main"
                                                                : tokens.border,
                                                        color:
                                                            index <= activeStep
                                                                ? "primary.contrastText"
                                                                : "text.disabled",
                                                        boxShadow:
                                                            index === activeStep
                                                                ? `0 0 0 4px ${alpha(theme.palette.primary.main, 0.2)}`
                                                                : "none",
                                                        transition: "all 0.25s ease",
                                                    }}
                                                >
                                                    {step.icon}
                                                </Box>
                                            )}
                                        >
                                            <Typography
                                                fontWeight={index === activeStep ? 700 : 500}
                                                color={
                                                    index <= activeStep
                                                        ? "text.primary"
                                                        : "text.disabled"
                                                }
                                            >
                                                {step.label}
                                            </Typography>
                                        </StepLabel>
                                    </Step>
                                ))}
                            </Stepper>
                        </Box>
                    </>
                )}

                <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2.5, bgcolor: tokens.surfaceHi }}>
                    <Typography fontWeight={700} sx={{ fontSize: 17, mb: 1.5 }}>
                        {tTracker("itemsTitle")}
                    </Typography>
                    <Stack spacing={1.5}>
                        {order.items.map((item) => {
                            const mods = parseSelectedModifiersJson(item.selectedModifiers);
                            return (
                                <Box key={item.id}>
                                    <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                                        <Box sx={{ pr: 2, minWidth: 0 }}>
                                            <Typography fontWeight={600}>
                                                {item.name} × {item.quantity}
                                            </Typography>
                                            <ModifiersList modifiers={mods} sx={{ mt: 0.25 }} />
                                        </Box>
                                        <Typography fontWeight={700} sx={{ whiteSpace: "nowrap" }}>
                                            {numberFormatter.format(item.price * item.quantity)} ֏
                                        </Typography>
                                    </Stack>
                                </Box>
                            );
                        })}
                    </Stack>
                    {order.deliveryPrice > 0 && (
                        <Stack direction="row" justifyContent="space-between" sx={{ mt: 1.5 }}>
                            <Typography color="text.secondary">
                                {tCart("delivery")}
                                {order.deliveryZoneName ? ` (${order.deliveryZoneName})` : ""}
                            </Typography>
                            <Typography fontWeight={600}>
                                {numberFormatter.format(order.deliveryPrice)} ֏
                            </Typography>
                        </Stack>
                    )}
                    <Divider sx={{ my: 2 }} />
                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                        <Typography fontWeight={700}>{tCart("total")}</Typography>
                        <Typography fontWeight={800} sx={{ fontSize: 22, color: "primary.main" }}>
                            {numberFormatter.format(order.totalPrice)} ֏
                        </Typography>
                    </Stack>
                </Paper>

                <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2.5 }}>
                    <Typography fontWeight={700} sx={{ fontSize: 17, mb: 1.5 }}>
                        {tTracker("deliveryInfo")}
                    </Typography>
                    <Stack spacing={1}>
                        <InfoRow label={tTracker("name")} value={order.name} />
                        <InfoRow label={tTracker("phone")} value={order.phone} />
                        <InfoRow
                            label={tTracker("address")}
                            value={
                                order.delivery === "PICKUP"
                                    ? tDelivery("pickup")
                                    : order.address?.trim() || "-"
                            }
                        />
                        <InfoRow
                            label={tTracker("deliveryType")}
                            value={tDelivery(order.delivery === "DELIVERY" ? "delivery" : "pickup")}
                        />
                        <InfoRow
                            label={tTracker("payment")}
                            value={tPayment(order.payment === "CASH" ? "cash" : "card")}
                        />
                        {order.scheduledFor && (
                            <InfoRow
                                label={tTracker("scheduledFor")}
                                value={new Intl.DateTimeFormat(undefined, {
                                    day: "2-digit",
                                    month: "2-digit",
                                    hour: "2-digit",
                                    minute: "2-digit",
                                }).format(new Date(order.scheduledFor))}
                            />
                        )}
                        {order.changeFrom != null && (
                            <InfoRow
                                label={tTracker("changeFrom")}
                                value={`${numberFormatter.format(order.changeFrom)} ֏`}
                            />
                        )}
                        {order.changeFrom != null &&
                            order.changeFrom - order.totalPrice > 0 && (
                                <InfoRow
                                    label={tTracker("changeDue")}
                                    value={`${numberFormatter.format(
                                        order.changeFrom - order.totalPrice,
                                    )} ֏`}
                                />
                            )}
                    </Stack>
                </Paper>

                <Button
                    variant="contained"
                    color="primary"
                    size="large"
                    fullWidth
                    onClick={onRepeatOrder}
                    disabled={repeatable.length === 0}
                    startIcon={<ReplayIcon />}
                    sx={{
                        py: 1.5,
                        fontWeight: 800,
                        fontSize: 17,
                        borderRadius: 2.5,
                        textTransform: "none",
                        boxShadow: `0 4px 14px ${alpha(theme.palette.primary.main, 0.35)}`,
                    }}
                >
                    {tOrder("repeat")}
                </Button>
            </Stack>
        </Paper>
    );
}

function InfoRow({ label, value }: { label: string; value: string }) {
    return (
        <Stack direction="row" justifyContent="space-between" spacing={2}>
            <Typography color="text.secondary" sx={{ flexShrink: 0 }}>
                {label}
            </Typography>
            <Typography fontWeight={600} textAlign="right">
                {value}
            </Typography>
        </Stack>
    );
}
