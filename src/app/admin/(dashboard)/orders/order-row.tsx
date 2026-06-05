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
import { orderStatusLabel } from "@/lib/order-service";

const CELL_SX = { px: 2, py: 1.5 };

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

function statusChipColor(status: string): ChipProps["color"] {
    switch (status) {
        case "NEW":
            return "info";
        case "IN_WORK":
        case "DELIVERING":
            return "warning";
        case "DONE":
            return "success";
        case "CANCELLED":
            return "error";
        default:
            return "default";
    }
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
            color={statusChipColor(status)}
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

    useEffect(() => {
        setLocalStatus(order.status);
    }, [order.status]);

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
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status: newStatus }),
            });

            if (!res.ok) {
                const text = await res.text();
                throw new Error(text || "Не удалось обновить статус");
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

    const statusLabel = useMemo(() => {
        switch (localStatus) {
            case "NEW":
            case "IN_WORK":
            case "DELIVERING":
            case "DONE":
            case "CANCELLED":
                return orderStatusLabel(localStatus);
            default:
                return order.statusLabel;
        }
    }, [localStatus, order.statusLabel]);

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
                                <MenuItem value="IN_WORK">{orderStatusLabel("IN_WORK")}</MenuItem>
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
