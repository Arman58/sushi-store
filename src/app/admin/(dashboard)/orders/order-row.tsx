"use client";

import CloseIcon from "@mui/icons-material/Close";
import {
    Box,
    Button,
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
} from "@mui/material";
import type { ChipProps } from "@mui/material/Chip";
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
    orderStatusChipColor,
    orderStatusLabel,
} from "@/lib/order-status";

const CELL_SX = { px: 2, py: 1.5 };

async function readApiErrorMessage(res: Response, fallback: string): Promise<string> {
    const text = await res.text();
    if (!text.trim()) {
        return `${fallback} (HTTP ${res.status})`;
    }

    try {
        const json = JSON.parse(text) as { error?: unknown; message?: unknown };
        const detail =
            typeof json.error === "string"
                ? json.error
                : typeof json.message === "string"
                  ? json.message
                  : null;
        if (detail?.trim()) {
            return detail;
        }
    } catch {
        // ответ не JSON — покажем как есть
    }

    return text;
}

/** Ближайший пресет (15/30/45/60), если ETA задано недавно. */
function inferEtaPresetMinutes(iso: string | null, nowMs = Date.now()): number | null {
    if (!iso) return null;
    const etaMs = new Date(iso).getTime();
    if (Number.isNaN(etaMs)) return null;

    const diffMin = Math.round((etaMs - nowMs) / 60_000);
    let best: number | null = null;
    let bestDelta = Infinity;

    for (const minutes of ETA_PRESET_MINUTES) {
        const delta = Math.abs(diffMin - minutes);
        if (delta <= 3 && delta < bestDelta) {
            best = minutes;
            bestDelta = delta;
        }
    }

    return best;
}

type OrderItem = {
    id: number;
    productId?: number | null;
    name: string;
    price: number;
    quantity: number;
    selectedModifiers?: unknown;
};

type OrderRowProps = {
    order: {
        id: number;
        createdAtFormatted: string;
        name: string;
        phone: string;
        deliveryLabel: string;
        paymentLabel: string;
        payment: string;
        statusLabel: string;
        status: string;
        address: string;
        subtotalBeforeDiscount: number;
        discountAmount: number;
        deliveryPrice: number;
        totalPrice: number;
        items: OrderItem[];
        comment?: string | null;
        estimatedDeliveryAt?: string | null;
    };
    searchQuery: string;
};

function highlight(text: string, query: string) {
    if (!query.trim()) return text;

    const lowerText = text.toLowerCase();
    const lowerQuery = query.toLowerCase();
    const index = lowerText.indexOf(lowerQuery);

    if (index === -1) return text;

    const before = text.slice(0, index);
    const match = text.slice(index, index + query.length);
    const after = text.slice(index + query.length);

    return (
        <>
            {before}
            <Box
                component="span"
                sx={{
                    bgcolor: "rgba(249,115,22,0.18)",
                    borderRadius: 0.5,
                    px: 0.3,
                    fontWeight: 700,
                }}
            >
                {match}
            </Box>
            {after}
        </>
    );
}

function paymentChipProps(payment: string): Pick<ChipProps, "variant" | "color"> {
    if (payment === "CARD") {
        return { variant: "outlined", color: "primary" };
    }
    return { variant: "outlined", color: "default" };
}

export function OrderStatusChip({
    label,
    status,
}: {
    label: string;
    status: string;
}) {
    return (
        <Chip
            label={label}
            size="small"
            color={
                status === "NEW" ||
                status === "COOKING" ||
                status === "DELIVERING" ||
                status === "DONE" ||
                status === "CANCELLED"
                    ? orderStatusChipColor(status)
                    : "default"
            }
            sx={{ fontWeight: 600, fontSize: 12 }}
        />
    );
}

export function OrderPaymentChip({
    label,
    payment,
}: {
    label: string;
    payment: string;
}) {
    const chipProps = paymentChipProps(payment);
    return (
        <Chip
            label={label}
            size="small"
            variant={chipProps.variant}
            color={chipProps.color}
            sx={{ fontWeight: 500, fontSize: 12 }}
        />
    );
}

export function OrderRow({ order, searchQuery }: OrderRowProps) {
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

    return (
        <>
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

            <Dialog
                open={open}
                onClose={() => setOpen(false)}
                fullWidth
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
                                Адрес: {order.address || "—"}
                            </Typography>
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
                                size="small"
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

                            <Stack direction="row" spacing={1} flexWrap="wrap">
                                {ETA_PRESET_MINUTES.map((minutes) => {
                                    const isActive = activeEtaMinutes === minutes;
                                    return (
                                        <Button
                                            key={minutes}
                                            size="small"
                                            variant={isActive ? "contained" : "outlined"}
                                            color={isActive ? "primary" : "inherit"}
                                            disabled={updatingEta}
                                            onClick={() => void handleSetEta(minutes)}
                                            sx={{
                                                textTransform: "none",
                                                fontWeight: 700,
                                                minWidth: 72,
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
                <DialogActions sx={{ px: 3, py: 2 }}>
                    <Button onClick={() => setOpen(false)}>Закрыть</Button>
                    <Button variant="outlined" onClick={handleRepeat}>
                        Повторить заказ
                    </Button>
                </DialogActions>
            </Dialog>
        </>
    );
}
