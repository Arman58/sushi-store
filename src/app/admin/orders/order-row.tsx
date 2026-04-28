"use client";

import CloseIcon from "@mui/icons-material/Close";
import VisibilityIcon from "@mui/icons-material/Visibility";
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
    Tooltip,
    Typography,
} from "@mui/material";
import type { SelectChangeEvent } from "@mui/material/Select";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { useCartStore } from "@/features/cart";

type OrderItem = {
    id: number;
    productId?: number | null;
    name: string;
    price: number;
    quantity: number;
};

type OrderRowProps = {
    order: {
        id: number;
        createdAtFormatted: string;
        name: string;
        phone: string;
        deliveryLabel: string;
        paymentLabel: string;
        statusLabel: string;
        status: string;
        address: string;
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

    const itemsCount = useMemo(
        () => order.items.reduce((sum, item) => sum + item.quantity, 0),
        [order.items],
    );

    const itemsPreview = useMemo(
        () =>
            order.items
                .slice(0, 3)
                .map((item) => item.name)
                .join(", "),
        [order.items],
    );

    const hasMoreItems = order.items.length > 3;
    const handleRepeat = () => {
        const cartItems = order.items.map((item) => ({
            productId: item.productId ?? item.id,
            name: item.name,
            price: item.price,
            quantity: item.quantity,
            image: undefined,
        }));

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
                error instanceof Error ? error.message : "Не удалось обновить статус";
            setStatusError(message);
        } finally {
            setUpdatingStatus(false);
        }
    };

    const onSelectStatus = (event: SelectChangeEvent<string>) => {
        const next = event.target.value;
        void handleStatusChange(order.id, next);
    };

    const statusSelectSx = {
        minWidth: 130,
        fontSize: "0.85rem",
        "& .MuiSelect-select": { py: 0.5 },
    };

    const statusSelect = (
        <Box sx={{ display: "inline-block" }}>
            <Select
                value={localStatus}
                size="small"
                variant="outlined"
                disabled={updatingStatus}
                sx={{
                    ...statusSelectSx,
                    minWidth: { xs: 120, md: 130 },
                }}
                onChange={onSelectStatus}
            >
                <MenuItem value="NEW">📦 Новый</MenuItem>
                <MenuItem value="PREPARING">👨‍🍳 Готовится</MenuItem>
                <MenuItem value="DELIVERING">🛵 В пути</MenuItem>
                <MenuItem value="DONE">✅ Доставлен</MenuItem>
                <MenuItem value="CANCELLED">❌ Отменен</MenuItem>
            </Select>
        </Box>
    );

    return (
        <>
            <TableRow
                hover
                sx={{
                    transition:
                        "background-color 0.16s ease-out, transform 0.16s ease-out",
                    "&:hover": {
                        bgcolor: "rgba(249,115,22,0.03)",
                        transform: "translateY(-1px)",
                    },
                    "& > *": {
                        borderBottom: "1px solid rgba(226,232,240,0.8)",
                    },
                }}
            >
                <TableCell
                    sx={{
                        fontWeight: 600,
                        color: "text.secondary",
                        maxWidth: 68,
                        whiteSpace: "nowrap",
                    }}
                >
                    <Tooltip title={`#${order.id}`}>
                        <Box component="span" sx={{ display: "inline-block" }}>
                            #{highlight(String(order.id), searchQuery)}
                        </Box>
                    </Tooltip>
                </TableCell>

                <TableCell sx={{ whiteSpace: "nowrap", maxWidth: 120 }}>
                    <Tooltip title={order.createdAtFormatted}>
                        <Typography variant="body2" noWrap>
                            {order.createdAtFormatted}
                        </Typography>
                    </Tooltip>
                </TableCell>

                <TableCell>
                    <Tooltip title={order.name}>
                        <Typography
                            variant="body2"
                            fontWeight={700}
                            sx={{ lineHeight: 1.2, maxWidth: 200 }}
                            noWrap
                        >
                            {highlight(order.name, searchQuery)}
                        </Typography>
                    </Tooltip>
                    <Stack
                        direction="row"
                        spacing={1}
                        alignItems="center"
                        sx={{ display: { xs: "flex", md: "none" }, mt: 0.5 }}
                    >
                        <Chip
                            label={order.deliveryLabel}
                            size="small"
                            sx={{ borderRadius: 999, fontSize: 10 }}
                        />
                        {statusSelect}
                        <Chip
                            label={order.paymentLabel}
                            size="small"
                            sx={{ borderRadius: 999, fontSize: 10 }}
                        />
                    </Stack>
                    <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{
                            display: {
                                xs: "block",
                                md: "none",
                            },
                        }}
                    >
                        {order.totalPrice.toLocaleString("ru-RU")} ֏ · {order.phone}
                    </Typography>
                </TableCell>

                <TableCell
                    sx={{
                        display: {
                            xs: "none",
                            md: "table-cell",
                        },
                        width: 140,
                    }}
                >
                    <Tooltip title={order.phone}>
                        <Typography variant="body2" noWrap>
                            {highlight(order.phone, searchQuery)}
                        </Typography>
                    </Tooltip>
                </TableCell>

                <TableCell>
                    <Tooltip title={order.deliveryLabel}>
                        <Chip
                            label={order.deliveryLabel}
                            size="small"
                            sx={{
                                borderRadius: 999,
                                fontSize: 11,
                                fontWeight: 500,
                                bgcolor:
                                    order.deliveryLabel === "Доставка"
                                        ? "rgba(56,189,248,0.12)"
                                        : "rgba(134,239,172,0.18)",
                            }}
                        />
                    </Tooltip>
                </TableCell>

                <TableCell sx={{ verticalAlign: "middle" }}>
                    {statusSelect}
                    {statusError && (
                        <Typography variant="caption" color="error" display="block" sx={{ mt: 0.5 }}>
                            {statusError}
                        </Typography>
                    )}
                </TableCell>

                <TableCell
                    sx={{
                        display: {
                            xs: "none",
                            md: "table-cell",
                        },
                        maxWidth: 220,
                    }}
                >
                    <Tooltip title={order.address || undefined}>
                        <Typography
                            variant="body2"
                            noWrap
                            color="text.secondary"
                        >
                            {order.address || "—"}
                        </Typography>
                    </Tooltip>
                </TableCell>

                <TableCell
                    sx={{
                        display: {
                            xs: "none",
                            md: "table-cell",
                        },
                    }}
                >
                    <Tooltip title={order.paymentLabel}>
                        <Chip
                            label={order.paymentLabel}
                            size="small"
                            sx={{
                                borderRadius: 999,
                                fontSize: 11,
                                bgcolor:
                                    order.paymentLabel === "Наличными"
                                        ? "rgba(250,204,21,0.20)"
                                        : "rgba(96,165,250,0.20)",
                            }}
                        />
                    </Tooltip>
                </TableCell>

                <TableCell align="right" sx={{ whiteSpace: "nowrap" }}>
                    <Typography variant="body2" fontWeight={700}>
                        {order.totalPrice.toLocaleString("ru-RU")} ֏
                    </Typography>
                </TableCell>

                <TableCell
                    sx={{
                        display: {
                            xs: "none",
                            md: "table-cell",
                        },
                    }}
                >
                    <Stack direction="row" spacing={1} alignItems="center">
                        <Typography variant="caption" color="text.secondary">
                            {itemsCount} поз.{" "}
                            {itemsPreview &&
                                `• ${itemsPreview}${hasMoreItems ? "…" : ""}`}
                        </Typography>
                        <Button
                            variant="text"
                            size="small"
                            startIcon={<VisibilityIcon fontSize="small" />}
                            onClick={() => setOpen(true)}
                            sx={{ textTransform: "none" }}
                        >
                            Подробнее
                        </Button>
                        <Button
                            variant="outlined"
                            size="small"
                            onClick={handleRepeat}
                            sx={{ textTransform: "none" }}
                        >
                            Повторить
                        </Button>
                    </Stack>
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
                    <span>Заказ #{order.id}</span>
                    <IconButton onClick={() => setOpen(false)}>
                        <CloseIcon />
                    </IconButton>
                </DialogTitle>
                <DialogContent dividers>
                    <Stack spacing={1.5}>
                        <Stack direction="row" spacing={1} flexWrap="wrap">
                            <Chip
                                label={order.deliveryLabel}
                                size="small"
                                color="default"
                            />
                            <Chip
                                label={order.paymentLabel}
                                size="small"
                                color="default"
                            />
                            <Chip
                                label={`${order.totalPrice.toLocaleString("ru-RU")} ֏`}
                                size="small"
                                color="default"
                            />
                        </Stack>
                        <Typography variant="body2" color="text.secondary">
                            Дата: {order.createdAtFormatted}
                        </Typography>
                        <Typography variant="body2">Клиент: {order.name}</Typography>
                        <Typography variant="body2">Телефон: {order.phone}</Typography>
                        <Typography variant="body2">
                            Адрес: {order.address || "—"}
                        </Typography>
                        {order.comment && (
                            <Typography variant="body2">
                                Комментарий: {order.comment}
                            </Typography>
                        )}
                        <Divider />
                        <Stack spacing={1}>
                            {order.items.map((item) => (
                                <Stack
                                    key={item.id}
                                    direction="row"
                                    justifyContent="space-between"
                                    alignItems="center"
                                >
                                    <Typography variant="body2">
                                        {item.name} × {item.quantity}
                                    </Typography>
                                    <Typography variant="body2" fontWeight={700}>
                                        {(item.price * item.quantity).toLocaleString(
                                            "ru-RU",
                                        )}{" "}
                                        ֏
                                    </Typography>
                                </Stack>
                            ))}
                        </Stack>
                    </Stack>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setOpen(false)}>Закрыть</Button>
                </DialogActions>
            </Dialog>
        </>
    );
}
