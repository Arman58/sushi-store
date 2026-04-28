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
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";

import { ApiError, fetchOrderStatus, type OrderStatusResponse } from "@/shared/api";
import { orderStatusSchema, type OrderStatusFormValues } from "@/shared/lib/schemas";
import { PageContainer, SectionTitle } from "@/shared/ui";

// ─── Status config ─────────────────────────────────────────────────────────────

const STEPS = [
    { key: "NEW", label: "Принят", icon: <ReceiptLongIcon fontSize="small" /> },
    { key: "PREPARING", label: "Готовится", icon: <TaskAltIcon fontSize="small" /> },
    { key: "DELIVERING", label: "В пути", icon: <LocalShippingIcon fontSize="small" /> },
    { key: "DONE", label: "Доставлен", icon: <AccessTimeIcon fontSize="small" /> },
] as const;

const STATUS_LABEL: Record<OrderStatusResponse["status"], string> = {
    NEW: "Принят",
    PREPARING: "Готовится",
    DELIVERING: "В пути",
    DONE: "Доставлен",
    CANCELLED: "Отменён",
};

const DELIVERY_LABEL: Record<OrderStatusResponse["delivery"], string> = {
    DELIVERY: "Доставка",
    PICKUP:   "Самовывоз",
};

const PAYMENT_LABEL: Record<OrderStatusResponse["payment"], string> = {
    CASH: "Наличными",
    CARD: "Картой",
};

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function OrderStatusPage() {
    const [order, setOrder] = useState<OrderStatusResponse | null>(null);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

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
            setErrorMessage(
                error instanceof ApiError ? error.message : "Не удалось найти заказ",
            );
        }
    };

    const activeStepIndex =
        order?.status === "CANCELLED"
            ? -1
            : STEPS.findIndex((step) => step.key === order?.status);

    return (
        <main>
            <PageContainer>
                {/* Header banner */}
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
                        <SectionTitle>Статус заказа</SectionTitle>
                        <Typography variant="body1" sx={{ color: "rgba(255,255,255,0.82)", maxWidth: 500 }}>
                            Отследите заказ по номеру и телефону — увидите этапы и время доставки.
                        </Typography>
                        <Stack direction="row" spacing={1.5} sx={{ mt: 2 }} flexWrap="wrap">
                            <Chip
                                label="Live-обновления"
                                size="small"
                                sx={{ borderRadius: 999, bgcolor: "rgba(255,255,255,0.1)", color: "white", border: "1px solid rgba(255,255,255,0.2)" }}
                            />
                            <Chip
                                label="Средняя доставка 45 мин"
                                size="small"
                                sx={{ borderRadius: 999, bgcolor: "rgba(255,255,255,0.08)", color: "white" }}
                            />
                        </Stack>
                    </Box>
                </Box>

                {/* Lookup form */}
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
                                    label="Номер заказа"
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
                                    label="Телефон"
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
                                /* Выровнять с середины поля ввода (не по низу helperText при flex-end) */
                                mt: { xs: 0, md: 2 },
                            }}
                        >
                            {isSubmitting ? "Поиск…" : "Проверить"}
                        </Button>
                    </Stack>

                    {errorMessage && <Alert severity="error">{errorMessage}</Alert>}

                    {/* Order result card */}
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
                                {/* Header row */}
                                <Stack
                                    direction={{ xs: "column", sm: "row" }}
                                    justifyContent="space-between"
                                    alignItems={{ xs: "flex-start", sm: "center" }}
                                    spacing={1.5}
                                >
                                    <Stack spacing={0.5}>
                                        <Typography variant="overline" sx={{ opacity: 0.7 }}>
                                            Трекер заказа
                                        </Typography>
                                        <Typography variant="h6" fontWeight={800}>
                                            Заказ #{order.id}
                                        </Typography>
                                        <Typography variant="body2" sx={{ opacity: 0.8 }}>
                                            {new Date(order.createdAt).toLocaleString("ru-RU")}
                                        </Typography>
                                    </Stack>
                                    <Stack direction="row" spacing={1} flexWrap="wrap">
                                        <Chip
                                            label={STATUS_LABEL[order.status]}
                                            color={order.status === "DONE" ? "success" : order.status === "CANCELLED" ? "default" : "warning"}
                                            size="small"
                                            sx={{ fontWeight: 700 }}
                                        />
                                        <Chip label={DELIVERY_LABEL[order.delivery]} size="small" variant="outlined" sx={{ color: "white", borderColor: "rgba(255,255,255,0.35)" }} />
                                        <Chip label={PAYMENT_LABEL[order.payment]} size="small" variant="outlined" sx={{ color: "white", borderColor: "rgba(255,255,255,0.35)" }} />
                                    </Stack>
                                </Stack>

                                {/* ETA */}
                                {order.status !== "CANCELLED" && (
                                    <Stack
                                        direction="row"
                                        spacing={1.5}
                                        alignItems="center"
                                        sx={{ p: 1.5, borderRadius: 2, bgcolor: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.3)" }}
                                    >
                                        <LocalShippingIcon sx={{ color: "#34d399" }} />
                                        <Typography variant="body2" fontWeight={600}>
                                            {order.etaMinutes === 0
                                                ? "Заказ готов / доставлен"
                                                : `Ориентировочно: ${order.etaMinutes} мин.`}
                                        </Typography>
                                    </Stack>
                                )}

                                {/* Progress stepper */}
                                <Box>
                                    <Typography variant="caption" sx={{ opacity: 0.75, display: "block", mb: 1 }}>
                                        Этапы выполнения
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
                                        {STEPS.map((step, index) => {
                                            const active = index <= activeStepIndex;
                                            return (
                                                <Stack key={step.key} spacing={0.75} alignItems="center" sx={{ position: "relative" }}>
                                                    <Box
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

                                {/* Items + details grid */}
                                <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "2fr 1fr" }, gap: 2 }}>
                                    <Stack spacing={1.2}>
                                        <Typography variant="subtitle2" fontWeight={700} sx={{ opacity: 0.9 }}>
                                            Позиции заказа
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
                                                    {(item.price * item.quantity).toLocaleString("ru-RU")} ֏
                                                </Typography>
                                            </Stack>
                                        ))}
                                    </Stack>

                                    <Paper
                                        variant="outlined"
                                        sx={{ p: 1.5, borderRadius: 2, bgcolor: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.12)" }}
                                    >
                                        <Stack spacing={1}>
                                            <Typography variant="subtitle2" fontWeight={700} sx={{ opacity: 0.9 }}>Детали</Typography>
                                            {order.address && (
                                                <Typography variant="body2" sx={{ color: "rgba(255,255,255,0.8)" }}>
                                                    Адрес: {order.address}
                                                </Typography>
                                            )}
                                            <Stack direction="row" justifyContent="space-between">
                                                <Typography variant="body2" sx={{ opacity: 0.75 }}>Сумма</Typography>
                                                <Typography variant="body2" fontWeight={700}>
                                                    {order.totalPrice.toLocaleString("ru-RU")} ֏
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
        </main>
    );
}
