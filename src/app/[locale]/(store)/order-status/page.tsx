"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import LocalShippingIcon from "@mui/icons-material/LocalShipping";
import ReceiptLongIcon from "@mui/icons-material/ReceiptLong";
import TaskAltIcon from "@mui/icons-material/TaskAlt";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Divider from "@mui/material/Divider";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import { alpha, useTheme } from "@mui/material/styles";
import Typography from "@mui/material/Typography";
import type { OrderStatus } from "@prisma/client";
import { motion } from "framer-motion";
import { useLocale, useTranslations } from "next-intl";
import { type ReactNode, useMemo, useState } from "react";
import { Controller, useForm } from "react-hook-form";

import { formatEstimatedDeliveryTime } from "@/lib/order-status";
import { ApiError, fetchOrderStatus, type OrderStatusResponse } from "@/shared/api";
import { API_ERROR_CODES } from "@/shared/lib/api-error";
import {
    createOrderStatusSchema,
    type OrderStatusFormValues,
} from "@/shared/lib/create-schemas";
import { storePriceFormatter } from "@/shared/lib/format-price";
import { translateOrderStatus } from "@/shared/lib/order-status-labels";
import { useSchemaMessages } from "@/shared/lib/use-schema-messages";
import { AppInput, PageContainer, SectionTitle } from "@/shared/ui";
import { tokens } from "@/shared/ui/theme";

const STEP_KEYS = ["NEW", "COOKING", "DELIVERING", "DONE"] as const satisfies readonly OrderStatus[];

const STEP_ICONS: Record<(typeof STEP_KEYS)[number], ReactNode> = {
    NEW: <ReceiptLongIcon fontSize="small" />,
    COOKING: <TaskAltIcon fontSize="small" />,
    DELIVERING: <LocalShippingIcon fontSize="small" />,
    DONE: <AccessTimeIcon fontSize="small" />,
};

