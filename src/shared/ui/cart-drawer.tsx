"use client";

import AddIcon from "@mui/icons-material/Add";
import CloseIcon from "@mui/icons-material/Close";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import HighlightOffOutlinedIcon from "@mui/icons-material/HighlightOffOutlined";
import LocalOfferOutlinedIcon from "@mui/icons-material/LocalOfferOutlined";
import RemoveIcon from "@mui/icons-material/Remove";
import ShoppingBagOutlinedIcon from "@mui/icons-material/ShoppingBagOutlined";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Divider from "@mui/material/Divider";
import IconButton from "@mui/material/IconButton";
import InputAdornment from "@mui/material/InputAdornment";
import Stack from "@mui/material/Stack";
import { alpha, useTheme } from "@mui/material/styles";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { AnimatePresence, LayoutGroup, motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import CountUp from "react-countup";

import { ModifiersList, useCartStore } from "@/features/cart";
import { ApiError, validatePromo } from "@/shared/api";
import { sanitizeProductImageSrc } from "@/shared/lib/product-cover";

import { EmptyCart } from "./empty-cart";
import { tokens } from "./theme";

const DRAWER_WIDTH = 420;
const MotionBox = motion.create(Box);
const MIN_ORDER = 3_000;

// ─── Formatters ───────────────────────────────────────────────────────────────

const fmt = new Intl.NumberFormat("ru-RU");

// ─── Component ────────────────────────────────────────────────────────────────

export function CartDrawer() {
    const isCartOpen = useCartStore((s) => s.isCartOpen);
    const closeCart = useCartStore((s) => s.closeCart);
    const items = useCartStore((s) => s.items);
    const removeItem = useCartStore((s) => s.removeItem);
    const setItemQty = useCartStore((s) => s.setItemQuantity);
    const clearCart = useCartStore((s) => s.clear);
    const appliedPromoCode = useCartStore((s) => s.appliedPromoCode);
    const setAppliedPromoCode = useCartStore((s) => s.setAppliedPromoCode);

    const [promoInput, setPromoInput] = useState("");
    const [promoError, setPromoError] = useState("");
    const [promoDiscount, setPromoDiscount] = useState(0);
    const [promoApplying, setPromoApplying] = useState(false);

    const hasItems = items.length > 0;

    const subtotal = items.reduce(
        (s, i) => s + i.calculatedItemPrice * i.quantity,
        0,
    );
    const total = Math.max(0, subtotal - promoDiscount);
    const count = items.reduce((s, i) => s + i.quantity, 0);
    const belowMin = total < MIN_ORDER && items.length > 0;

    useEffect(() => {
        if (appliedPromoCode) setPromoInput(appliedPromoCode);
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

    const applyPromo = async () => {
        setPromoError("");
        const code = promoInput.trim().replace(/\s+/g, "").toUpperCase();
        if (!code) {
            setPromoError("Введите промокод");
            return;
        }
        if (!hasItems) return;
        setPromoApplying(true);
        try {
            await validatePromo({
                code,
                cartAmount: subtotal,
                deliveryAmount: 0,
            });
            setAppliedPromoCode(code);
            setPromoInput(code);
            setPromoError("");
        } catch (e) {
            setAppliedPromoCode(null);
            setPromoError(
                e instanceof ApiError
                    ? e.message || "Промокод не найден"
                    : "Не удалось проверить промокод",
            );
        } finally {
            setPromoApplying(false);
        }
    };

    const clearPromo = () => {
        setAppliedPromoCode(null);
        setPromoInput("");
        setPromoError("");
        setPromoDiscount(0);
    };

    const theme = useTheme();

    useEffect(() => {
        if (!isCartOpen) return;
        const prevOverflow = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        return () => {
            document.body.style.overflow = prevOverflow;
        };
    }, [isCartOpen]);

    useEffect(() => {
        if (!isCartOpen) return;
        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape") closeCart();
        };
        window.addEventListener("keydown", onKeyDown);
        return () => window.removeEventListener("keydown", onKeyDown);
    }, [isCartOpen, closeCart]);

    const drawerTransition = {
        duration: 0.28,
        ease: [0.25, 1, 0.5, 1] as [number, number, number, number],
    };

    return (
        <AnimatePresence>
            {isCartOpen ? (
                <>
                    <MotionBox
                        key="cart-drawer-backdrop"
                        role="presentation"
                        onClick={closeCart}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.22, ease: [0.25, 1, 0.5, 1] }}
                        sx={{
                            position: "fixed",
                            inset: 0,
                            zIndex: theme.zIndex.drawer - 1,
                            bgcolor: (t) => alpha(t.palette.common.black, 0.35),
                            backdropFilter: "blur(6px)",
                            WebkitBackdropFilter: "blur(6px)",
                        }}
                    />
                    <MotionBox
                        key="cart-drawer-panel"
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="cart-drawer-title"
                        initial={{ x: "100%" }}
                        animate={{ x: 0 }}
                        exit={{ x: "100%" }}
                        transition={drawerTransition}
                        sx={{
                            position: "fixed",
                            top: 0,
                            right: 0,
                            bottom: 0,
                            width: { xs: "100vw", sm: DRAWER_WIDTH },
                            maxWidth: "100vw",
                            height: "100%",
                            maxHeight: "100dvh",
                            display: "flex",
                            flexDirection: "column",
                            overflowX: "hidden",
                            overflowY: "auto",
                            overscrollBehaviorY: "contain",
                            WebkitOverflowScrolling: "touch",
                            bgcolor: "background.paper",
                            borderLeft: "1px solid",
                            borderColor: "divider",
                            boxShadow: (t) =>
                                `-16px 0 48px ${alpha(t.palette.common.black, 0.14)}`,
                            zIndex: theme.zIndex.drawer,
                        }}
                    >
            <LayoutGroup id="cart-drawer">
                <Box
                    sx={{
                        height: "100%",
                        display: "flex",
                        flexDirection: "column",
                        overflow: "hidden",
                        minHeight: 0,
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
                                borderBottom: "1px solid",
                                borderColor: "divider",
                                flexShrink: 0,
                                bgcolor: "background.paper",
                            }}
                        >
                            <Stack
                                direction="row"
                                spacing={1.5}
                                alignItems="center"
                            >
                                <ShoppingBagOutlinedIcon
                                    sx={{ color: tokens.brand, fontSize: 22 }}
                                />
                                <Typography id="cart-drawer-title" variant="h6" fontWeight={700}>
                                    Корзина
                                </Typography>
                                {count > 0 && (
                                    <motion.div
                                        layout
                                        key="cart-badge"
                                        initial={{ scale: 0.85 }}
                                        animate={{ scale: 1 }}
                                        transition={{
                                            type: "spring",
                                            stiffness: 520,
                                            damping: 28,
                                        }}
                                        style={{ display: "inline-flex" }}
                                    >
                                        <Box
                                            sx={{
                                                px: 1,
                                                py: 0.25,
                                                borderRadius: 999,
                                                bgcolor: tokens.brandDim,
                                                border: `1px solid ${tokens.brand}44`,
                                            }}
                                        >
                                            <AnimatePresence mode="popLayout" initial={false}>
                                                <motion.div
                                                    key={count}
                                                    initial={{ opacity: 0, y: -6 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    exit={{ opacity: 0, y: 6 }}
                                                    transition={{ duration: 0.18 }}
                                                    style={{ display: "flex" }}
                                                >
                                                    <Typography
                                                        variant="caption"
                                                        fontWeight={700}
                                                        sx={{
                                                            color: tokens.brand,
                                                            fontVariantNumeric:
                                                                "tabular-nums",
                                                        }}
                                                    >
                                                        {count}
                                                    </Typography>
                                                </motion.div>
                                            </AnimatePresence>
                                        </Box>
                                    </motion.div>
                                )}
                            </Stack>
                            <IconButton
                                onClick={closeCart}
                                size="small"
                                sx={{
                                    color: "text.secondary",
                                    bgcolor: "background.paper",
                                    border: "1px solid",
                                    borderColor: "divider",
                                    "&:hover": {
                                        bgcolor: "action.hover",
                                        color: "text.primary",
                                        borderColor: "divider",
                                    },
                                }}
                            >
                                <CloseIcon fontSize="small" />
                            </IconButton>
                        </Box>

                        {/* ── Empty state ── */}
                        {items.length === 0 && (
                            <EmptyCart onNavigate={closeCart} />
                        )}

                        {/* ── Item list ── */}
                        {items.length > 0 && (
                            <>
                                <Box
                                    sx={{
                                        flex: 1,
                                        minHeight: 0,
                                        overflowY: "auto",
                                        overscrollBehaviorY: "contain",
                                        WebkitOverflowScrolling: "touch",
                                        px: 3,
                                        py: 2,
                                    }}
                                >
                                    <Stack spacing={1.5}>
                                        {items.map((item) => (
                                            <Box
                                                key={item.cartItemId}
                                                sx={{
                                                    display: "flex",
                                                    gap: 2,
                                                    p: 1.5,
                                                    borderRadius: 2,
                                                    bgcolor: "grey.100",
                                                    border: "1px solid",
                                                    borderColor: "divider",
                                                    boxShadow: "none",
                                                    transition:
                                                        "border-color 0.15s",
                                                    "&:hover": {
                                                        borderColor:
                                                            tokens.borderHi,
                                                    },
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
                                                        bgcolor:
                                                            tokens.surfaceHi,
                                                    }}
                                                >
                                                    {sanitizeProductImageSrc(
                                                        item.image,
                                                    ) ? (
                                                        <Image
                                                            src={
                                                                sanitizeProductImageSrc(
                                                                    item.image,
                                                                )!
                                                            }
                                                            alt={item.name}
                                                            fill
                                                            sizes="56px"
                                                            style={{
                                                                objectFit:
                                                                    "cover",
                                                            }}
                                                        />
                                                    ) : (
                                                        <Box
                                                            sx={{
                                                                width: "100%",
                                                                height: "100%",
                                                                display: "flex",
                                                                alignItems:
                                                                    "center",
                                                                justifyContent:
                                                                    "center",
                                                                fontSize: 22,
                                                            }}
                                                        >
                                                            🍱
                                                        </Box>
                                                    )}
                                                </Box>

                                                {/* Info */}
                                                <Box
                                                    sx={{
                                                        flex: 1,
                                                        minWidth: 0,
                                                    }}
                                                >
                                                    <Typography
                                                        variant="body2"
                                                        fontWeight={600}
                                                        noWrap
                                                        sx={{ mb: 0.25 }}
                                                    >
                                                        {item.name}
                                                    </Typography>
                                                    {item.selectedModifiers.length > 0 && (
                                                        <ModifiersList
                                                            modifiers={item.selectedModifiers}
                                                            sx={{ mb: 0.5 }}
                                                        />
                                                    )}
                                                    <Typography
                                                        variant="caption"
                                                        sx={{
                                                            color: tokens.textSecondary,
                                                            fontVariantNumeric:
                                                                "tabular-nums",
                                                        }}
                                                    >
                                                        {fmt.format(item.calculatedItemPrice)}{" "}
                                                        ֏ / шт.
                                                    </Typography>

                                                    {/* Stepper row */}
                                                    <Stack
                                                        direction="row"
                                                        alignItems="center"
                                                        justifyContent="space-between"
                                                        sx={{ mt: 1 }}
                                                    >
                                                        <Stack
                                                            direction="row"
                                                            alignItems="center"
                                                            spacing={0.5}
                                                        >
                                                            <IconButton
                                                                size="small"
                                                                onClick={() =>
                                                                    setItemQty(
                                                                        item.cartItemId,
                                                                        item.quantity -
                                                                            1,
                                                                    )
                                                                }
                                                                sx={{
                                                                    width: 44,
                                                                    height: 44,
                                                                    bgcolor:
                                                                        "background.paper",
                                                                    border: "1px solid",
                                                                    borderColor: "divider",
                                                                    borderRadius:
                                                                        "50%",
                                                                    color: tokens.textSecondary,
                                                                    boxShadow:
                                                                        "none",
                                                                    "&:hover": {
                                                                        borderColor:
                                                                            tokens.brand,
                                                                        color: tokens.brand,
                                                                        bgcolor:
                                                                            tokens.brandDim,
                                                                    },
                                                                }}
                                                            >
                                                                <RemoveIcon
                                                                    sx={{
                                                                        fontSize: 18,
                                                                    }}
                                                                />
                                                            </IconButton>
                                                            <Typography
                                                                variant="body2"
                                                                fontWeight={700}
                                                                sx={{
                                                                    minWidth: 22,
                                                                    textAlign:
                                                                        "center",
                                                                }}
                                                            >
                                                                {item.quantity}
                                                            </Typography>
                                                            <IconButton
                                                                size="small"
                                                                onClick={() =>
                                                                    setItemQty(
                                                                        item.cartItemId,
                                                                        item.quantity +
                                                                            1,
                                                                    )
                                                                }
                                                                sx={{
                                                                    width: 44,
                                                                    height: 44,
                                                                    bgcolor:
                                                                        "primary.main",
                                                                    borderRadius:
                                                                        "50%",
                                                                    color:
                                                                        "primary.contrastText",
                                                                    boxShadow:
                                                                        "none",
                                                                    "&:hover": {
                                                                        bgcolor:
                                                                            tokens.brandHi,
                                                                        boxShadow: `0 1px 4px ${alpha(tokens.brand, 0.35)}`,
                                                                    },
                                                                }}
                                                            >
                                                                <AddIcon
                                                                    sx={{
                                                                        fontSize: 18,
                                                                    }}
                                                                />
                                                            </IconButton>
                                                        </Stack>

                                                        <Stack
                                                            direction="row"
                                                            alignItems="center"
                                                            spacing={1}
                                                        >
                                                            <Typography
                                                                variant="body2"
                                                                fontWeight={700}
                                                                sx={{
                                                                    color: tokens.brand,
                                                                    fontVariantNumeric:
                                                                        "tabular-nums",
                                                                }}
                                                            >
                                                                {fmt.format(
                                                                    item.calculatedItemPrice *
                                                                        item.quantity,
                                                                )}{" "}
                                                                ֏
                                                            </Typography>
                                                            <IconButton
                                                                size="small"
                                                                onClick={() =>
                                                                    removeItem(
                                                                        item.cartItemId,
                                                                    )
                                                                }
                                                                sx={{
                                                                    width: 44,
                                                                    height: 44,
                                                                    bgcolor:
                                                                        "background.paper",
                                                                    border: "1px solid",
                                                                    borderColor: "divider",
                                                                    borderRadius:
                                                                        "50%",
                                                                    color: "text.secondary",
                                                                    boxShadow:
                                                                        "none",
                                                                    "&:hover": {
                                                                        color: tokens.red,
                                                                        borderColor: `${tokens.red}55`,
                                                                        bgcolor:
                                                                            tokens.redDim,
                                                                    },
                                                                }}
                                                            >
                                                                <DeleteOutlineIcon
                                                                    sx={{
                                                                        fontSize: 20,
                                                                    }}
                                                                />
                                                            </IconButton>
                                                        </Stack>
                                                    </Stack>
                                                </Box>
                                            </Box>
                                        ))}
                                    </Stack>

                                    {/* ── Promo code ── */}
                                    <Box sx={{ mt: 2 }}>
                                        <TextField
                                            value={promoInput}
                                            onChange={(e) => {
                                                setPromoInput(
                                                    e.target.value.toUpperCase(),
                                                );
                                                if (promoError) setPromoError("");
                                            }}
                                            onKeyDown={(e) => {
                                                if (e.key === "Enter") {
                                                    void applyPromo();
                                                }
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
                                                    : undefined)
                                            }
                                            FormHelperTextProps={{
                                                sx: {
                                                    color:
                                                        appliedPromoCode && !promoError
                                                            ? tokens.green
                                                            : undefined,
                                                },
                                            }}
                                            InputProps={{
                                                startAdornment: (
                                                    <InputAdornment position="start">
                                                        <LocalOfferOutlinedIcon
                                                            sx={{
                                                                fontSize: 15,
                                                                color: tokens.textMuted,
                                                            }}
                                                        />
                                                    </InputAdornment>
                                                ),
                                                endAdornment: (
                                                    <InputAdornment
                                                        position="end"
                                                        sx={{ gap: 0.5 }}
                                                    >
                                                        {appliedPromoCode ? (
                                                            <IconButton
                                                                size="small"
                                                                aria-label="Удалить промокод"
                                                                onClick={clearPromo}
                                                                edge="end"
                                                                sx={{
                                                                    color: tokens.textSecondary,
                                                                }}
                                                            >
                                                                <HighlightOffOutlinedIcon fontSize="small" />
                                                            </IconButton>
                                                        ) : null}
                                                        <Button
                                                            size="small"
                                                            onClick={() => void applyPromo()}
                                                            disabled={!hasItems || promoApplying}
                                                            sx={{
                                                                minWidth: "auto",
                                                                px: 1.5,
                                                                py: 0.5,
                                                                fontSize: 12,
                                                            }}
                                                        >
                                                            {promoApplying ? "…" : "Применить"}
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
                                        pb: {
                                            xs: "calc(16px + env(safe-area-inset-bottom))",
                                            sm: 3,
                                        },
                                        borderTop: "1px solid",
                                        borderColor: "divider",
                                        flexShrink: 0,
                                        bgcolor: "background.paper",
                                        boxShadow: "none",
                                    }}
                                >
                                    {/* Breakdown */}
                                    <Stack spacing={1} sx={{ mb: 2 }}>
                                        <Stack
                                            direction="row"
                                            justifyContent="space-between"
                                        >
                                            <Typography
                                                variant="body2"
                                                color="text.secondary"
                                            >
                                                Товары
                                            </Typography>
                                            <Typography
                                                variant="body2"
                                                sx={{
                                                    fontVariantNumeric:
                                                        "tabular-nums",
                                                }}
                                            >
                                                {fmt.format(subtotal)} ֏
                                            </Typography>
                                        </Stack>
                                        {promoDiscount > 0 && appliedPromoCode && (
                                            <Stack
                                                direction="row"
                                                justifyContent="space-between"
                                            >
                                                <Typography
                                                    variant="body2"
                                                    sx={{ color: tokens.green }}
                                                >
                                                    Скидка ({appliedPromoCode})
                                                </Typography>
                                                <Typography
                                                    variant="body2"
                                                    sx={{
                                                        color: tokens.green,
                                                        fontVariantNumeric:
                                                            "tabular-nums",
                                                    }}
                                                    fontWeight={600}
                                                >
                                                    −{fmt.format(promoDiscount)} ֏
                                                </Typography>
                                            </Stack>
                                        )}
                                        <Stack
                                            direction="row"
                                            justifyContent="space-between"
                                        >
                                            <Typography
                                                variant="body2"
                                                color="text.secondary"
                                            >
                                                Доставка
                                            </Typography>
                                            <Typography
                                                variant="body2"
                                                color="text.secondary"
                                                fontWeight={500}
                                            >
                                                при оформлении
                                            </Typography>
                                        </Stack>
                                    </Stack>

                                    <Divider sx={{ mb: 2 }} />

                                    {/* Total */}
                                    <Stack
                                        direction="row"
                                        justifyContent="space-between"
                                        sx={{ mb: 2 }}
                                        component={motion.div}
                                        layout
                                        transition={{
                                            type: "spring",
                                            stiffness: 420,
                                            damping: 34,
                                        }}
                                    >
                                        <Typography
                                            variant="subtitle1"
                                            fontWeight={700}
                                        >
                                            Итого
                                        </Typography>
                                        <motion.div
                                            key={total}
                                            layout
                                            initial={{ scale: 0.94, opacity: 0.75 }}
                                            animate={{ scale: 1, opacity: 1 }}
                                            transition={{ duration: 0.2 }}
                                        >
                                            <Typography
                                                variant="subtitle1"
                                                fontWeight={800}
                                                sx={{
                                                    color: tokens.brand,
                                                    fontSize: "1.1rem",
                                                    fontVariantNumeric:
                                                        "tabular-nums",
                                                }}
                                            >
                                                <CountUp
                                                    end={total}
                                                    duration={0.45}
                                                    separator=" "
                                                    decimals={0}
                                                />{" "}
                                                ֏
                                            </Typography>
                                        </motion.div>
                                    </Stack>

                                    {/* Min order warning */}
                                    {belowMin && (
                                        <Typography
                                            variant="caption"
                                            sx={{
                                                display: "block",
                                                mb: 1.5,
                                                color: tokens.brandHi,
                                                textAlign: "center",
                                                fontVariantNumeric:
                                                    "tabular-nums",
                                            }}
                                        >
                                            Минимальный заказ{" "}
                                            {fmt.format(MIN_ORDER)} ֏. Ещё{" "}
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
                                        sx={{
                                            fontWeight: 700,
                                            fontSize: { xs: "1rem" },
                                            minHeight: 48,
                                        }}
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
                </Box>
            </LayoutGroup>
                    </MotionBox>
                </>
            ) : null}
        </AnimatePresence>
    );
}
