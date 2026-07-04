"use client";

import CloseIcon from "@mui/icons-material/Close";
import PhoneOutlinedIcon from "@mui/icons-material/PhoneOutlined";
import {
    Box,
    Button,
    Card,
    CardContent,
    Chip,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Divider,
    IconButton,
    MenuItem,
    Select,
    Stack,
    TableCell,
    TableRow,
    Typography,
    useMediaQuery,
    useTheme,
} from "@mui/material";
import type { SelectChangeEvent } from "@mui/material/Select";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import type { CartItem } from "@/features/cart";
import {
    buildCartItemId,
    ModifiersList,
    parseSelectedModifiersJson,
    useCartStore,
} from "@/features/cart";
import {
    computeEstimatedDeliveryAt,
    ETA_PRESET_MINUTES,
    formatEstimatedDeliveryTime,
    orderStatusLabel,
} from "@/lib/order-status";

const CELL_SX = { px: 2, py: 1.5 };

import {
    highlight,
    inferEtaPresetMinutes,
    OrderPaymentChip,
    type OrderRowProps,
    OrderStatusChip,
    readApiErrorMessage,
} from "./order-row-helpers";

// re-export для обратной совместимости импортов
export { OrderPaymentChip, OrderStatusChip } from "./order-row-helpers";

