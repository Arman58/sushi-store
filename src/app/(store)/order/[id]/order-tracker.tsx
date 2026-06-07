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
import Typography from "@mui/material/Typography";
import { alpha, useTheme } from "@mui/material/styles";
import type { OrderStatus } from "@prisma/client";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";

import { ModifiersList, parseSelectedModifiersJson, useCartStore } from "@/features/cart";
import type { CartModifierSnapshot } from "@/features/cart/model/types";
import {
    formatEstimatedDeliveryTime,
    ORDER_STATUS_UI,
    trackingActiveStep,
} from "@/lib/order-status";
import type { OrderStatusResponse } from "@/shared/api/order-api";
import { tokens } from "@/shared/ui/theme";

const STEPS: Array<{ key: OrderStatus; label: string; icon: ReactNode }> = [
    { key: "NEW", label: ORDER_STATUS_UI.NEW.label, icon: <ScheduleOutlinedIcon /> },
    { key: "COOKING", label: ORDER_STATUS_UI.COOKING.label, icon: <RestaurantMenuOutlinedIcon /> },
    { key: "DELIVERING", label: ORDER_STATUS_UI.DELIVERING.label, icon: <LocalShippingOutlinedIcon /> },
    { key: "DONE", label: ORDER_STATUS_UI.DONE.label, icon: <CheckCircleOutlineIcon /> },
];

const PAYMENT_LABEL: Record<OrderStatusResponse["payment"], string> = {
    CASH: "Наличными",
    CARD: "Картой",
};

const DELIVERY_LABEL: Record<OrderStatusResponse["delivery"], string> = {
    DELIVERY: "Доставка",
    PICKUP: "Самовывоз",
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
                ⏳ Время приготовления уточняется у кухни...
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
                    Время доставки немного переносится...
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
                    Ожидайте до ~{formatEstimatedDeliveryTime(etaDate)}
                </Typography>
                {!isOverdue && (
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                        Осталось {remainingMin} мин
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

    const { data } = useQuery<OrderStatusResponse>({
        queryKey: ["order", initial.id],
        queryFn: async () => {
            const qs = new URLSearchParams({
                id: String(initial.id),
                phone,
            });
            const res = await fetch(`/api/order-status?${qs.toString()}`, { method: "GET" });
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
        refetchOnMount: true,
        refetchOnWindowFocus: true,
        refetchInterval: (query) => {
            const status = query.state.data?.status;
            return status === "NEW" || status === "COOKING" || status === "DELIVERING"
                ? 10_000
                : false;
        },
    });

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
                boxShadow: `0 8px 32px ${alpha(tokens.textPrimary, 0.08)}`,
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
                    Заказ №{order.id}
                </Typography>
                <Typography variant="h5" fontWeight={800} sx={{ mt: 0.5, lineHeight: 1.2 }}>
                    {isCancelled ? "Заказ отменён" : "Следим за заказом"}
                </Typography>
            </Box>

            <Stack spacing={3} sx={{ px: { xs: 2.5, sm: 3 }, py: 3 }}>
                {isCancelled ? (
                    <Alert severity="error" sx={{ borderRadius: 2 }}>
                        К сожалению, ваш заказ был отменён. Приносим извинения за неудобства.
                        Если у вас остались вопросы - свяжитесь с нами по телефону.
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
                                {STEPS.map((step, index) => (
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
                        Состав заказа
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
                                            {(item.price * item.quantity).toLocaleString("ru-RU")} ֏
                                        </Typography>
                                    </Stack>
                                </Box>
                            );
                        })}
                    </Stack>
                    {order.deliveryPrice > 0 && (
                        <Stack direction="row" justifyContent="space-between" sx={{ mt: 1.5 }}>
                            <Typography color="text.secondary">
                                Доставка
                                {order.deliveryZoneName ? ` (${order.deliveryZoneName})` : ""}
                            </Typography>
                            <Typography fontWeight={600}>
                                {order.deliveryPrice.toLocaleString("ru-RU")} ֏
                            </Typography>
                        </Stack>
                    )}
                    <Divider sx={{ my: 2 }} />
                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                        <Typography fontWeight={700}>Итого</Typography>
                        <Typography fontWeight={800} sx={{ fontSize: 22, color: "primary.main" }}>
                            {order.totalPrice.toLocaleString("ru-RU")} ֏
                        </Typography>
                    </Stack>
                </Paper>

                <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2.5 }}>
                    <Typography fontWeight={700} sx={{ fontSize: 17, mb: 1.5 }}>
                        Информация о доставке
                    </Typography>
                    <Stack spacing={1}>
                        <InfoRow label="Имя" value={order.name} />
                        <InfoRow label="Телефон" value={order.phone} />
                        <InfoRow
                            label="Адрес"
                            value={
                                order.delivery === "PICKUP"
                                    ? "Самовывоз"
                                    : order.address?.trim() || "-"
                            }
                        />
                        <InfoRow label="Способ получения" value={DELIVERY_LABEL[order.delivery]} />
                        <InfoRow label="Оплата" value={PAYMENT_LABEL[order.payment]} />
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
                    Повторить заказ
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
