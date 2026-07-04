"use client";

import { Box, Button, Divider, Stack, Typography } from "@mui/material";
import type { PaymentMethod } from "@prisma/client";

import type { KitchenOrderDto } from "@/lib/kitchen-orders";

const OVERDUE_MS = 15 * 60 * 1_000;

const TAG_SX = {
    fontSize: 11,
    fontWeight: 700,
    px: 1.5,
    py: 0.5,
    borderRadius: "6px",
    bgcolor: "#F1F5F9",
    color: "#475569",
    textTransform: "uppercase" as const,
    letterSpacing: "0.5px",
    lineHeight: 1.4,
};

export function formatKitchenTimer(iso: string, nowMs: number): string {
    const diffMs = Math.max(0, nowMs - new Date(iso).getTime());
    const mins = Math.floor(diffMs / 60_000);
    if (mins < 1) return "сейчас";
    if (mins < 60) return `${mins} мин`;
    const hours = Math.floor(mins / 60);
    const restMins = mins % 60;
    if (restMins === 0) return `${hours} ч`;
    return `${hours} ч ${restMins} мин`;
}

export function isKitchenOrderOverdue(iso: string, nowMs: number): boolean {
    return nowMs - new Date(iso).getTime() > OVERDUE_MS;
}

function paymentLabel(paymentMethod: PaymentMethod): string {
    if (paymentMethod === "CASH") return "Наличные";
    return "Карта";
}

function OrderTag({ label }: { label: string }) {
    return <Box component="span" sx={TAG_SX}>{label}</Box>;
}

export type KitchenOrderCardProps = {
    order: KitchenOrderDto;
    nowMs: number | null;
    onStartCooking?: () => void;
    onMarkReady?: () => void;
    onPickedUp?: () => void;
    isUpdating: boolean;
    dimmed?: boolean;
};

