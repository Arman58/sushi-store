"use client";

import AddIcon from "@mui/icons-material/Add";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import LocalOfferOutlinedIcon from "@mui/icons-material/LocalOfferOutlined";
import RemoveIcon from "@mui/icons-material/Remove";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Divider from "@mui/material/Divider";
import IconButton from "@mui/material/IconButton";
import InputAdornment from "@mui/material/InputAdornment";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

import { useCartStore } from "@/features/cart";
import type { CartItem } from "@/features/cart/model/types";
import { PageContainer, SectionTitle } from "@/shared/ui";

// ─── Constants ────────────────────────────────────────────────────────────────

const MIN_ORDER_AMD = 3_000;
const UPSELL_THRESHOLD_AMD = 5_000;

// Hardcoded demo upsell products — replace with a real API call if needed
const UPSELL_ITEMS = [
    { id: 9999, name: "Кола 0.5 л", price: 500, emoji: "🥤" },
    { id: 9998, name: "Соус Спайси", price: 300, emoji: "🌶" },
    { id: 9997, name: "Картофель фри", price: 900, emoji: "🍟" },
];

// Mock promo codes
const PROMO_CODES: Record<string, number> = {
    EASTWEST10: 10,
    SUSHI20:    20,
};

// ─── Line item row ─────────────────────────────────────────────────────────────

function CartItemRow({
    item,
    onIncrease,
    onDecrease,
    onRemove,
}: {
    item: CartItem;
    onIncrease: () => void;
    onDecrease: () => void;
    onRemove: () => void;
}) {
    return (
        <Box
            sx={{
                display: "flex",
                alignItems: "center",
                gap: { xs: 1.5, sm: 2 },
                p: { xs: 1.5, sm: 2 },
                borderRadius: 3,
                border: "1px solid rgba(15,23,42,0.06)",
                bgcolor: "background.paper",
            }}
        >
            {/* Thumbnail */}
            <Box
                sx={{
                    position: "relative",
                    width: { xs: 60, sm: 72 },
                    height: { xs: 60, sm: 72 },
                    borderRadius: 2,
                    overflow: "hidden",
                    flexShrink: 0,
                    bgcolor: "rgba(15,23,42,0.05)",
                }}
            >
                {item.image ? (
                    <Image
                        src={item.image}
                        alt={item.name}
                        fill
                        sizes="72px"
                        style={{ objectFit: "cover" }}
                    />
                ) : (
                    <Box
                        sx={{
                            width: "100%",
                            height: "100%",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            background: "linear-gradient(135deg, #234F4A, #1F3A5F)",
                            fontSize: 24,
                        }}
                    >
                        🍱
                    </Box>
                )}
            </Box>

            {/* Name + unit price */}
            <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography
                    variant="body2"
                    fontWeight={600}
                    noWrap
                    sx={{ fontSize: { xs: 13, sm: 14 } }}
                >
                    {item.name}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                    {item.price.toLocaleString("ru-RU")} ֏ / шт.
                </Typography>
            </Box>

            {/* Stepper */}
            <Stack direction="row" alignItems="center" spacing={0.5} sx={{ flexShrink: 0 }}>
                <IconButton
                    size="small"
                    onClick={onDecrease}
                    sx={{
                        width: 32,
                        height: 32,
                        border: "1px solid rgba(15,23,42,0.12)",
                        borderRadius: "50%",
                    }}
                >
                    <RemoveIcon fontSize="small" />
                </IconButton>
                <Typography
                    variant="body2"
                    fontWeight={700}
                    sx={{ minWidth: 28, textAlign: "center" }}
                >
                    {item.quantity}
                </Typography>
                <IconButton
                    size="small"
                    onClick={onIncrease}
                    sx={{
                        width: 32,
                        height: 32,
                        bgcolor: "primary.main",
                        color: "white",
                        borderRadius: "50%",
                        "&:hover": { bgcolor: "primary.dark" },
                    }}
                >
                    <AddIcon fontSize="small" />
                </IconButton>
            </Stack>

            {/* Line total + delete */}
            <Stack
                direction="row"
                alignItems="center"
                spacing={1}
                sx={{ flexShrink: 0, minWidth: { xs: 72, sm: 90 }, justifyContent: "flex-end" }}
            >
                <Typography variant="body2" fontWeight={700} sx={{ fontSize: { xs: 13, sm: 14 } }}>
                    {(item.price * item.quantity).toLocaleString("ru-RU")} ֏
                </Typography>
                <IconButton size="small" color="error" onClick={onRemove}>
                    <DeleteOutlineIcon fontSize="small" />
                </IconButton>
            </Stack>
        </Box>
    );
}

// ─── Upsell row ───────────────────────────────────────────────────────────────

