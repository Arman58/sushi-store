"use client";

import AddIcon from "@mui/icons-material/Add";
import CloseIcon from "@mui/icons-material/Close";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import LocalOfferOutlinedIcon from "@mui/icons-material/LocalOfferOutlined";
import RemoveIcon from "@mui/icons-material/Remove";
import ShoppingBagOutlinedIcon from "@mui/icons-material/ShoppingBagOutlined";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Divider from "@mui/material/Divider";
import Drawer from "@mui/material/Drawer";
import IconButton from "@mui/material/IconButton";
import InputAdornment from "@mui/material/InputAdornment";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

import { useCartStore } from "@/features/cart";
import { tokens } from "./theme";

// ─── Constants ────────────────────────────────────────────────────────────────

const DRAWER_WIDTH = 420;
const MIN_ORDER = 3_000;

const PROMO_CODES: Record<string, number> = {
    EASTWEST10: 10,
    SUSHI20: 20,
};

const UPSELL = [
    { id: 9997, name: "Картофель фри", price: 900, emoji: "🍟" },
    { id: 9998, name: "Кола 0.5 л",    price: 500, emoji: "🥤" },
    { id: 9999, name: "Соус Спайси",   price: 300, emoji: "🌶" },
];

// ─── Formatters ───────────────────────────────────────────────────────────────

const fmt = new Intl.NumberFormat("ru-RU");

// ─── Component ────────────────────────────────────────────────────────────────