export function KitchenOrderCard({
    order,
    nowMs,
    onStartCooking,
    onMarkReady,
    onPickedUp,
    isUpdating,
    dimmed,
}: KitchenOrderCardProps) {
    const overdue = nowMs !== null && isKitchenOrderOverdue(order.createdAt, nowMs);

    return (
        <Box
            sx={{
                bgcolor: overdue ? "#FEF2F2" : "#FFFFFF",
                border: overdue ? "1px solid #FECACA" : "1px solid #E2E8F0",
                borderRadius: "12px",
                p: 2.5,
                boxShadow: "none",
                opacity: dimmed ? 0.75 : 1,
            }}
        >
            <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Typography
                    component="p"
                    sx={{ fontSize: 18, fontWeight: 700, color: "#0F172A", lineHeight: 1.2 }}
                >
                    #{order.id}
                </Typography>
                <Typography
                    component="p"
                    sx={{
                        fontSize: 14,
                        fontWeight: 600,
                        color: overdue ? "#EF4444" : "#64748B",
                        whiteSpace: "nowrap",
                    }}
                >
                    {nowMs === null ? "—" : formatKitchenTimer(order.createdAt, nowMs)}
                </Typography>
            </Stack>

            <Stack direction="row" spacing={0.75} sx={{ mt: 1.5, flexWrap: "wrap", gap: 0.75 }}>
                <OrderTag
                    label={order.deliveryType === "PICKUP" ? "Самовывоз" : "Доставка"}
                />
                {order.scheduledFor ? (
                    <OrderTag
                        label={`⏰ Ко времени ${new Date(order.scheduledFor).toLocaleString("ru-RU", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}`}
                    />
                ) : null}
                <OrderTag label={paymentLabel(order.paymentMethod)} />
                {order.paymentMethod === "CASH" ? (
                    <OrderTag
                        label={
                            order.changeFrom != null
                                ? `💵 Сдача ${(order.changeFrom - order.totalPrice).toLocaleString("ru-RU")} ֏ (с ${order.changeFrom.toLocaleString("ru-RU")} ֏)`
                                : "💵 Без сдачи"
                        }
                    />
                ) : null}
            </Stack>

            <Divider sx={{ my: 1.5, borderColor: "#F1F5F9" }} />

            <Stack spacing={1.25}>
                {order.items.map((item) => (
                    <Box key={item.id}>
                        <Stack direction="row" justifyContent="space-between" alignItems="center">
                            <Box
                                component="span"
                                sx={{
                                    fontSize: 14,
                                    fontWeight: 700,
                                    color: "#059669",
                                    bgcolor: "#ECFDF5",
                                    px: 1.5,
                                    borderRadius: "6px",
                                    flexShrink: 0,
                                }}
                            >
                                x{item.quantity}
                            </Box>
                            <Typography
                                component="span"
                                sx={{
                                    fontSize: 15,
                                    fontWeight: 600,
                                    color: "#1E293B",
                                    flex: 1,
                                    ml: 1.5,
                                    lineHeight: 1.35,
                                    textAlign: "right",
                                }}
                            >
                                {item.name}
                            </Typography>
                        </Stack>
                        {item.modifiers.length > 0 ? (
                            <Typography
                                component="div"
                                sx={{ pl: 5, fontSize: 13, color: "#94A3B8", mt: 0.35 }}
                            >
                                {item.modifiers.map((m) => m.name).join(", ")}
                            </Typography>
                        ) : null}
                    </Box>
                ))}
            </Stack>

            {order.comment ? (
                <Box
                    sx={{
                        mt: 1.5,
                        p: 1.5,
                        bgcolor: "#FFFBEB",
                        border: "1px solid #FDE68A",
                        borderRadius: "8px",
                    }}
                >
                    <Typography sx={{ fontSize: 13, color: "#D97706", fontWeight: 600 }}>
                        {order.comment}
                    </Typography>
                </Box>
            ) : null}

            {onStartCooking ? (
                <Button
                    variant="contained"
                    disabled={isUpdating}
                    onClick={onStartCooking}
                    disableElevation
                    sx={{
                        mt: 2,
                        width: "100%",
                        bgcolor: "#0F172A",
                        color: "#FFFFFF",
                        fontWeight: 600,
                        borderRadius: "8px",
                        py: 1.2,
                        textTransform: "none",
                        fontSize: 14,
                        boxShadow: "none",
                        "&:hover": { bgcolor: "#1E293B", boxShadow: "none" },
                        "&.Mui-disabled": { bgcolor: "#CBD5E1", color: "#FFFFFF" },
                    }}
                >
                    Начать готовить
                </Button>
            ) : null}
            {onMarkReady ? (
                <Button
                    variant="outlined"
                    disabled={isUpdating}
                    onClick={onMarkReady}
                    disableElevation
                    sx={{
                        mt: 2,
                        width: "100%",
                        bgcolor: "transparent",
                        border: "1px solid #E2E8F0",
                        color: "#0F172A",
                        fontWeight: 600,
                        borderRadius: "8px",
                        py: 1.2,
                        textTransform: "none",
                        fontSize: 14,
                        boxShadow: "none",
                        "&:hover": {
                            bgcolor: "#F8FAFC",
                            border: "1px solid #CBD5E1",
                            boxShadow: "none",
                        },
                        "&.Mui-disabled": { color: "#94A3B8", borderColor: "#E2E8F0" },
                    }}
                >
                    Готово
                </Button>
            ) : null}
            {onPickedUp ? (
                <Button
                    variant="outlined"
                    disabled={isUpdating}
                    onClick={onPickedUp}
                    disableElevation
                    sx={{
                        mt: 2,
                        width: "100%",
                        bgcolor: "transparent",
                        border: "1px solid #E2E8F0",
                        color: "#0F172A",
                        fontWeight: 600,
                        borderRadius: "8px",
                        py: 1.2,
                        textTransform: "none",
                        fontSize: 14,
                        boxShadow: "none",
                        "&:hover": {
                            bgcolor: "#F8FAFC",
                            border: "1px solid #CBD5E1",
                            boxShadow: "none",
                        },
                        "&.Mui-disabled": { color: "#94A3B8", borderColor: "#E2E8F0" },
                    }}
                >
                    Клиент забрал
                </Button>
            ) : null}
        </Box>
    );
}
