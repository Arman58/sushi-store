"use client";

import { Box, Button, Divider, Stack, Typography } from "@mui/material";
import type { PaymentMethod } from "@prisma/client";
import { useLocale, useTranslations } from "next-intl";

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

type KitchenTimerLabels = {
    now: string;
    minutes: (minutes: number) => string;
    hours: (hours: number) => string;
    hoursMinutes: (hours: number, minutes: number) => string;
};

export function formatKitchenTimer(
    iso: string,
    nowMs: number,
    labels: KitchenTimerLabels,
): string {
    const diffMs = Math.max(0, nowMs - new Date(iso).getTime());
    const mins = Math.floor(diffMs / 60_000);
    if (mins < 1) return labels.now;
    if (mins < 60) return labels.minutes(mins);
    const hours = Math.floor(mins / 60);
    const restMins = mins % 60;
    if (restMins === 0) return labels.hours(hours);
    return labels.hoursMinutes(hours, restMins);
}

export function isKitchenOrderOverdue(iso: string, nowMs: number): boolean {
    return nowMs - new Date(iso).getTime() > OVERDUE_MS;
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
    const locale = useLocale();
    const t = useTranslations("admin.kitchen");
    const tCommon = useTranslations("admin.common");
    const tOrder = useTranslations("order");

    const timerLabels: KitchenTimerLabels = {
        now: tCommon("now"),
        minutes: (minutes) => t("timerMinutes", { minutes }),
        hours: (hours) => t("timerHours", { hours }),
        hoursMinutes: (hours, minutes) =>
            t("timerHoursMinutes", { hours, minutes }),
    };

    const formatScheduled = (iso: string) =>
        new Intl.DateTimeFormat(locale, {
            day: "2-digit",
            month: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
            timeZone: "Asia/Yerevan",
        }).format(new Date(iso));

    const paymentLabel = (paymentMethod: PaymentMethod) =>
        paymentMethod === "CASH"
            ? tOrder("payment.cash")
            : tOrder("payment.card");

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
                    {nowMs === null
                        ? "-"
                        : formatKitchenTimer(order.createdAt, nowMs, timerLabels)}
                </Typography>
            </Stack>

            <Stack direction="row" spacing={0.75} sx={{ mt: 1.5, flexWrap: "wrap", gap: 0.75 }}>
                <OrderTag
                    label={
                        order.deliveryType === "PICKUP"
                            ? tCommon("pickup")
                            : tCommon("delivery")
                    }
                />
                {order.scheduledFor ? (
                    <OrderTag
                        label={t("scheduledAt", {
                            time: formatScheduled(order.scheduledFor),
                        })}
                    />
                ) : null}
                <OrderTag label={paymentLabel(order.paymentMethod)} />
                {order.paymentMethod === "CASH" ? (
                    <OrderTag
                        label={
                            order.changeFrom != null
                                ? t("changeWith", {
                                      change: (
                                          order.changeFrom - order.totalPrice
                                      ).toLocaleString(locale),
                                      from: order.changeFrom.toLocaleString(locale),
                                  })
                                : t("noChangeCash")
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
                    {t("startCooking")}
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
                    {t("markReady")}
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
                    {t("pickedUp")}
                </Button>
            ) : null}
        </Box>
    );
}