export function OrderRow({ order, searchQuery, variant = "table" }: OrderRowProps) {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down("md"));
    const [open, setOpen] = useState(false);
    const [localStatus, setLocalStatus] = useState(order.status);
    const [updatingStatus, setUpdatingStatus] = useState(false);
    const [statusError, setStatusError] = useState<string | null>(null);
    const [localEta, setLocalEta] = useState<string | null>(order.estimatedDeliveryAt ?? null);
    const [activeEtaMinutes, setActiveEtaMinutes] = useState<number | null>(() =>
        inferEtaPresetMinutes(order.estimatedDeliveryAt ?? null),
    );
    const [updatingEta, setUpdatingEta] = useState(false);
    const [etaError, setEtaError] = useState<string | null>(null);

    useEffect(() => {
        setLocalStatus(order.status);
    }, [order.status]);

    useEffect(() => {
        const nextEta = order.estimatedDeliveryAt ?? null;
        setLocalEta(nextEta);
        setActiveEtaMinutes(inferEtaPresetMinutes(nextEta));
    }, [order.estimatedDeliveryAt, order.id]);

    const router = useRouter();
    const setItems = useCartStore((state) => state.setItems);

    const handleRepeat = () => {
        const cartItems: CartItem[] = order.items.map((item) => {
            const mods = parseSelectedModifiersJson(item.selectedModifiers);
            const pid = item.productId ?? item.id;
            const calculatedItemPrice = item.price;
            const basePrice =
                calculatedItemPrice -
                mods.reduce((s, m) => s + m.priceDelta, 0);
            return {
                cartItemId: buildCartItemId(pid, mods),
                productId: pid,
                name: item.name,
                basePrice,
                quantity: item.quantity,
                selectedModifiers: mods,
                calculatedItemPrice,
                image: undefined,
            };
        });

        setItems(cartItems);
        router.push("/checkout");
    };

    const handleStatusChange = async (_orderId: number, newStatus: string) => {
        if (newStatus === localStatus) return;
        const previous = localStatus;
        setStatusError(null);
        setLocalStatus(newStatus);
        setUpdatingStatus(true);
        try {
            const res = await fetch(`/api/admin/orders/${_orderId}/status`, {
                method: "POST",
                credentials: "same-origin",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status: newStatus }),
            });

            if (!res.ok) {
                const detail = await readApiErrorMessage(res, "Не удалось обновить статус");
                throw new Error(`Ошибка: ${detail}`);
            }
            router.refresh();
        } catch (error) {
            setLocalStatus(previous);
            const message =
                error instanceof Error
                    ? error.message
                    : "Не удалось обновить статус";
            setStatusError(message);
        } finally {
            setUpdatingStatus(false);
        }
    };

    const onSelectStatus = (event: SelectChangeEvent<string>) => {
        const next = event.target.value;
        void handleStatusChange(order.id, next);
    };

    const handleSetEta = async (minutes: number) => {
        if (updatingEta) return;

        setEtaError(null);

        const previousEta = localEta;
        const previousActive = activeEtaMinutes;

        setActiveEtaMinutes(minutes);
        setLocalEta(computeEstimatedDeliveryAt(minutes).toISOString());
        setUpdatingEta(true);

        try {
            const res = await fetch(`/api/admin/orders/${order.id}`, {
                method: "PATCH",
                credentials: "same-origin",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ etaMinutes: minutes }),
            });

            if (!res.ok) {
                const detail = await readApiErrorMessage(res, "Не удалось установить время");
                throw new Error(`Ошибка: ${detail}`);
            }

            const data = (await res.json()) as { estimatedDeliveryAt?: string };
            const nextIso = data.estimatedDeliveryAt ?? null;
            setLocalEta(nextIso);
            setActiveEtaMinutes(inferEtaPresetMinutes(nextIso) ?? minutes);
        } catch (error) {
            setLocalEta(previousEta);
            setActiveEtaMinutes(previousActive);
            const message =
                error instanceof Error
                    ? error.message
                    : "Ошибка: Не удалось установить время";
            setEtaError(message.startsWith("Ошибка:") ? message : `Ошибка: ${message}`);
        } finally {
            setUpdatingEta(false);
        }
    };

    const statusLabel = useMemo(() => {
        switch (localStatus) {
            case "NEW":
            case "COOKING":
            case "DELIVERING":
            case "DONE":
            case "CANCELLED":
                return orderStatusLabel(localStatus);
            default:
                return order.statusLabel;
        }
    }, [localStatus, order.statusLabel]);

    const etaLabel = useMemo(() => {
        if (!localEta) return null;
        const date = new Date(localEta);
        if (Number.isNaN(date.getTime())) return null;
        return formatEstimatedDeliveryTime(date);
    }, [localEta]);

    const telHref = order.phone.replace(/[^\d+]/g, "") ? `tel:${order.phone.replace(/[^\d+]/g, "")}` : undefined;

    const statusSelect = (
        <Select
            value={localStatus}
            size={isMobile ? "medium" : "small"}
            fullWidth
            disabled={updatingStatus}
            onChange={onSelectStatus}
            onClick={(e) => e.stopPropagation()}
        >
            <MenuItem value="NEW">{orderStatusLabel("NEW")}</MenuItem>
            <MenuItem value="COOKING">{orderStatusLabel("COOKING")}</MenuItem>
            <MenuItem value="DELIVERING">{orderStatusLabel("DELIVERING")}</MenuItem>
            <MenuItem value="DONE">{orderStatusLabel("DONE")}</MenuItem>
            <MenuItem value="CANCELLED">{orderStatusLabel("CANCELLED")}</MenuItem>
        </Select>
    );

    return (
        <>
            {variant === "table" ? (
            <TableRow
                hover
                onClick={() => setOpen(true)}
                sx={{
                    cursor: "pointer",
                    transition: "background-color 0.16s ease-out",
                    "&:hover": { bgcolor: "action.hover" },
                    "& > *": {
                        borderBottom: "1px solid",
                        borderColor: "divider",
                    },
                }}
            >
                <TableCell sx={CELL_SX}>
                    <Typography
                        variant="body2"
                        fontWeight={700}
                        sx={{ fontVariantNumeric: "tabular-nums" }}
                    >
                        #{highlight(String(order.id), searchQuery)}
                    </Typography>
                </TableCell>

                <TableCell sx={{ ...CELL_SX, whiteSpace: "nowrap" }}>
                    <Typography variant="body2" color="text.secondary">
                        {order.createdAtFormatted}
                    </Typography>
                </TableCell>

                <TableCell sx={{ ...CELL_SX, maxWidth: 200 }}>
                    <Typography
                        variant="body2"
                        fontWeight={600}
                        noWrap
                        title={order.name}
                    >
                        {highlight(order.name, searchQuery)}
                    </Typography>
                </TableCell>

                <TableCell align="right" sx={CELL_SX}>
                    <Typography
                        variant="body2"
                        fontWeight={700}
                        sx={{ fontVariantNumeric: "tabular-nums" }}
                    >
                        {order.totalPrice.toLocaleString("ru-RU")} ֏
                    </Typography>
                </TableCell>

                <TableCell sx={CELL_SX}>
                    <OrderStatusChip label={statusLabel} status={localStatus} />
                </TableCell>

                <TableCell sx={CELL_SX}>
                    <OrderPaymentChip
                        label={order.paymentLabel}
                        payment={order.payment}
                    />
                </TableCell>
            </TableRow>
            ) : (
                <Card
                    variant="outlined"
                    sx={{
                        borderRadius: 2,
                        cursor: "pointer",
                        "&:active": { bgcolor: "action.hover" },
                    }}
                    onClick={() => setOpen(true)}
                >
                    <CardContent sx={{ p: 2, "&:last-child": { pb: 2 } }}>
                        <Stack spacing={1.25}>
                            <Stack
                                direction="row"
                                alignItems="center"
                                justifyContent="space-between"
                                gap={1}
                            >
                                <Typography variant="subtitle1" fontWeight={800}>
                                    #{highlight(String(order.id), searchQuery)}
                                </Typography>
                                <OrderStatusChip label={statusLabel} status={localStatus} />
                            </Stack>

                            <Typography variant="body2" color="text.secondary">
                                {order.createdAtFormatted}
                            </Typography>

                            <Typography variant="body1" fontWeight={600}>
                                {highlight(order.name, searchQuery)}
                            </Typography>

                            {telHref ? (
                                <Typography
                                    component="a"
                                    href={telHref}
                                    variant="body2"
                                    onClick={(e) => e.stopPropagation()}
                                    sx={{
                                        color: "primary.main",
                                        fontWeight: 600,
                                        textDecoration: "none",
                                    }}
                                >
                                    {highlight(order.phone, searchQuery)}
                                </Typography>
                            ) : (
                                <Typography variant="body2">
                                    {highlight(order.phone, searchQuery)}
                                </Typography>
                            )}

                            <Stack
                                direction="row"
                                alignItems="center"
                                justifyContent="space-between"
                                flexWrap="wrap"
                                gap={1}
                            >
                                <Typography variant="body1" fontWeight={800}>
                                    {order.totalPrice.toLocaleString("ru-RU")} ֏
                                </Typography>
                                <OrderPaymentChip
                                    label={order.paymentLabel}
                                    payment={order.payment}
                                />
                            </Stack>

                            <Stack
                                direction={{ xs: "column", sm: "row" }}
                                spacing={1}
                                onClick={(e) => e.stopPropagation()}
                            >
                                <Box sx={{ flex: 1, minWidth: 0 }}>{statusSelect}</Box>
                                {telHref ? (
                                    <Button
                                        component="a"
                                        href={telHref}
                                        variant="outlined"
                                        size="large"
                                        startIcon={<PhoneOutlinedIcon />}
                                        sx={{ flexShrink: 0, textTransform: "none" }}
                                    >
                                        Позвонить
                                    </Button>
                                ) : null}
                            </Stack>
                            {statusError && (
                                <Typography variant="caption" color="error">
                                    {statusError}
                                </Typography>
                            )}
                        </Stack>
                    </CardContent>
                </Card>
            )}

            <Dialog
                open={open}
                onClose={() => setOpen(false)}
                fullWidth
                fullScreen={isMobile}
                maxWidth="sm"
            >
                <DialogTitle
                    sx={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        pr: 1,
                    }}
                >
                    <Stack direction="row" spacing={1} alignItems="center">
                        <Typography variant="h6" fontWeight={700}>
                            Заказ #{order.id}
                        </Typography>
                        <OrderStatusChip
                            label={statusLabel}
                            status={localStatus}
                        />
                    </Stack>
                    <IconButton onClick={() => setOpen(false)} aria-label="Закрыть">
                        <CloseIcon />
                    </IconButton>
                </DialogTitle>
                <DialogContent dividers>
                    <Stack spacing={2}>
                        <Stack direction="row" spacing={1} flexWrap="wrap">
                            <Chip label={order.deliveryLabel} size="small" />
                            <OrderPaymentChip
                                label={order.paymentLabel}
                                payment={order.payment}
                            />
                        </Stack>

                        <Stack spacing={0.75}>
                            <Typography variant="body2" color="text.secondary">
                                Дата: {order.createdAtFormatted}
                            </Typography>
                            <Typography variant="body2">
                                Клиент: {order.name}
                            </Typography>
                            <Typography variant="body2">
                                Телефон: {order.phone}
                            </Typography>
                            <Typography variant="body2">
                                Адрес: {order.address || "-"}
                            </Typography>
                            {order.scheduledFor && (
                                <Typography
                                    variant="body2"
                                    sx={{ fontWeight: 700, color: "info.main" }}
                                >
                                    ⏰ Предзаказ ко времени:{" "}
                                    {new Date(order.scheduledFor).toLocaleString(
                                        "ru-RU",
                                        {
                                            day: "2-digit",
                                            month: "2-digit",
                                            hour: "2-digit",
                                            minute: "2-digit",
                                        },
                                    )}
                                </Typography>
                            )}
                            {order.changeFrom != null && (
                                <Typography
                                    variant="body2"
                                    sx={{ fontWeight: 700, color: "warning.main" }}
                                >
                                    💵 Клиент даст{" "}
                                    {order.changeFrom.toLocaleString("ru-RU")} ֏
                                    {order.changeFrom - order.totalPrice > 0
                                        ? ` — подготовить сдачу ${(
                                              order.changeFrom - order.totalPrice
                                          ).toLocaleString("ru-RU")} ֏`
                                        : " (без сдачи)"}
                                </Typography>
                            )}
                            {order.comment && (
                                <Typography variant="body2">
                                    Комментарий: {order.comment}
                                </Typography>
                            )}
                        </Stack>

                        <Box>
                            <Typography
                                variant="caption"
                                color="text.secondary"
                                sx={{ textTransform: "uppercase", letterSpacing: 0.5 }}
                            >
                                Статус заказа
                            </Typography>
                            <Select
                                value={localStatus}
                                size={isMobile ? "medium" : "small"}
                                fullWidth
                                disabled={updatingStatus}
                                sx={{ mt: 0.75 }}
                                onChange={onSelectStatus}
                            >
                                <MenuItem value="NEW">{orderStatusLabel("NEW")}</MenuItem>
                                <MenuItem value="COOKING">{orderStatusLabel("COOKING")}</MenuItem>
                                <MenuItem value="DELIVERING">{orderStatusLabel("DELIVERING")}</MenuItem>
                                <MenuItem value="DONE">{orderStatusLabel("DONE")}</MenuItem>
                                <MenuItem value="CANCELLED">{orderStatusLabel("CANCELLED")}</MenuItem>
                            </Select>
                            {statusError && (
                                <Typography
                                    variant="caption"
                                    color="error"
                                    display="block"
                                    sx={{ mt: 0.5 }}
                                >
                                    {statusError}
                                </Typography>
                            )}
                        </Box>

                        <Box>
                            <Typography
                                variant="caption"
                                color="text.secondary"
                                sx={{ textTransform: "uppercase", letterSpacing: 0.5 }}
                            >
                                Установить время готовности
                            </Typography>

                            <Box
                                sx={{
                                    mt: 1,
                                    mb: 1.5,
                                    px: 1.5,
                                    py: 1.25,
                                    borderRadius: 2,
                                    bgcolor: etaLabel
                                        ? "rgba(0, 179, 65, 0.08)"
                                        : "action.hover",
                                    border: "1px solid",
                                    borderColor: etaLabel
                                        ? "rgba(0, 179, 65, 0.28)"
                                        : "divider",
                                }}
                            >
                                {etaLabel ? (
                                    <Typography
                                        sx={{
                                            fontSize: 17,
                                            fontWeight: 800,
                                            color: "primary.main",
                                            lineHeight: 1.35,
                                        }}
                                    >
                                        ⏱ Клиент ждёт до ~{etaLabel}
                                    </Typography>
                                ) : (
                                    <Typography
                                        sx={{
                                            fontSize: 15,
                                            fontWeight: 500,
                                            color: "text.secondary",
                                            lineHeight: 1.4,
                                        }}
                                    >
                                        ⏱ Время не задано (клиент видит «Уточняется...»)
                                    </Typography>
                                )}
                            </Box>

                            <Stack
                                direction="row"
                                spacing={1}
                                flexWrap="wrap"
                                useFlexGap
                            >
                                {ETA_PRESET_MINUTES.map((minutes) => {
                                    const isActive = activeEtaMinutes === minutes;
                                    return (
                                        <Button
                                            key={minutes}
                                            size={isMobile ? "large" : "small"}
                                            variant={isActive ? "contained" : "outlined"}
                                            color={isActive ? "primary" : "inherit"}
                                            disabled={updatingEta}
                                            onClick={() => void handleSetEta(minutes)}
                                            sx={{
                                                textTransform: "none",
                                                fontWeight: 700,
                                                minWidth: isMobile ? 80 : 72,
                                                flex: isMobile ? "1 1 calc(50% - 8px)" : undefined,
                                                boxShadow: isActive ? "none" : undefined,
                                            }}
                                        >
                                            {updatingEta && isActive ? "…" : `${minutes} мин`}
                                        </Button>
                                    );
                                })}
                            </Stack>
                            {etaError && (
                                <Typography
                                    variant="caption"
                                    color="error"
                                    display="block"
                                    sx={{ mt: 0.5 }}
                                >
                                    {etaError}
                                </Typography>
                            )}
                        </Box>

                        <Divider />

                        <Stack spacing={1}>
                            {order.items.map((item) => {
                                const mods = parseSelectedModifiersJson(
                                    item.selectedModifiers,
                                );
                                return (
                                    <Stack key={item.id} spacing={0.25}>
                                        <Stack
                                            direction="row"
                                            justifyContent="space-between"
                                            alignItems="center"
                                        >
                                            <Typography variant="body2">
                                                {item.name} × {item.quantity}
                                            </Typography>
                                            <Typography
                                                variant="body2"
                                                fontWeight={700}
                                                sx={{
                                                    fontVariantNumeric:
                                                        "tabular-nums",
                                                }}
                                            >
                                                {(
                                                    item.price * item.quantity
                                                ).toLocaleString("ru-RU")}{" "}
                                                ֏
                                            </Typography>
                                        </Stack>
                                        <ModifiersList
                                            modifiers={mods}
                                            sx={{ pl: 0.5 }}
                                        />
                                    </Stack>
                                );
                            })}
                        </Stack>

                        <Divider />

                        <Stack spacing={0.75}>
                            <Stack
                                direction="row"
                                justifyContent="space-between"
                            >
                                <Typography variant="body2" color="text.secondary">
                                    Сумма товаров
                                </Typography>
                                <Typography
                                    variant="body2"
                                    fontWeight={600}
                                    sx={{ fontVariantNumeric: "tabular-nums" }}
                                >
                                    {order.subtotalBeforeDiscount.toLocaleString(
                                        "ru-RU",
                                    )}{" "}
                                    ֏
                                </Typography>
                            </Stack>
                            {order.discountAmount > 0 && (
                                <Stack
                                    direction="row"
                                    justifyContent="space-between"
                                >
                                    <Typography variant="body2" color="error.main">
                                        Скидка
                                    </Typography>
                                    <Typography
                                        variant="body2"
                                        fontWeight={600}
                                        color="error.main"
                                        sx={{
                                            fontVariantNumeric: "tabular-nums",
                                        }}
                                    >
                                        −
                                        {order.discountAmount.toLocaleString(
                                            "ru-RU",
                                        )}{" "}
                                        ֏
                                    </Typography>
                                </Stack>
                            )}
                            <Stack
                                direction="row"
                                justifyContent="space-between"
                            >
                                <Typography variant="body2" color="text.secondary">
                                    Доставка
                                </Typography>
                                <Typography
                                    variant="body2"
                                    fontWeight={600}
                                    sx={{ fontVariantNumeric: "tabular-nums" }}
                                >
                                    {order.deliveryPrice.toLocaleString("ru-RU")} ֏
                                </Typography>
                            </Stack>
                            <Divider flexItem sx={{ my: 0.5 }} />
                            <Stack
                                direction="row"
                                justifyContent="space-between"
                            >
                                <Typography variant="body2" fontWeight={700}>
                                    Итого
                                </Typography>
                                <Typography
                                    variant="body2"
                                    fontWeight={800}
                                    sx={{ fontVariantNumeric: "tabular-nums" }}
                                >
                                    {order.totalPrice.toLocaleString("ru-RU")} ֏
                                </Typography>
                            </Stack>
                        </Stack>
                    </Stack>
                </DialogContent>
                <DialogActions
                    sx={{
                        px: 3,
                        py: 2,
                        flexDirection: isMobile ? "column" : "row",
                        gap: isMobile ? 1 : 0,
                        "& .MuiButton-root": isMobile ? { width: "100%", m: 0 } : undefined,
                    }}
                >
                    <Button onClick={() => setOpen(false)} size={isMobile ? "large" : "medium"}>
                        Закрыть
                    </Button>
                    <Button
                        variant="outlined"
                        onClick={handleRepeat}
                        size={isMobile ? "large" : "medium"}
                    >
                        Повторить заказ
                    </Button>
                    {telHref ? (
                        <Button
                            component="a"
                            href={telHref}
                            variant="contained"
                            size={isMobile ? "large" : "medium"}
                            startIcon={<PhoneOutlinedIcon />}
                        >
                            Позвонить
                        </Button>
                    ) : null}
                </DialogActions>
            </Dialog>
        </>
    );
}
