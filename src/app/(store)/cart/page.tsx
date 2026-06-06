"use client";

import AddIcon from "@mui/icons-material/Add";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import LocalOfferOutlinedIcon from "@mui/icons-material/LocalOfferOutlined";
import RemoveIcon from "@mui/icons-material/Remove";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Divider from "@mui/material/Divider";
import IconButton from "@mui/material/IconButton";
import InputAdornment from "@mui/material/InputAdornment";
import Stack from "@mui/material/Stack";
import { alpha } from "@mui/material/styles";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";

import type { CartItem, CartLineIssue } from "@/features/cart";
import {
    cartLineIssueMessage,
    ModifiersList,
    useCartLineValidation,
    useCartStore,
} from "@/features/cart";
import { ApiError, validatePromo } from "@/shared/api";
import { sanitizeProductImageSrc } from "@/shared/lib/product-cover";
import { EmptyCart, PageContainer, SectionTitle } from "@/shared/ui";
import { tokens } from "@/shared/ui/theme";

// ─── Constants ────────────────────────────────────────────────────────────────

const MIN_ORDER_AMD = 3_000;

// ─── Line item row ─────────────────────────────────────────────────────────────

function CartItemRow({
    item,
    lineIssue,
    onIncrease,
    onDecrease,
    onRemove,
}: {
    item: CartItem;
    lineIssue?: CartLineIssue;
    onIncrease: () => void;
    onDecrease: () => void;
    onRemove: () => void;
}) {
    const lineInvalid = Boolean(lineIssue);

    return (
        <Box
            sx={{
                display: "flex",
                alignItems: "center",
                gap: { xs: 1.5, sm: 2 },
                p: { xs: 1.5, sm: 2 },
                borderRadius: 3,
                border: "1px solid",
                borderColor: lineInvalid ? tokens.red : alpha("#0f172a", 0.06),
                bgcolor: lineInvalid ? tokens.redDim : "background.paper",
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
                {sanitizeProductImageSrc(item.image) ? (
                    <Image
                        src={sanitizeProductImageSrc(item.image)!}
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
                    color={lineInvalid ? "error.main" : "text.primary"}
                    sx={{ fontSize: { xs: 13, sm: 14 } }}
                >
                    {item.name}
                </Typography>
                <Typography
                    variant="caption"
                    color={lineInvalid ? "error.main" : "text.secondary"}
                    sx={{
                        display: "block",
                        textDecoration: lineInvalid ? "line-through" : undefined,
                    }}
                >
                    {item.calculatedItemPrice.toLocaleString("ru-RU")} ֏ / шт.
                </Typography>
                {item.selectedModifiers.length > 0 && (
                    <ModifiersList
                        modifiers={item.selectedModifiers}
                        sx={{ mt: 0.5 }}
                    />
                )}
                {lineIssue ? (
                    <Typography variant="caption" color="error.main" sx={{ display: "block", mt: 0.5 }}>
                        {cartLineIssueMessage(lineIssue)}
                    </Typography>
                ) : null}
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
                <Typography
                    variant="body2"
                    fontWeight={700}
                    color={lineInvalid ? "text.disabled" : "text.primary"}
                    sx={{
                        fontSize: { xs: 13, sm: 14 },
                        textDecoration: lineInvalid ? "line-through" : undefined,
                    }}
                >
                    {(item.calculatedItemPrice * item.quantity).toLocaleString("ru-RU")} ֏
                </Typography>
                <IconButton size="small" color="error" onClick={onRemove}>
                    <DeleteOutlineIcon fontSize="small" />
                </IconButton>
            </Stack>
        </Box>
    );
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function CartPage() {
    const items = useCartStore((state) => state.items);
    const setItemQuantity = useCartStore((state) => state.setItemQuantity);
    const removeItem = useCartStore((state) => state.removeItem);
    const clearCart = useCartStore((state) => state.clear);
    const appliedPromoCode = useCartStore((state) => state.appliedPromoCode);
    const setAppliedPromoCode = useCartStore((state) => state.setAppliedPromoCode);

    const {
        cartLineIssues,
        cartValidatePending,
        hasCartLineProblems,
        validSubtotal: subtotal,
    } = useCartLineValidation(items);

    const [promoDraft, setPromoDraft] = useState("");
    const [promoError, setPromoError] = useState("");
    const [promoDiscount, setPromoDiscount] = useState(0);
    const [promoApplying, setPromoApplying] = useState(false);

    const hasItems = items.length > 0;

    useEffect(() => {
        if (appliedPromoCode) setPromoDraft(appliedPromoCode);
    }, [appliedPromoCode]);

    useEffect(() => {
        let cancelled = false;
        async function sync() {
            if (!appliedPromoCode || !hasItems) {
                if (!cancelled) setPromoDiscount(0);
                return;
            }
            try {
                const res = await validatePromo({
                    code: appliedPromoCode,
                    cartAmount: subtotal,
                    deliveryAmount: 0,
                });
                if (!cancelled) {
                    setPromoDiscount(res.discountAmount);
                    setPromoError("");
                }
            } catch (e) {
                if (!cancelled) {
                    setPromoDiscount(0);
                    setAppliedPromoCode(null);
                    setPromoError(
                        e instanceof ApiError
                            ? e.message || "Промокод недействителен"
                            : "Не удалось проверить промокод",
                    );
                }
            }
        }
        void sync();
        return () => {
            cancelled = true;
        };
    }, [appliedPromoCode, hasItems, subtotal, setAppliedPromoCode]);

    const totalPrice = Math.max(0, subtotal - promoDiscount);
    const belowMin = totalPrice < MIN_ORDER_AMD;

    const handleApplyPromo = async () => {
        setPromoError("");
        const code = promoDraft.trim().replace(/\s+/g, "").toUpperCase();
        if (!code) {
            setPromoError("Введите промокод");
            return;
        }

        setPromoApplying(true);
        try {
            await validatePromo({
                code,
                cartAmount: subtotal,
                deliveryAmount: 0,
            });
            setAppliedPromoCode(code);
        } catch (e) {
            if (e instanceof ApiError) {
                setPromoError(e.message || "Промокод не найден");
            } else {
                setPromoError("Не удалось проверить промокод");
            }
        } finally {
            setPromoApplying(false);
        }
    };

    return (
        <main>
            <PageContainer>
                <SectionTitle>Корзина</SectionTitle>

                {!hasItems && <EmptyCart layout="page" />}

                {hasItems && (
                    <Stack
                        direction={{ xs: "column", md: "row" }}
                        spacing={4}
                        alignItems="flex-start"
                    >
                        <Box flex={2}>
                            {hasCartLineProblems && (
                                <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>
                                    Часть позиций недоступна или изменилась по цене.
                                    Удалите подсвеченные строки перед оформлением.
                                </Alert>
                            )}
                            {cartValidatePending && !hasCartLineProblems && (
                                <Alert severity="info" sx={{ mb: 2, borderRadius: 2 }}>
                                    Проверяем актуальность корзины…
                                </Alert>
                            )}
                            <Stack spacing={1.5}>
                                {items.map((item) => (
                                    <CartItemRow
                                        key={item.cartItemId}
                                        item={item}
                                        lineIssue={cartLineIssues[item.cartItemId]}
                                        onIncrease={() =>
                                            setItemQuantity(item.cartItemId, item.quantity + 1)
                                        }
                                        onDecrease={() =>
                                            setItemQuantity(item.cartItemId, item.quantity - 1)
                                        }
                                        onRemove={() => removeItem(item.cartItemId)}
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

                                {promoDiscount > 0 && appliedPromoCode && (
                                    <Stack direction="row" justifyContent="space-between">
                                        <Typography variant="body2" color="success.main">
                                            Скидка ({appliedPromoCode})
                                        </Typography>
                                        <Typography variant="body2" color="success.main" fontWeight={600}>
                                            −{promoDiscount.toLocaleString("ru-RU")} ֏
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
                                    value={promoDraft}
                                    onChange={(e) => {
                                        setPromoDraft(e.target.value.toUpperCase());
                                        if (promoError) setPromoError("");
                                    }}
                                    placeholder="Промокод"
                                    size="small"
                                    fullWidth
                                    disabled={!hasItems || promoApplying}
                                    error={Boolean(promoError)}
                                    helperText={
                                        promoError ||
                                        (appliedPromoCode && !promoError
                                            ? `Применён: ${appliedPromoCode}`
                                            : "")
                                    }
                                    FormHelperTextProps={{
                                        sx:
                                            appliedPromoCode && !promoError
                                                ? { color: "success.main" }
                                                : undefined,
                                    }}
                                    InputProps={{
                                        startAdornment: (
                                            <InputAdornment position="start">
                                                <LocalOfferOutlinedIcon
                                                    sx={{ fontSize: 16, color: "text.secondary" }}
                                                />
                                            </InputAdornment>
                                        ),
                                        endAdornment: (
                                            <InputAdornment position="end">
                                                <Box
                                                    sx={{
                                                        display: "flex",
                                                        alignItems: "center",
                                                        gap: 0.5,
                                                    }}
                                                >
                                                    {appliedPromoCode ? (
                                                        <Button
                                                            type="button"
                                                            size="small"
                                                            sx={{
                                                                textTransform: "none",
                                                                minWidth: "auto",
                                                                px: 1,
                                                            }}
                                                            onClick={() => {
                                                                setAppliedPromoCode(null);
                                                                setPromoDraft("");
                                                                setPromoError("");
                                                            }}
                                                        >
                                                            Сбросить
                                                        </Button>
                                                    ) : null}
                                                    <Button
                                                        size="small"
                                                        onClick={() =>
                                                            void handleApplyPromo()
                                                        }
                                                        sx={{
                                                            textTransform: "none",
                                                            minWidth: "auto",
                                                            px: 1,
                                                        }}
                                                        disabled={!hasItems || promoApplying}
                                                    >
                                                        {promoApplying ? "…" : "Применить"}
                                                    </Button>
                                                </Box>
                                            </InputAdornment>
                                        ),
                                        sx: { borderRadius: 2 },
                                    }}
                                    onKeyDown={(e) => {
                                        if (e.key === "Enter") void handleApplyPromo();
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
                                disabled={belowMin || hasCartLineProblems || cartValidatePending}
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
