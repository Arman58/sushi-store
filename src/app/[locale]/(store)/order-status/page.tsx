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
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import type { OrderStatus } from "@prisma/client";
import { motion } from "framer-motion";
import { useLocale, useTranslations } from "next-intl";
import { type ReactNode,useMemo, useState } from "react";
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
import { PageContainer, SectionTitle } from "@/shared/ui";

const STEP_KEYS = ["NEW", "COOKING", "DELIVERING", "DONE"] as const satisfies readonly OrderStatus[];

const STEP_ICONS: Record<(typeof STEP_KEYS)[number], ReactNode> = {
    NEW: <ReceiptLongIcon fontSize="small" />,
    COOKING: <TaskAltIcon fontSize="small" />,
    DELIVERING: <LocalShippingIcon fontSize="small" />,
    DONE: <AccessTimeIcon fontSize="small" />,
};

export default function OrderStatusPage() {
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

    return (
        <PageContainer>
                <Box
                    sx={{
                        position: "relative",
                        mb: 3,
                        p: { xs: 2.5, md: 3 },
                        borderRadius: 4,
                        overflow: "hidden",
                        background: "linear-gradient(135deg, rgba(15,23,42,0.9), rgba(15,23,42,0.92))",
                        color: "white",
                        border: "1px solid rgba(255,255,255,0.08)",
                    }}
                >
                    <Box
                        sx={{
                            position: "absolute",
                            inset: 0,
                            background:
                                "radial-gradient(circle at 18% 20%, rgba(249,115,22,0.32), transparent 30%), radial-gradient(circle at 82% 10%, rgba(250,204,21,0.3), transparent 26%)",
                        }}
                    />
                    <Box sx={{ position: "relative" }}>
                        <SectionTitle pageTitle>{t("pageTitle")}</SectionTitle>
                        <Typography variant="body1" sx={{ color: "rgba(255,255,255,0.82)", maxWidth: 500 }}>
                            {t("subtitle")}
                        </Typography>
                        <Stack direction="row" spacing={1.5} sx={{ mt: 2 }} flexWrap="wrap">
                            <Chip
                                label={t("chipLive")}
                                size="small"
                                sx={{ borderRadius: 999, bgcolor: "rgba(255,255,255,0.1)", color: "white", border: "1px solid rgba(255,255,255,0.2)" }}
                            />
                            <Chip
                                label={t("chipEta")}
                                size="small"
                                sx={{ borderRadius: 999, bgcolor: "rgba(255,255,255,0.08)", color: "white" }}
                            />
                        </Stack>
                    </Box>
                </Box>

                <Paper
                    elevation={0}
                    sx={{
                        p: { xs: 2.5, md: 3 },
                        borderRadius: 3,
                        border: "1px solid rgba(15,23,42,0.06)",
                        background: "linear-gradient(180deg, rgba(255,255,255,0.9), rgba(248,250,252,0.95))",
                        display: "flex",
                        flexDirection: "column",
                        gap: 2,
                        boxShadow: "0 20px 60px rgba(15,23,42,0.08)",
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
                                <TextField
                                    {...field}
                                    label={t("orderId")}
                                    type="number"
                                    error={Boolean(errors.id)}
                                    helperText={errors.id?.message ?? "\u00A0"}
                                    fullWidth
                                    InputProps={{ inputProps: { min: 1 } }}
                                    slotProps={{
                                        formHelperText: {
                                            sx: { minHeight: "1.25em" },
                                        },
                                    }}
                                />
                            )}
                        />
                        <Controller
                            control={control}
                            name="phone"
                            render={({ field }) => (
                                <TextField
                                    {...field}
                                    label={t("phone")}
                                    error={Boolean(errors.phone)}
                                    helperText={errors.phone?.message ?? "\u00A0"}
                                    fullWidth
                                    inputProps={{ inputMode: "tel" }}
                                    slotProps={{
                                        formHelperText: {
                                            sx: { minHeight: "1.25em" },
                                        },
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
                                mt: { xs: 0, md: 2 },
                            }}
                        >
                            {isSubmitting ? t("searching") : t("submit")}
                        </Button>
                    </Stack>

                    {errorMessage && <Alert severity="error">{errorMessage}</Alert>}

                    {order && (
                        <Paper
                            variant="outlined"
                            sx={{
                                mt: 1,
                                p: { xs: 2, md: 2.5 },
                                borderRadius: 3,
                                background: "linear-gradient(180deg, #0f172a, #0b1323)",
                                color: "white",
                                position: "relative",
                                overflow: "hidden",
                                border: "1px solid rgba(255,255,255,0.08)",
                            }}
                        >
                            <Box
                                sx={{
                                    position: "absolute",
                                    inset: 0,
                                    background:
                                        "radial-gradient(circle at 15% 10%, rgba(249,115,22,0.28), transparent 30%), radial-gradient(circle at 80% 0, rgba(250,204,21,0.25), transparent 28%)",
                                }}
                            />

                            <Stack spacing={2} sx={{ position: "relative" }}>
                                <Stack
                                    direction={{ xs: "column", sm: "row" }}
                                    justifyContent="space-between"
                                    alignItems={{ xs: "flex-start", sm: "center" }}
                                    spacing={1.5}
                                >
                                    <Stack spacing={0.5}>
                                        <Typography variant="overline" sx={{ opacity: 0.7 }}>
                                            {t("trackerLabel")}
                                        </Typography>
                                        <Typography component="h2" variant="h6" fontWeight={800}>
                                            {t("orderNumber", { id: order.id })}
                                        </Typography>
                                        <Typography variant="body2" sx={{ opacity: 0.8 }}>
                                            {dateFormatter.format(new Date(order.createdAt))}
                                        </Typography>
                                    </Stack>
                                    <Stack direction="row" spacing={1} flexWrap="wrap">
                                        <Chip
                                            label={translateOrderStatus(order.status, t)}
                                            color={order.status === "DONE" ? "success" : order.status === "CANCELLED" ? "default" : "warning"}
                                            size="small"
                                            sx={{ fontWeight: 700 }}
                                        />
                                        <Chip
                                            label={tDelivery(order.delivery === "DELIVERY" ? "delivery" : "pickup")}
                                            size="small"
                                            variant="outlined"
                                            sx={{ color: "white", borderColor: "rgba(255,255,255,0.35)" }}
                                        />
                                        <Chip
                                            label={tPayment(order.payment === "CASH" ? "cash" : "card")}
                                            size="small"
                                            variant="outlined"
                                            sx={{ color: "white", borderColor: "rgba(255,255,255,0.35)" }}
                                        />
                                    </Stack>
                                </Stack>

                                {order.status !== "CANCELLED" && (
                                    <Stack
                                        direction="row"
                                        spacing={1.5}
                                        alignItems="center"
                                        sx={{ p: 1.5, borderRadius: 2, bgcolor: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.3)" }}
                                    >
                                        <LocalShippingIcon sx={{ color: "#34d399" }} />
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
                                )}

                                <Box>
                                    <Typography variant="caption" sx={{ opacity: 0.75, display: "block", mb: 1 }}>
                                        {t("stepsLabel")}
                                    </Typography>
                                    <Stack direction="row" spacing={2} alignItems="center" sx={{ position: "relative" }}>
                                        <Box
                                            sx={{
                                                position: "absolute",
                                                top: "50%",
                                                left: 20,
                                                right: 20,
                                                height: 2,
                                                bgcolor: "rgba(255,255,255,0.15)",
                                                transform: "translateY(-50%)",
                                            }}
                                        />
                                        {steps.map((step, index) => {
                                            const active = index <= activeStepIndex;
                                            return (
                                                <Stack key={step.key} spacing={0.75} alignItems="center" sx={{ position: "relative" }}>
                                                    <Box
                                                        component={active ? motion.div : "div"}
                                                        animate={active ? {
                                                            boxShadow: [
                                                                "0 10px 24px rgba(249,115,22,0.35)",
                                                                "0 10px 24px rgba(249,115,22,0.8)",
                                                                "0 10px 24px rgba(249,115,22,0.35)"
                                                            ]
                                                        } : undefined}
                                                        transition={active ? { duration: 2, repeat: Infinity, ease: "easeInOut" } : undefined}
                                                        sx={{
                                                            width: 40,
                                                            height: 40,
                                                            borderRadius: "50%",
                                                            display: "flex",
                                                            alignItems: "center",
                                                            justifyContent: "center",
                                                            bgcolor: active ? "rgba(249,115,22,0.2)" : "rgba(255,255,255,0.08)",
                                                            border: active ? "1px solid rgba(249,115,22,0.6)" : "1px solid rgba(255,255,255,0.12)",
                                                            boxShadow: active ? "0 10px 24px rgba(249,115,22,0.35)" : "none",
                                                        }}
                                                    >
                                                        {step.icon}
                                                    </Box>
                                                    <Typography
                                                        variant="caption"
                                                        sx={{
                                                            color: active ? "rgba(255,255,255,0.95)" : "rgba(255,255,255,0.5)",
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

                                <Divider sx={{ borderColor: "rgba(255,255,255,0.12)" }} />

                                <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "2fr 1fr" }, gap: 2 }}>
                                    <Stack spacing={1.2}>
                                        <Typography variant="subtitle2" fontWeight={700} sx={{ opacity: 0.9 }}>
                                            {t("itemsLabel")}
                                        </Typography>
                                        {order.items.map((item) => (
                                            <Stack
                                                key={item.id}
                                                direction="row"
                                                justifyContent="space-between"
                                                sx={{ p: 1, borderRadius: 2, bgcolor: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)" }}
                                            >
                                                <Typography variant="body2">
                                                    {item.name} × {item.quantity}
                                                </Typography>
                                                <Typography variant="body2" fontWeight={700}>
                                                    {numberFormatter.format(item.price * item.quantity)} ֏
                                                </Typography>
                                            </Stack>
                                        ))}
                                    </Stack>

                                    <Paper
                                        variant="outlined"
                                        sx={{ p: 1.5, borderRadius: 2, bgcolor: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.12)" }}
                                    >
                                        <Stack spacing={1}>
                                            <Typography variant="subtitle2" fontWeight={700} sx={{ opacity: 0.9 }}>
                                                {t("details")}
                                            </Typography>
                                            {order.address && (
                                                <Typography variant="body2" sx={{ color: "rgba(255,255,255,0.8)" }}>
                                                    {t("address", { address: order.address })}
                                                </Typography>
                                            )}
                                            <Stack direction="row" justifyContent="space-between">
                                                <Typography variant="body2" sx={{ opacity: 0.75 }}>
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
                    )}
                </Paper>
        </PageContainer>
    );
}
