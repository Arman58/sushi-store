"use client";

import { Box, Button, Divider, Stack, Typography } from "@mui/material";
import { alpha } from "@mui/material/styles";
import type { PaymentMethod } from "@prisma/client";
import { useLocale, useTranslations } from "next-intl";

import type { KitchenOrderDto } from "@/lib/kitchen-orders";
import { tokens } from "@/shared/ui/theme";

const OVERDUE_MS = 15 * 60 * 1_000;

const TAG_SX = {
    fontSize: 11,
    fontWeight: 700,
    px: 1.5,
    py: 0.5,
    borderRadius: "6px",
    bgcolor: tokens.surfaceHi,
    color: tokens.textSecondary,
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
    return (
        <Box component="span" sx={TAG_SX}>
            {label}
        </Box>
    );
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
                bgcolor: overdue ? tokens.redDim : "background.paper",
                border: "1px solid",
                borderColor: overdue ? alpha(tokens.red, 0.35) : "divider",
                borderRadius: "12px",
                p: 2.5,
                boxShadow: "none",
                opacity: dimmed ? 0.75 : 1,
            }}
        >
            <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Typography
                    component="p"
                    sx={{
                        fontSize: 18,
                        fontWeight: 700,
                        color: "text.primary",
                        lineHeight: 1.2,
                    }}
                >
                    #{order.id}
                </Typography>
                <Typography
                    component="p"
                    sx={{
                        fontSize: 14,
                        fontWeight: 600,
                        color: overdue ? "error.main" : "text.secondary",
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

            <Divider sx={{ my: 1.5, borderColor: "divider" }} />

            <Stack spacing={0.5} sx={{ mb: 1 }}>
                <Typography sx={{ fontSize: 15, fontWeight: 700, color: "text.primary" }}>
                    {order.customerName}
                </Typography>
                {order.phone && order.phone !== "-" ? (
                    <Typography
                        component="a"
                        href={`tel:${order.phone.replace(/[^\d+]/g, "")}`}
                        sx={{
                            fontSize: 14,
                            fontWeight: 600,
                            color: "primary.main",
                            textDecoration: "none",
                        }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        {order.phone}
                    </Typography>
                ) : null}
                {order.deliveryType === "DELIVERY" && order.address ? (
                    <Typography sx={{ fontSize: 13, color: "text.secondary", lineHeight: 1.4 }}>
                        {order.deliveryZoneName
                            ? `${order.deliveryZoneName}: ${order.address}`
                            : order.address}
                    </Typography>
                ) : null}
            </Stack>

            <Stack spacing={1.25}>
                {order.items.map((item) => (
                    <Box key={item.id}>
                        <Stack direction="row" justifyContent="space-between" alignItems="center">
                            <Box
                                component="span"
                                sx={{
                                    fontSize: 14,
                                    fontWeight: 700,
                                    color: "primary.main",
                                    bgcolor: tokens.greenDim,
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
                                    color: "text.primary",
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
                                sx={{
                                    pl: 5,
                                    fontSize: 13,
                                    color: "text.secondary",
                                    mt: 0.35,
                                }}
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
                        bgcolor: (theme) => alpha(theme.palette.warning.main, 0.12),
                        border: "1px solid",
                        borderColor: (theme) => alpha(theme.palette.warning.main, 0.4),
                        borderRadius: "8px",
                    }}
                >
                    <Typography
                        sx={{ fontSize: 13, color: "warning.dark", fontWeight: 600 }}
                    >
                        {order.comment}
                    </Typography>
                </Box>
            ) : null}

            {onStartCooking ? (
                <Button
                    variant="contained"
                    color="primary"
                    disabled={isUpdating}
                    onClick={onStartCooking}
                    disableElevation
                    sx={{
                        mt: 2,
                        width: "100%",
                        fontWeight: 600,
                        borderRadius: "8px",
                        py: 1.2,
                        textTransform: "none",
                        fontSize: 14,
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
                        fontWeight: 600,
                        borderRadius: "8px",
                        py: 1.2,
                        textTransform: "none",
                        fontSize: 14,
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
                        fontWeight: 600,
                        borderRadius: "8px",
                        py: 1.2,
                        textTransform: "none",
                        fontSize: 14,
                    }}
                >
                    {t("pickedUp")}
                </Button>
            ) : null}
        </Box>
    );
}