function UpsellBlock({ total, onAdd }: { total: number; onAdd: (item: { id: number; name: string; price: number }) => void }) {
    const remaining = UPSELL_THRESHOLD_AMD - total;
    if (remaining <= 0) return null;

    return (
        <Paper
            elevation={0}
            sx={{
                p: 2,
                borderRadius: 3,
                border: "1px solid rgba(249,115,22,0.2)",
                bgcolor: "rgba(249,115,22,0.04)",
            }}
        >
            <Typography variant="body2" fontWeight={700} sx={{ mb: 1.5 }}>
                🎁 Добавьте ещё на{" "}
                <Box component="span" sx={{ color: "warning.main" }}>
                    {remaining.toLocaleString("ru-RU")} ֏
                </Box>{" "}
                и получите приоритетную доставку
            </Typography>
            <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ gap: 1 }}>
                {UPSELL_ITEMS.map((item) => (
                    <Chip
                        key={item.id}
                        label={`${item.emoji} ${item.name} +${item.price.toLocaleString("ru-RU")} ֏`}
                        onClick={() => onAdd(item)}
                        clickable
                        variant="outlined"
                        size="small"
                        sx={{
                            borderRadius: 999,
                            fontWeight: 600,
                            borderColor: "rgba(249,115,22,0.4)",
                            "&:hover": {
                                bgcolor: "rgba(249,115,22,0.08)",
                                borderColor: "warning.main",
                            },
                        }}
                    />
                ))}
            </Stack>
        </Paper>
    );
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function CartPage() {
    const items = useCartStore((state) => state.items);
    const setItemQuantity = useCartStore((state) => state.setItemQuantity);
    const removeItem = useCartStore((state) => state.removeItem);
    const clearCart = useCartStore((state) => state.clear);
    const addItem = useCartStore((state) => state.addItem);

    const [promoCode, setPromoCode] = useState("");
    const [promoInput, setPromoInput] = useState("");
    const [promoError, setPromoError] = useState("");
    const discountPct = PROMO_CODES[promoCode] ?? 0;

    const hasItems = items.length > 0;

    const subtotal = items.reduce(
        (sum, item) => sum + item.price * item.quantity,
        0,
    );
    const discountAmt = Math.round((subtotal * discountPct) / 100);
    const totalPrice = subtotal - discountAmt;
    const belowMin = totalPrice < MIN_ORDER_AMD;

    const handleApplyPromo = () => {
        const code = promoInput.trim().toUpperCase();
        if (PROMO_CODES[code] !== undefined) {
            setPromoCode(code);
            setPromoError("");
        } else {
            setPromoCode("");
            setPromoError("Промокод не найден");
        }
    };

    const handleUpsellAdd = (item: { id: number; name: string; price: number }) => {
        addItem({ productId: item.id, name: item.name, price: item.price });
    };

    return (
        <main>
            <PageContainer>
                <SectionTitle>Корзина</SectionTitle>

                {!hasItems && (
                    <Box sx={{ textAlign: "center", py: 8 }}>
                        <Typography variant="h5" sx={{ mb: 1, fontSize: 48 }}>🛒</Typography>
                        <Typography variant="h6" fontWeight={700} sx={{ mb: 1 }}>
                            Корзина пуста
                        </Typography>
                        <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
                            Добавьте что-нибудь из меню, чтобы сделать заказ.
                        </Typography>
                        <Button
                            component={Link}
                            href="/menu"
                            variant="contained"
                            size="large"
                        >
                            Открыть меню
                        </Button>
                    </Box>
                )}

                {hasItems && (
                    <Stack
                        direction={{ xs: "column", md: "row" }}
                        spacing={4}
                        alignItems="flex-start"
                    >
                        {/* ── Left: item list ── */}
                        <Box flex={2}>
                            <Stack spacing={1.5}>
                                {items.map((item) => (
                                    <CartItemRow
                                        key={item.productId}
                                        item={item}
                                        onIncrease={() =>
                                            setItemQuantity(item.productId, item.quantity + 1)
                                        }
                                        onDecrease={() =>
                                            setItemQuantity(item.productId, item.quantity - 1)
                                        }
                                        onRemove={() => removeItem(item.productId)}
                                    />
                                ))}
                            </Stack>

                            <Box sx={{ mt: 1.5 }}>
                                <Button
                                    variant="text"
                                    color="inherit"
                                    onClick={clearCart}
                                    startIcon={<DeleteOutlineIcon />}
                                    size="small"
                                    sx={{ textTransform: "none", opacity: 0.6 }}
                                >
                                    Очистить корзину
                                </Button>
                            </Box>

                            {/* Upsell block */}
                            <Box sx={{ mt: 2 }}>
                                <UpsellBlock total={totalPrice} onAdd={handleUpsellAdd} />
                            </Box>
                        </Box>

                        {/* ── Right: summary ── */}
                        <Box
                            flex={1}
                            sx={{
                                p: { xs: 2, md: 3 },
                                borderRadius: 3,
                                border: "1px solid rgba(15,23,42,0.08)",
                                bgcolor: "background.paper",
                                minWidth: { xs: "100%", md: 280 },
                                position: { md: "sticky" },
                                top: { md: 80 },
                                boxShadow: "0 12px 28px rgba(15,23,42,0.05)",
                            }}
                        >
                            <Typography variant="h6" sx={{ mb: 2, fontWeight: 700 }}>
                                Итог заказа
                            </Typography>

                            {/* Line items summary */}
                            <Stack spacing={1} sx={{ mb: 2 }}>
                                <Stack direction="row" justifyContent="space-between">
                                    <Typography variant="body2" color="text.secondary">
                                        Товары ({items.length} поз.)
                                    </Typography>
                                    <Typography variant="body2">
                                        {subtotal.toLocaleString("ru-RU")} ֏
                                    </Typography>
                                </Stack>

                                {discountPct > 0 && (
                                    <Stack direction="row" justifyContent="space-between">
                                        <Typography variant="body2" color="success.main">
                                            Скидка {discountPct}% ({promoCode})
                                        </Typography>
                                        <Typography variant="body2" color="success.main" fontWeight={600}>
                                            −{discountAmt.toLocaleString("ru-RU")} ֏
                                        </Typography>
                                    </Stack>
                                )}

                                <Stack direction="row" justifyContent="space-between">
                                    <Typography variant="body2" color="text.secondary">
                                        Доставка
                                    </Typography>
                                    <Typography variant="body2" color="success.main" fontWeight={600}>
                                        Бесплатно
                                    </Typography>
                                </Stack>
                            </Stack>

                            <Divider sx={{ my: 1.5 }} />

                            <Stack direction="row" justifyContent="space-between" sx={{ mb: 2 }}>
                                <Typography variant="subtitle1" fontWeight={700}>
                                    К оплате
                                </Typography>
                                <Typography variant="subtitle1" fontWeight={700}>
                                    {totalPrice.toLocaleString("ru-RU")} ֏
                                </Typography>
                            </Stack>

                            {/* Promo code */}
                            <Box sx={{ mb: 2 }}>
                                <TextField
                                    value={promoInput}
                                    onChange={(e) => setPromoInput(e.target.value.toUpperCase())}
                                    placeholder="Промокод"
                                    size="small"
                                    fullWidth
                                    error={Boolean(promoError)}
                                    helperText={promoError || (promoCode ? `✓ Применён: -${discountPct}%` : "")}
                                    FormHelperTextProps={{
                                        sx: { color: promoCode ? "success.main" : undefined },
                                    }}
                                    InputProps={{
                                        startAdornment: (
                                            <InputAdornment position="start">
                                                <LocalOfferOutlinedIcon sx={{ fontSize: 16, color: "text.secondary" }} />
                                            </InputAdornment>
                                        ),
                                        endAdornment: (
                                            <InputAdornment position="end">
                                                <Button
                                                    size="small"
                                                    onClick={handleApplyPromo}
                                                    sx={{ textTransform: "none", minWidth: "auto", px: 1 }}
                                                >
                                                    Применить
                                                </Button>
                                            </InputAdornment>
                                        ),
                                        sx: { borderRadius: 2 },
                                    }}
                                    onKeyDown={(e) => {
                                        if (e.key === "Enter") handleApplyPromo();
                                    }}
                                />
                            </Box>

                            {/* Min order warning */}
                            {belowMin && (
                                <Alert severity="warning" sx={{ mb: 2, borderRadius: 2, fontSize: 12 }}>
                                    Минимальный заказ {MIN_ORDER_AMD.toLocaleString("ru-RU")} ֏.
                                    Добавьте ещё на{" "}
                                    {(MIN_ORDER_AMD - totalPrice).toLocaleString("ru-RU")} ֏.
                                </Alert>
                            )}

                            <Button
                                component={Link}
                                href="/checkout"
                                variant="contained"
                                color="primary"
                                fullWidth
                                size="large"
                                disabled={belowMin}
                                sx={{ fontWeight: 700 }}
                            >
                                Оформить заказ
                            </Button>

                            <Typography
                                variant="caption"
                                color="text.secondary"
                                sx={{ display: "block", mt: 1.5, textAlign: "center" }}
                            >
                                Адрес и оплата — на следующем шаге
                            </Typography>
                        </Box>
                    </Stack>
                )}
            </PageContainer>
        </main>
    );
}
