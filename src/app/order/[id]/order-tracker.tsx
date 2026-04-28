"use client";

import AccessTimeIcon from "@mui/icons-material/AccessTime";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import SoupKitchenOutlinedIcon from "@mui/icons-material/SoupKitchenOutlined";
import TwoWheelerIcon from "@mui/icons-material/TwoWheeler";
import Box from "@mui/material/Box";
import Divider from "@mui/material/Divider";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import type { OrderStatus } from "@prisma/client";
import { useQuery } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";

import type { OrderStatusResponse } from "@/shared/api/order-api";

const TRACKING_COLORS = {
    done: "#2DB5A0",
    active: "#E85D4A",
    idleBg: "#f0f0f0",
    idleFg: "#9e9e9e",
    lineIdle: "#e0e0e0",
};

const ETA_MS = 45 * 60 * 1000;

/** Соответствует шагам таймлайна 0…3; −1 означает трекинг не показываем (отменён). */
function trackingActiveStep(status: OrderStatus): number {
    switch (status) {
        case "NEW":
            return 0;
        case "PREPARING":
            return 1;
        case "DELIVERING":
            return 2;
        case "DONE":
            return 3;
        case "CANCELLED":
            return -1;
        default: {
            const _exhaustive: never = status;
            return _exhaustive;
        }
    }
}

/** Подстрочное время / ожидание подтверждения или обратный отсчёт ~45 мин */
function SmartTimer({
    status,
    createdAt,
}: {
    status: OrderStatus;
    createdAt: string;
}) {
    const [tick, setTick] = useState(() => Date.now());

    useEffect(() => {
        if (status !== "PREPARING") return;
        const id = window.setInterval(() => setTick(Date.now()), 1000);
        return () => window.clearInterval(id);
    }, [status]);

    if (status === "NEW") {
        return (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, fontSize: 16 }}>
                Ожидайте подтверждения
            </Typography>
        );
    }

    if (status === "DELIVERING") {
        return (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, fontSize: 16 }}>
                Курьер везёт заказ
            </Typography>
        );
    }

    if (status !== "PREPARING") return null;

    const startMs = new Date(createdAt).getTime();
    const endMs = startMs + ETA_MS;
    const remaining = Math.max(0, endMs - tick);
    const remainingMin = Math.ceil(remaining / 60000);

    if (remaining <= 0) {
        return (
            <Typography
                variant="body2"
                sx={{ mt: 0.5, fontSize: 16, color: TRACKING_COLORS.active, fontWeight: 600 }}
            >
                Скоро будет у курьера!
            </Typography>
        );
    }

    return (
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, fontSize: 16 }}>
            Осталось ~{remainingMin} мин.
        </Typography>
    );
}

type OrderTrackerProps = {
    /** Начальный снимок заказа (совпадает с ответом GET /api/order-status) */
    order: OrderStatusResponse;
    /** Телефон из заказа — нужен для опроса GET /api/order-status */
    phone: string;
};