export function CartDrawer() {
    const isCartOpen    = useCartStore((s) => s.isCartOpen);
    const closeCart     = useCartStore((s) => s.closeCart);
    const items         = useCartStore((s) => s.items);
    const addItem       = useCartStore((s) => s.addItem);
    const removeItem    = useCartStore((s) => s.removeItem);
    const setItemQty    = useCartStore((s) => s.setItemQuantity);
    const clearCart     = useCartStore((s) => s.clear);

    const [promoInput, setPromoInput] = useState("");
    const [promoCode,  setPromoCode]  = useState("");
    const [promoError, setPromoError] = useState("");

    const discountPct = PROMO_CODES[promoCode] ?? 0;
    const subtotal    = items.reduce((s, i) => s + i.price * i.quantity, 0);
    const discount    = Math.round((subtotal * discountPct) / 100);
    const total       = subtotal - discount;
    const count       = items.reduce((s, i) => s + i.quantity, 0);
    const belowMin    = total < MIN_ORDER && items.length > 0;

    const applyPromo = () => {
        const code = promoInput.trim().toUpperCase();
        if (PROMO_CODES[code] !== undefined) {
            setPromoCode(code);
            setPromoError("");
            setPromoInput("");
        } else {
            setPromoCode("");
            setPromoError("Промокод не найден");
        }
    };

    return (
        <Drawer
            anchor="right"
            open={isCartOpen}
            onClose={closeCart}
            PaperProps={{
                sx: {
                    width: { xs: "100vw", sm: DRAWER_WIDTH },
                    maxWidth: "100vw",
                    display: "flex",
                    flexDirection: "column",
                    bgcolor: tokens.surface,
                    borderLeft: `1px solid ${tokens.border}`,
                },
            }}
            slotProps={{
                backdrop: { sx: { backdropFilter: "blur(4px)", bgcolor: "rgba(0,0,0,0.7)" } },
            }}
        >
            {/* ── Header ── */}
            <Box
                sx={{
                    px: 3,
                    py: 2.5,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    borderBottom: `1px solid ${tokens.border}`,
                    flexShrink: 0,
                }}
            >
                <Stack direction="row" spacing={1.5} alignItems="center">
                    <ShoppingBagOutlinedIcon sx={{ color: tokens.orange, fontSize: 22 }} />
                    <Typography variant="h6" fontWeight={700}>
                        Корзина
                    </Typography>
                    {count > 0 && (
                        <Box
                            sx={{
                                px: 1,
                                py: 0.25,
                                borderRadius: 999,
                                bgcolor: tokens.orangeDim,
                                border: `1px solid ${tokens.orange}44`,
                            }}
                        >
                            <Typography variant="caption" fontWeight={700} sx={{ color: tokens.orange }}>
                                {count}
                            </Typography>
                        </Box>
                    )}
                </Stack>
                <IconButton
                    onClick={closeCart}
                    size="small"
                    sx={{
                        color: tokens.textSecondary,
                        bgcolor: tokens.surfaceUp,
                        "&:hover": { bgcolor: tokens.surfaceHi, color: tokens.textPrimary },
                    }}
                >
                    <CloseIcon fontSize="small" />
                </IconButton>
            </Box>

            {/* ── Empty state ── */}
            {items.length === 0 && (
                <Box
                    sx={{
                        flex: 1,
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 2,
                        px: 3,
                    }}
                >
                    <Typography sx={{ fontSize: 56 }}>🛒</Typography>
                    <Typography variant="h6" fontWeight={700}>
                        Корзина пуста
                    </Typography>
                    <Typography variant="body2" color="text.secondary" textAlign="center">
                        Добавьте блюда из меню, чтобы оформить заказ
                    </Typography>
                    <Button
                        variant="contained"
                        size="large"
                        component={Link}
                        href="/menu"
                        onClick={closeCart}
                        sx={{ mt: 1 }}
                    >
                        Открыть меню
                    </Button>
                </Box>
            )}

            {/* ── Item list ── */}
            {items.length > 0 && (
                <>
                    <Box sx={{ flex: 1, overflowY: "auto", px: 3, py: 2 }}>
                        <Stack spacing={1.5}>
                            {items.map((item) => (
                                <Box
                                    key={item.productId}
                                    sx={{
                                        display: "flex",
                                        gap: 2,
                                        p: 1.5,
                                        borderRadius: 2,
                                        bgcolor: tokens.surfaceUp,
                                        border: `1px solid ${tokens.border}`,
                                        transition: "border-color 0.15s",
                                        "&:hover": { borderColor: tokens.borderHi },
                                    }}
                                >
                                    {/* Thumbnail */}
                                    <Box
                                        sx={{
                                            position: "relative",
                                            width: 56,
                                            height: 56,
                                            borderRadius: 1.5,
                                            overflow: "hidden",
                                            flexShrink: 0,
                                            bgcolor: tokens.surfaceHi,
                                        }}
                                    >
                                        {item.image ? (
                                            <Image
                                                src={item.image}
                                                alt={item.name}
                                                fill
                                                sizes="56px"
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
                                                    fontSize: 22,
                                                }}
                                            >
                                                🍱
                                            </Box>
                                        )}
                                    </Box>

                                    {/* Info */}
                                    <Box sx={{ flex: 1, minWidth: 0 }}>
                                        <Typography
                                            variant="body2"
                                            fontWeight={600}
                                            noWrap
                                            sx={{ mb: 0.25 }}
                                        >
                                            {item.name}
                                        </Typography>
                                        <Typography
                                            variant="caption"
                                            sx={{ color: tokens.textSecondary }}
                                        >
                                            {fmt.format(item.price)} ֏ / шт.
                                        </Typography>

                                        {/* Stepper row */}
                                        <Stack
                                            direction="row"
                                            alignItems="center"
                                            justifyContent="space-between"
                                            sx={{ mt: 1 }}
                                        >
                                            <Stack direction="row" alignItems="center" spacing={0.5}>
                                                <IconButton
                                                    size="small"
                                                    onClick={() =>
                                                        setItemQty(item.productId, item.quantity - 1)
                                                    }
                                                    sx={{
                                                        width: 26,
                                                        height: 26,
                                                        border: `1px solid ${tokens.border}`,
                                                        borderRadius: "50%",
                                                        color: tokens.textSecondary,
                                                        "&:hover": { borderColor: tokens.orange, color: tokens.orange },
                                                    }}
                                                >
                                                    <RemoveIcon sx={{ fontSize: 12 }} />
                                                </IconButton>
                                                <Typography
                                                    variant="body2"
                                                    fontWeight={700}
                                                    sx={{ minWidth: 22, textAlign: "center" }}
                                                >
                                                    {item.quantity}
                                                </Typography>
                                                <IconButton
                                                    size="small"
                                                    onClick={() =>
                                                        setItemQty(item.productId, item.quantity + 1)
                                                    }
                                                    sx={{
                                                        width: 26,
                                                        height: 26,
                                                        bgcolor: tokens.orange,
                                                        borderRadius: "50%",
                                                        color: "#fff",
                                                        "&:hover": { bgcolor: tokens.orangeHi },
                                                    }}
                                                >
                                                    <AddIcon sx={{ fontSize: 12 }} />
                                                </IconButton>
                                            </Stack>

                                            <Stack direction="row" alignItems="center" spacing={1}>
                                                <Typography
                                                    variant="body2"
                                                    fontWeight={700}
                                                    sx={{ color: tokens.orange }}
                                                >
                                                    {fmt.format(item.price * item.quantity)} ֏
                                                </Typography>
                                                <IconButton
                                                    size="small"
                                                    onClick={() => removeItem(item.productId)}
                                                    sx={{
                                                        color: tokens.textMuted,
                                                        "&:hover": { color: tokens.red },
                                                    }}
                                                >
                                                    <DeleteOutlineIcon sx={{ fontSize: 16 }} />
                                                </IconButton>
                                            </Stack>
                                        </Stack>
                                    </Box>
                                </Box>
                            ))}
                        </Stack>

                        {/* ── Upsell ── */}
                        <Box
                            sx={{
                                mt: 3,
                                p: 2,
                                borderRadius: 2,
                                bgcolor: tokens.surfaceUp,
                                border: `1px solid ${tokens.orange}22`,
                            }}
                        >
                            <Typography
                                variant="caption"
                                fontWeight={700}
                                sx={{ color: tokens.orange, display: "block", mb: 1.5 }}
                            >
                                🎁 Добавьте к заказу
                            </Typography>
                            <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ gap: 1 }}>
                                {UPSELL.map((u) => (
                                    <Chip
                                        key={u.id}
                                        label={`${u.emoji} ${u.name} +${fmt.format(u.price)} ֏`}
                                        onClick={() =>
                                            addItem({ productId: u.id, name: u.name, price: u.price })
                                        }
                                        clickable
                                        size="small"
                                        variant="outlined"
                                        sx={{
                                            borderColor: tokens.border,
                                            color: tokens.textSecondary,
                                            fontWeight: 600,
                                            "&:hover": {
                                                borderColor: tokens.orange,
                                                color: tokens.orange,
                                                bgcolor: tokens.orangeDim,
                                            },
                                        }}
                                    />
                                ))}
                            </Stack>
                        </Box>

                        {/* ── Promo code ── */}
                        <Box sx={{ mt: 2 }}>
                            <TextField
                                value={promoInput}
                                onChange={(e) => setPromoInput(e.target.value.toUpperCase())}
                                onKeyDown={(e) => e.key === "Enter" && applyPromo()}
                                placeholder="Промокод"
                                size="small"
                                fullWidth
                                error={Boolean(promoError)}
                                helperText={
                                    promoError ||
                                    (promoCode
                                        ? `✓ Скидка ${discountPct}% применена`
                                        : undefined)
                                }
                                FormHelperTextProps={{
                                    sx: { color: promoCode ? tokens.green : undefined },
                                }}
                                InputProps={{
                                    startAdornment: (
                                        <InputAdornment position="start">
                                            <LocalOfferOutlinedIcon
                                                sx={{ fontSize: 15, color: tokens.textMuted }}
                                            />
                                        </InputAdornment>
                                    ),
                                    endAdornment: (
                                        <InputAdornment position="end">
                                            <Button
                                                size="small"
                                                onClick={applyPromo}
                                                sx={{ minWidth: "auto", px: 1.5, py: 0.5, fontSize: 12 }}
                                            >
                                                Применить
                                            </Button>
                                        </InputAdornment>
                                    ),
                                }}
                            />
                        </Box>
                    </Box>

                    {/* ── Footer: totals + CTA ── */}
                    <Box
                        sx={{
                            px: 3,
                            pt: 2,
                            pb: 3,
                            borderTop: `1px solid ${tokens.border}`,
                            flexShrink: 0,
                            bgcolor: tokens.surface,
                        }}
                    >
                        {/* Breakdown */}
                        <Stack spacing={1} sx={{ mb: 2 }}>
                            <Stack direction="row" justifyContent="space-between">
                                <Typography variant="body2" color="text.secondary">
                                    Товары
                                </Typography>
                                <Typography variant="body2">
                                    {fmt.format(subtotal)} ֏
                                </Typography>
                            </Stack>
                            {discountPct > 0 && (
                                <Stack direction="row" justifyContent="space-between">
                                    <Typography variant="body2" sx={{ color: tokens.green }}>
                                        Скидка {discountPct}%
                                    </Typography>
                                    <Typography variant="body2" sx={{ color: tokens.green }} fontWeight={600}>
                                        −{fmt.format(discount)} ֏
                                    </Typography>
                                </Stack>
                            )}
                            <Stack direction="row" justifyContent="space-between">
                                <Typography variant="body2" color="text.secondary">
                                    Доставка
                                </Typography>
                                <Typography variant="body2" sx={{ color: tokens.green }} fontWeight={600}>
                                    Бесплатно
                                </Typography>
                            </Stack>
                        </Stack>

                        <Divider sx={{ mb: 2 }} />

                        {/* Total */}
                        <Stack direction="row" justifyContent="space-between" sx={{ mb: 2 }}>
                            <Typography variant="subtitle1" fontWeight={700}>
                                Итого
                            </Typography>
                            <Typography
                                variant="subtitle1"
                                fontWeight={800}
                                sx={{ color: tokens.orange, fontSize: "1.1rem" }}
                            >
                                {fmt.format(total)} ֏
                            </Typography>
                        </Stack>

                        {/* Min order warning */}
                        {belowMin && (
                            <Typography
                                variant="caption"
                                sx={{
                                    display: "block",
                                    mb: 1.5,
                                    color: tokens.orangeHi,
                                    textAlign: "center",
                                }}
                            >
                                Минимальный заказ {fmt.format(MIN_ORDER)} ֏. Ещё{" "}
                                {fmt.format(MIN_ORDER - total)} ֏
                            </Typography>
                        )}

                        {/* CTA */}
                        <Button
                            component={Link}
                            href="/checkout"
                            onClick={closeCart}
                            variant="contained"
                            fullWidth
                            size="large"
                            disabled={belowMin}
                            sx={{ fontWeight: 700, fontSize: "1rem" }}
                        >
                            Оформить заказ
                        </Button>

                        {/* Clear */}
                        <Button
                            onClick={clearCart}
                            variant="text"
                            fullWidth
                            size="small"
                            sx={{
                                mt: 1,
                                color: tokens.textMuted,
                                fontSize: 12,
                                "&:hover": { color: tokens.red },
                            }}
                        >
                            Очистить корзину
                        </Button>
                    </Box>
                </>
            )}
        </Drawer>
    );
}