export default function OrderStatusPage() {
    const theme = useTheme();
    const locale = useLocale();
    const t = useTranslations("order.status");
    const tCommon = useTranslations("common");
    const tDelivery = useTranslations("checkout.delivery.type");
    const tPayment = useTranslations("order.payment");
    const schemaMessages = useSchemaMessages();
    const orderStatusSchema = useMemo(
        () => createOrderStatusSchema(schemaMessages),
        [schemaMessages],
    );

    const [order, setOrder] = useState<OrderStatusResponse | null>(null);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    const steps = useMemo(
        () =>
            STEP_KEYS.map((key) => ({
                key,
                label: translateOrderStatus(key, t),
                icon: STEP_ICONS[key],
            })),
        [t],
    );

    const {
        control,
        handleSubmit,
        formState: { errors, isSubmitting },
    } = useForm<OrderStatusFormValues>({
        resolver: zodResolver(orderStatusSchema),
        defaultValues: { id: "", phone: "" },
    });

    const onSubmit = async (values: OrderStatusFormValues) => {
        setErrorMessage(null);
        setOrder(null);
        try {
            const data = await fetchOrderStatus(Number(values.id), values.phone);
            setOrder(data);
        } catch (error) {
            if (error instanceof ApiError) {
                if (error.code === API_ERROR_CODES.INTERNAL_SERVER_ERROR) {
                    setErrorMessage(tCommon("generic_server_error"));
                } else {
                    setErrorMessage(t("notFound"));
                }
            } else {
                setErrorMessage(t("notFound"));
            }
        }
    };

    const activeStepIndex =
        order?.status === "CANCELLED"
            ? -1
            : steps.findIndex((step) => step.key === order?.status);

    const dateFormatter = useMemo(
        () =>
            new Intl.DateTimeFormat(locale, {
                day: "2-digit",
                month: "2-digit",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
            }),
        [locale],
    );

    const numberFormatter = storePriceFormatter;
    const brandSoft = alpha(theme.palette.primary.main, 0.12);
    const brandBorder = alpha(theme.palette.primary.main, 0.35);

    return (
        <PageContainer>
            <Box
                sx={{
                    position: "relative",
                    mb: 3,
                    p: { xs: 2.5, md: 3 },
                    borderRadius: 4,
                    overflow: "hidden",
                    bgcolor: "background.paper",
                    color: "text.primary",
                    border: "1px solid",
                    borderColor: "divider",
                }}
            >
                <Box
                    sx={{
                        position: "absolute",
                        inset: 0,
                        background: `radial-gradient(circle at 18% 20%, ${alpha(theme.palette.primary.main, 0.16)}, transparent 32%), radial-gradient(circle at 82% 10%, ${alpha(theme.palette.warning.main, 0.12)}, transparent 28%)`,
                        pointerEvents: "none",
                    }}
                />
                <Box sx={{ position: "relative" }}>
                    <SectionTitle pageTitle>{t("pageTitle")}</SectionTitle>
                    <Typography
                        variant="body1"
                        color="text.secondary"
                        sx={{ maxWidth: 500 }}
                    >
                        {t("subtitle")}
                    </Typography>
                    <Stack direction="row" spacing={1.5} sx={{ mt: 2 }} flexWrap="wrap" useFlexGap>
                        <Chip
                            label={t("chipLive")}
                            size="small"
                            variant="outlined"
                            sx={{ borderRadius: 999, fontWeight: 600 }}
                        />
                        <Chip
                            label={t("chipEta")}
                            size="small"
                            variant="outlined"
                            sx={{ borderRadius: 999, fontWeight: 600 }}
                        />
                    </Stack>
                </Box>
            </Box>

            <Paper
                elevation={0}
                sx={{
                    p: { xs: 2.5, md: 3 },
                    borderRadius: 3,
                    border: "1px solid",
                    borderColor: "divider",
                    bgcolor: "background.paper",
                    display: "flex",
                    flexDirection: "column",
                    gap: 2,
                }}
            >
                <Stack
                    component="form"
                    onSubmit={handleSubmit(onSubmit)}
                    direction={{ xs: "column", md: "row" }}
                    spacing={1.5}
                    alignItems={{ xs: "stretch", md: "flex-start" }}
                >
                    <Controller
                        control={control}
                        name="id"
                        render={({ field }) => (
                            <AppInput
                                {...field}
                                label={t("orderId")}
                                type="number"
                                error={Boolean(errors.id)}
                                helperText={errors.id?.message ?? "\u00A0"}
                                fullWidth
                                autoComplete="off"
                                name="orderId"
                                inputProps={{
                                    min: 1,
                                    inputMode: "numeric",
                                    autoComplete: "off",
                                }}
                                FormHelperTextProps={{
                                    sx: { minHeight: "1.25em" },
                                }}
                            />
                        )}
                    />
                    <Controller
                        control={control}
                        name="phone"
                        render={({ field }) => (
                            <AppInput
                                {...field}
                                label={t("phone")}
                                error={Boolean(errors.phone)}
                                helperText={errors.phone?.message ?? "\u00A0"}
                                fullWidth
                                autoComplete="tel"
                                name="phone"
                                inputProps={{
                                    inputMode: "tel",
                                    autoComplete: "tel",
                                    enterKeyHint: "go",
                                }}
                                FormHelperTextProps={{
                                    sx: { minHeight: "1.25em" },
                                }}
                            />
                        )}
                    />
                    <Button
                        type="submit"
                        variant="contained"
                        size="large"
                        disabled={isSubmitting}
                        sx={{
                            minWidth: 180,
                            borderRadius: 2,
                            px: 2.8,
                            alignSelf: { xs: "stretch", md: "auto" },
                            mt: { xs: 0, md: 0.5 },
                        }}
                    >
                        {isSubmitting ? t("searching") : t("submit")}
                    </Button>
                </Stack>

                {errorMessage ? <Alert severity="error">{errorMessage}</Alert> : null}

                {order ? (
                    <Paper
                        variant="outlined"
                        sx={{
                            mt: 1,
                            p: { xs: 2, md: 2.5 },
                            borderRadius: 3,
                            bgcolor: tokens.surfaceHi,
                            borderColor: "divider",
                            position: "relative",
                            overflow: "hidden",
                        }}
                    >
                        <Stack spacing={2} sx={{ position: "relative" }}>
                            <Stack
                                direction={{ xs: "column", sm: "row" }}
                                justifyContent="space-between"
                                alignItems={{ xs: "flex-start", sm: "center" }}
                                spacing={1.5}
                            >
                                <Stack spacing={0.5}>
                                    <Typography variant="overline" color="text.secondary">
                                        {t("trackerLabel")}
                                    </Typography>
                                    <Typography component="h2" variant="h6" fontWeight={800}>
                                        {t("orderNumber", { id: order.id })}
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary">
                                        {dateFormatter.format(new Date(order.createdAt))}
                                    </Typography>
                                </Stack>
                                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                                    <Chip
                                        label={translateOrderStatus(order.status, t)}
                                        color={
                                            order.status === "DONE"
                                                ? "success"
                                                : order.status === "CANCELLED"
                                                  ? "default"
                                                  : "warning"
                                        }
                                        size="small"
                                        sx={{ fontWeight: 700 }}
                                    />
                                    <Chip
                                        label={tDelivery(
                                            order.delivery === "DELIVERY"
                                                ? "delivery"
                                                : "pickup",
                                        )}
                                        size="small"
                                        variant="outlined"
                                    />
                                    <Chip
                                        label={tPayment(
                                            order.payment === "CASH" ? "cash" : "card",
                                        )}
                                        size="small"
                                        variant="outlined"
                                    />
                                </Stack>
                            </Stack>

                            {order.status !== "CANCELLED" ? (
                                <Stack
                                    direction="row"
                                    spacing={1.5}
                                    alignItems="center"
                                    sx={{
                                        p: 1.5,
                                        borderRadius: 2,
                                        bgcolor: brandSoft,
                                        border: "1px solid",
                                        borderColor: brandBorder,
                                    }}
                                >
                                    <LocalShippingIcon color="primary" />
                                    <Typography variant="body2" fontWeight={600}>
                                        {order.status === "DONE"
                                            ? t("readyOrDelivered")
                                            : order.estimatedDeliveryAt
                                              ? t("etaUntil", {
                                                    time: formatEstimatedDeliveryTime(
                                                        new Date(order.estimatedDeliveryAt),
                                                    ),
                                                })
                                              : t("etaPending")}
                                    </Typography>
                                </Stack>
                            ) : null}

                            <Box>
                                <Typography
                                    variant="caption"
                                    color="text.secondary"
                                    sx={{ display: "block", mb: 1 }}
                                >
                                    {t("stepsLabel")}
                                </Typography>
                                <Stack
                                    direction="row"
                                    spacing={2}
                                    alignItems="center"
                                    sx={{ position: "relative" }}
                                >
                                    <Box
                                        sx={{
                                            position: "absolute",
                                            top: "50%",
                                            left: 20,
                                            right: 20,
                                            height: 2,
                                            bgcolor: "divider",
                                            transform: "translateY(-50%)",
                                        }}
                                    />
                                    {steps.map((step, index) => {
                                        const active = index <= activeStepIndex;
                                        return (
                                            <Stack
                                                key={step.key}
                                                spacing={0.75}
                                                alignItems="center"
                                                sx={{ position: "relative" }}
                                            >
                                                <Box
                                                    component={active ? motion.div : "div"}
                                                    animate={
                                                        active
                                                            ? {
                                                                  boxShadow: [
                                                                      `0 0 0 0 ${alpha(theme.palette.primary.main, 0.35)}`,
                                                                      `0 0 0 8px ${alpha(theme.palette.primary.main, 0)}`,
                                                                      `0 0 0 0 ${alpha(theme.palette.primary.main, 0.35)}`,
                                                                  ],
                                                              }
                                                            : undefined
                                                    }
                                                    transition={
                                                        active
                                                            ? {
                                                                  duration: 2,
                                                                  repeat: Infinity,
                                                                  ease: "easeInOut",
                                                              }
                                                            : undefined
                                                    }
                                                    sx={{
                                                        width: 40,
                                                        height: 40,
                                                        borderRadius: "50%",
                                                        display: "flex",
                                                        alignItems: "center",
                                                        justifyContent: "center",
                                                        bgcolor: active
                                                            ? brandSoft
                                                            : "background.paper",
                                                        border: "1px solid",
                                                        borderColor: active
                                                            ? brandBorder
                                                            : "divider",
                                                        color: active
                                                            ? "primary.main"
                                                            : "text.secondary",
                                                        "@media (prefers-reduced-motion: reduce)":
                                                            {
                                                                animation: "none",
                                                            },
                                                    }}
                                                >
                                                    {step.icon}
                                                </Box>
                                                <Typography
                                                    variant="caption"
                                                    sx={{
                                                        color: active
                                                            ? "text.primary"
                                                            : "text.secondary",
                                                        fontWeight: active ? 700 : 400,
                                                    }}
                                                >
                                                    {step.label}
                                                </Typography>
                                            </Stack>
                                        );
                                    })}
                                </Stack>
                            </Box>

                            <Divider />

                            <Box
                                sx={{
                                    display: "grid",
                                    gridTemplateColumns: { xs: "1fr", sm: "2fr 1fr" },
                                    gap: 2,
                                }}
                            >
                                <Stack spacing={1.2}>
                                    <Typography variant="subtitle2" fontWeight={700}>
                                        {t("itemsLabel")}
                                    </Typography>
                                    {order.items.map((item) => (
                                        <Stack
                                            key={item.id}
                                            direction="row"
                                            justifyContent="space-between"
                                            sx={{
                                                p: 1,
                                                borderRadius: 2,
                                                bgcolor: "background.paper",
                                                border: "1px solid",
                                                borderColor: "divider",
                                            }}
                                        >
                                            <Typography variant="body2">
                                                {item.name} × {item.quantity}
                                            </Typography>
                                            <Typography variant="body2" fontWeight={700}>
                                                {numberFormatter.format(
                                                    item.price * item.quantity,
                                                )}{" "}
                                                ֏
                                            </Typography>
                                        </Stack>
                                    ))}
                                </Stack>

                                <Paper
                                    variant="outlined"
                                    sx={{
                                        p: 1.5,
                                        borderRadius: 2,
                                        bgcolor: "background.paper",
                                    }}
                                >
                                    <Stack spacing={1}>
                                        <Typography variant="subtitle2" fontWeight={700}>
                                            {t("details")}
                                        </Typography>
                                        {order.address ? (
                                            <Typography
                                                variant="body2"
                                                color="text.secondary"
                                            >
                                                {t("address", { address: order.address })}
                                            </Typography>
                                        ) : null}
                                        <Stack
                                            direction="row"
                                            justifyContent="space-between"
                                        >
                                            <Typography
                                                variant="body2"
                                                color="text.secondary"
                                            >
                                                {t("amount")}
                                            </Typography>
                                            <Typography variant="body2" fontWeight={700}>
                                                {numberFormatter.format(order.totalPrice)} ֏
                                            </Typography>
                                        </Stack>
                                    </Stack>
                                </Paper>
                            </Box>
                        </Stack>
                    </Paper>
                ) : null}
            </Paper>
        </PageContainer>
    );
}