export function OrderTracker({ order: initial, phone }: OrderTrackerProps) {
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
            return res.json();
        },
        initialData: initial,
        refetchOnMount: true,
        refetchOnWindowFocus: true,
        refetchInterval: (query) => {
            const data = query.state.data;
            return data?.status === "NEW" || data?.status === "PREPARING" || data?.status === "DELIVERING"
                ? 10000
                : false;
        },
    });

    const order = data ?? initial;
    const status = order.status;

    const activeStep = trackingActiveStep(status);

    const timeline: Array<{
        label: string;
        icon: ReactNode;
        isActive: boolean;
        isDone: boolean;
    }> = [
        {
            label: "Заказ принят",
            icon: <AccessTimeIcon sx={{ fontSize: 22 }} />,
            isActive: activeStep === 0,
            isDone: status !== "NEW",
        },
        {
            label: "Готовится",
            icon: <SoupKitchenOutlinedIcon sx={{ fontSize: 22 }} />,
            isActive: activeStep === 1,
            isDone: status === "DELIVERING" || status === "DONE",
        },
        {
            label: "В пути",
            icon: <TwoWheelerIcon sx={{ fontSize: 22 }} />,
            isActive: activeStep === 2,
            isDone: status === "DONE",
        },
        {
            label: "Доставлен",
            icon: <CheckCircleOutlineIcon sx={{ fontSize: 22 }} />,
            isActive: activeStep === 3,
            isDone: status === "DONE",
        },
    ];

    return (
        <Paper
            elevation={0}
            sx={{
                maxWidth: 560,
                width: "100%",
                bgcolor: "#fff",
                borderRadius: 3,
                px: { xs: 2, sm: 3 },
                py: { xs: 3, sm: 4 },
                border: "1px solid rgba(0,0,0,0.06)",
                boxShadow: "0 14px 48px rgba(26,26,26,0.07)",
                fontSize: "16px",
            }}
        >
            <Typography variant="subtitle2" color="text.secondary" sx={{ fontSize: 16 }}>
                Заказ №{order.id}
            </Typography>

            {activeStep < 0 ? (
                <Typography mt={3} sx={{ fontSize: 17 }}>
                    Заказ отменён
                </Typography>
            ) : (
                <>
                    <Stack direction="column" spacing={3} sx={{ mt: 4, px: 2 }}>
                        <Stack spacing={0}>
                            {timeline.map((step, index) => (
                                <Box key={step.label}>
                                    <Stack direction="row" alignItems="flex-start" spacing={2}>
                                        <Box
                                            sx={{
                                                width: 40,
                                                height: 40,
                                                borderRadius: "50%",
                                                display: "flex",
                                                alignItems: "center",
                                                justifyContent: "center",
                                                flexShrink: 0,
                                                bgcolor: step.isDone
                                                    ? TRACKING_COLORS.done
                                                    : step.isActive
                                                      ? TRACKING_COLORS.active
                                                      : TRACKING_COLORS.idleBg,
                                                color:
                                                    step.isDone || step.isActive
                                                        ? "#fff"
                                                        : TRACKING_COLORS.idleFg,
                                                transition: "background-color 0.3s, color 0.3s",
                                            }}
                                        >
                                            {step.icon}
                                        </Box>
                                        <Box>
                                            <Typography
                                                fontWeight={step.isActive ? 700 : 400}
                                                sx={{ fontSize: 17, lineHeight: 1.35 }}
                                            >
                                                {step.label}
                                            </Typography>
                                            {step.isActive && (
                                                <SmartTimer status={status} createdAt={order.createdAt} />
                                            )}
                                        </Box>
                                    </Stack>
                                    {index < timeline.length - 1 ? (
                                        <Box
                                            sx={{
                                                width: 2,
                                                height: 20,
                                                bgcolor: step.isDone ? TRACKING_COLORS.done : TRACKING_COLORS.lineIdle,
                                                ml: 1.9,
                                                mb: index === timeline.length - 2 ? 0 : -0.5,
                                            }}
                                        />
                                    ) : null}
                                </Box>
                            ))}
                        </Stack>
                    </Stack>
                </>
            )}

            <Paper sx={{ mt: 4, p: 2, borderRadius: 3 }} variant="outlined">
                <Typography fontWeight={700} sx={{ fontSize: 18 }}>
                    Состав заказа
                </Typography>
                {order.items.map((item) => (
                    <Stack key={item.id} direction="row" justifyContent="space-between" mt={1}>
                        <Typography sx={{ fontSize: 17 }}>
                            {item.name} × {item.quantity}
                        </Typography>
                        <Typography fontWeight={600} sx={{ fontSize: 17, whiteSpace: "nowrap", pl: 2 }}>
                            {item.price * item.quantity} ֏
                        </Typography>
                    </Stack>
                ))}
                <Divider sx={{ my: 2 }} />
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Typography fontWeight={700} sx={{ fontSize: 17 }}>
                        Итого
                    </Typography>
                    <Typography fontWeight={700} sx={{ fontSize: 19 }}>
                        {order.totalPrice} ֏
                    </Typography>
                </Stack>
            </Paper>
        </Paper>
    );
}
