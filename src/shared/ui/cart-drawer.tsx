"use client";

import CloseIcon from "@mui/icons-material/Close";
import HighlightOffOutlinedIcon from "@mui/icons-material/HighlightOffOutlined";
import LocalOfferOutlinedIcon from "@mui/icons-material/LocalOfferOutlined";
import ShoppingBagOutlinedIcon from "@mui/icons-material/ShoppingBagOutlined";
import Alert from "@mui/material/Alert";
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
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import CountUp from "react-countup";

import {
    CartLineItem,
    useCartLineValidation,
    useCartStore,
} from "@/features/cart";
import { Link, usePathname } from "@/i18n/server";
import { ApiError, validatePromo } from "@/shared/api";

import { AppButton } from "./AppButton";
import { EmptyCart } from "./empty-cart";
import { tokens } from "./theme";

const DRAWER_WIDTH = 420;
const MotionBox = motion.create(Box);

// ─── Formatters ───────────────────────────────────────────────────────────────

const fmt = new Intl.NumberFormat("ru-RU");

// ─── Component ────────────────────────────────────────────────────────────────

export function CartDrawer() {
    const t = useTranslations("cart");
    const tCommon = useTranslations("common");
    const pathname = usePathname();
    const isCheckoutPage = pathname?.startsWith("/checkout") ?? false;
    const isCartOpen = useCartStore((s) => s.isCartOpen);
    const closeCart = useCartStore((s) => s.closeCart);
    const items = useCartStore((s) => s.items);
    const removeItem = useCartStore((s) => s.removeItem);
    const setItemQty = useCartStore((s) => s.setItemQuantity);
    const clearCart = useCartStore((s) => s.clear);
    const appliedPromoCode = useCartStore((s) => s.appliedPromoCode);
    const setAppliedPromoCode = useCartStore((s) => s.setAppliedPromoCode);

    const {
        cartLineIssues,
        cartValidatePending,
        validationUnavailable,
        hasCartLineProblems,
        problematicCartItemIds,
    } = useCartLineValidation(items);

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
    const canProceedToCheckout =
        hasItems &&
        !cartValidatePending &&
        !validationUnavailable &&
        !hasCartLineProblems;

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
                            ? e.message || t("promo.invalid")
                            : t("promo.checkFailed"),
                    );
                }
            }
        }
        void sync();
        return () => {
            cancelled = true;
        };
    }, [appliedPromoCode, hasItems, subtotal, setAppliedPromoCode, t]);

    const applyPromo = async () => {
        setPromoError("");
        const code = promoInput.trim().replace(/\s+/g, "").toUpperCase();
        if (!code) {
            setPromoError(t("promo.enterCode"));
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
                    ? e.message || t("promo.notFound")
                    : t("promo.checkFailed"),
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
        if (isCheckoutPage && isCartOpen) {
            closeCart();
        }
    }, [isCheckoutPage, isCartOpen, closeCart]);

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
                            overflow: "hidden",
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
                                sx={{ flex: 1, minWidth: 0 }}
                            >
                                <ShoppingBagOutlinedIcon
                                    sx={{ color: tokens.brand, fontSize: 22 }}
                                />
                                <Typography
                                    id="cart-drawer-title"
                                    component="h2"
                                    variant="h6"
                                    fontWeight={700}
                                >
                                    {t("pageTitle")}
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
                                aria-label={t("aria.close")}
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
                                <CloseIcon fontSize="small" aria-hidden focusable="false" />
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
                                    {validationUnavailable && (
                                        <Alert severity="warning" sx={{ mb: 2 }}>
                                            {t("drawer_validation_unavailable")}
                                        </Alert>
                                    )}
                                    {hasCartLineProblems &&
                                        !validationUnavailable && (
                                            <Alert severity="error" sx={{ mb: 2 }}>
                                                {t("lineProblems.pageAlert")}
                                            </Alert>
                                        )}
                                    <Stack spacing={0} divider={null}>
                                        {items.map((item, index) => (
                                            <CartLineItem
                                                key={item.cartItemId}
                                                item={item}
                                                lineIssue={
                                                    cartLineIssues[item.cartItemId]
                                                }
                                                showUnavailableBadge={problematicCartItemIds.includes(
                                                    item.cartItemId,
                                                )}
                                                variant="drawer"
                                                showDivider={index < items.length - 1}
                                                onIncrease={() =>
                                                    setItemQty(
                                                        item.cartItemId,
                                                        item.quantity + 1,
                                                    )
                                                }
                                                onDecrease={() =>
                                                    setItemQty(
                                                        item.cartItemId,
                                                        item.quantity - 1,
                                                    )
                                                }
                                                onRemove={() =>
                                                    removeItem(item.cartItemId)
                                                }
                                            />
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
                                            placeholder={t("promo.placeholder")}
                                            size="small"
                                            fullWidth
                                            disabled={!hasItems || promoApplying}
                                            error={Boolean(promoError)}
                                            helperText={
                                                promoError ||
                                                (appliedPromoCode && !promoError
                                                    ? t("promo.applied", { code: appliedPromoCode })
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
                                                                aria-label={t("promo.aria.remove")}
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
                                                            {promoApplying ? tCommon("loadingEllipsis") : t("promo.apply")}
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
                                            xs: "calc(16px + env(safe-area-inset-bottom) + 64px)",
                                            sm: 3,
                                        },
                                        borderTop: "1px solid",
                                        borderColor: "divider",
                                        flexShrink: 0,
                                        position: "sticky",
                                        bottom: 0,
                                        bgcolor: "background.paper",
                                        boxShadow: (t) =>
                                            `0 -4px 12px ${alpha(t.palette.common.black, 0.06)}`,
                                    }}
                                >
                                    {/* Breakdown */}
                                    <Stack spacing={1} sx={{ mb: 2 }}>
                                        <Stack
                                            direction="row"
                                            justifyContent="space-between"
                                            sx={{ minWidth: 0 }}
                                        >
                                            <Typography
                                                variant="body2"
                                                color="text.secondary"
                                                sx={{ minWidth: 0, flex: 1, pr: 1 }}
                                            >
                                                {t("items")}
                                            </Typography>
                                            <Typography
                                                variant="body2"
                                                sx={{
                                                    fontVariantNumeric:
                                                        "tabular-nums",
                                                    flexShrink: 0,
                                                    whiteSpace: "nowrap",
                                                }}
                                            >
                                                {fmt.format(subtotal)} ֏
                                            </Typography>
                                        </Stack>
                                        {promoDiscount > 0 && appliedPromoCode && (
                                            <Stack
                                                direction="row"
                                                justifyContent="space-between"
                                                sx={{ minWidth: 0 }}
                                            >
                                                <Typography
                                                    variant="body2"
                                                    sx={{
                                                        color: tokens.green,
                                                        minWidth: 0,
                                                        flex: 1,
                                                        pr: 1,
                                                        overflow: "hidden",
                                                        textOverflow: "ellipsis",
                                                        whiteSpace: "nowrap",
                                                    }}
                                                >
                                                    {t("promo.discountLine", { code: appliedPromoCode })}
                                                </Typography>
                                                <Typography
                                                    variant="body2"
                                                    sx={{
                                                        color: tokens.green,
                                                        fontVariantNumeric:
                                                            "tabular-nums",
                                                        flexShrink: 0,
                                                        whiteSpace: "nowrap",
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
                                            sx={{ minWidth: 0 }}
                                        >
                                            <Typography
                                                variant="body2"
                                                color="text.secondary"
                                                sx={{ minWidth: 0, flex: 1, pr: 1 }}
                                            >
                                                {t("delivery")}
                                            </Typography>
                                            <Typography
                                                variant="body2"
                                                color="text.secondary"
                                                fontWeight={500}
                                                sx={{ flexShrink: 0, whiteSpace: "nowrap" }}
                                            >
                                                {t("deliveryAtCheckout")}
                                            </Typography>
                                        </Stack>
                                    </Stack>

                                    <Divider sx={{ mb: 2 }} />

                                    {/* Total */}
                                    <Stack
                                        direction="row"
                                        justifyContent="space-between"
                                        sx={{ mb: 2, minWidth: 0 }}
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
                                            sx={{ minWidth: 0, flex: 1, pr: 1 }}
                                        >
                                            {t("total")}
                                        </Typography>
                                        <motion.div
                                            key={total}
                                            layout
                                            initial={{ scale: 0.94, opacity: 0.75 }}
                                            animate={{ scale: 1, opacity: 1 }}
                                            transition={{ duration: 0.2 }}
                                            style={{ flexShrink: 0 }}
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

                                    {hasCartLineProblems && (
                                        <Typography
                                            variant="caption"
                                            sx={{
                                                display: "block",
                                                mb: 1,
                                                color: tokens.red,
                                                textAlign: "center",
                                                lineHeight: 1.45,
                                            }}
                                        >
                                            {t("lineProblems.removeBeforeCheckout")}
                                        </Typography>
                                    )}

                                    <Typography
                                        variant="caption"
                                        sx={{
                                            display: "block",
                                            mb: 1.5,
                                            color: tokens.textMuted,
                                            textAlign: "center",
                                            lineHeight: 1.45,
                                        }}
                                    >
                                        {t("minOrderHint")}
                                    </Typography>

                                    {/* CTA */}
                                    {isCheckoutPage ? (
                                        <AppButton
                                            component={Link}
                                            href="/checkout"
                                            onClick={closeCart}
                                            variant="outlined"
                                            fullWidth
                                            size="small"
                                            sx={{
                                                fontWeight: 600,
                                                fontSize: 13,
                                                minHeight: 40,
                                            }}
                                        >
                                            {t("returnToCheckout")}
                                        </AppButton>
                                    ) : (
                                        <AppButton
                                            component={Link}
                                            href="/checkout"
                                            onClick={closeCart}
                                            variant="contained"
                                            fullWidth
                                            size="large"
                                            disabled={!canProceedToCheckout}
                                            sx={{
                                                fontWeight: 700,
                                                fontSize: { xs: "1rem" },
                                                minHeight: 48,
                                            }}
                                        >
                                            {t("checkout")}
                                        </AppButton>
                                    )}

                                    {/* Clear */}
                                    <AppButton
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
                                        {t("clear")}
                                    </AppButton>
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
