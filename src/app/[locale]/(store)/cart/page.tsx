"use client";

import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import LocalOfferOutlinedIcon from "@mui/icons-material/LocalOfferOutlined";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Divider from "@mui/material/Divider";
import InputAdornment from "@mui/material/InputAdornment";
import Stack from "@mui/material/Stack";
import { alpha } from "@mui/material/styles";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";

import {
    CartLineItem,
    useCartLineValidation,
    useCartStore,
} from "@/features/cart";
import { Link } from "@/i18n/server";
import { ApiError, validatePromo } from "@/shared/api";
import { AppButton, EmptyCart, PageContainer, SectionTitle } from "@/shared/ui";

export default function CartPage() {
    const t = useTranslations("cart");
    const tCommon = useTranslations("common");
    const items = useCartStore((state) => state.items);
    const setItemQuantity = useCartStore((state) => state.setItemQuantity);
    const removeItem = useCartStore((state) => state.removeItem);
    const clearCart = useCartStore((state) => state.clear);
    const appliedPromoCode = useCartStore((state) => state.appliedPromoCode);
    const setAppliedPromoCode = useCartStore((state) => state.setAppliedPromoCode);

    const hasItems = items.length > 0;

    const {
        cartLineIssues,
        cartValidatePending,
        validationUnavailable,
        hasCartLineProblems,
        problematicCartItemIds,
        validSubtotal: subtotal,
    } = useCartLineValidation(items);

    const canProceedToCheckout =
        hasItems &&
        !cartValidatePending &&
        !validationUnavailable &&
        !hasCartLineProblems;

    const handleRemoveUnavailable = () => {
        for (const cartItemId of problematicCartItemIds) {
            removeItem(cartItemId);
        }
    };

    const [promoDraft, setPromoDraft] = useState("");
    const [promoError, setPromoError] = useState("");
    const [promoDiscount, setPromoDiscount] = useState(0);
    const [promoApplying, setPromoApplying] = useState(false);

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

    const totalPrice = Math.max(0, subtotal - promoDiscount);

    const handleApplyPromo = async () => {
        setPromoError("");
        const code = promoDraft.trim().replace(/\s+/g, "").toUpperCase();
        if (!code) {
            setPromoError(t("promo.enterCode"));
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
                setPromoError(e.message || t("promo.notFound"));
            } else {
                setPromoError(t("promo.checkFailed"));
            }
        } finally {
            setPromoApplying(false);
        }
    };

    return (
        <PageContainer>
                <SectionTitle pageTitle>{t("pageTitle")}</SectionTitle>

                {!hasItems && <EmptyCart layout="page" />}

                {hasItems && (
                    <Stack
                        direction={{ xs: "column", md: "row" }}
                        spacing={4}
                        alignItems="flex-start"
                    >
                        <Box flex={2} sx={{ minWidth: 0 }}>
                            {validationUnavailable && (
                                <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>
                                    {t("validation_unavailable")}
                                </Alert>
                            )}
                            {hasCartLineProblems && !validationUnavailable && (
                                <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>
                                    {t("lineProblems.pageAlert")}
                                </Alert>
                            )}
                            {cartValidatePending &&
                                !hasCartLineProblems &&
                                !validationUnavailable && (
                                    <Alert severity="info" sx={{ mb: 2, borderRadius: 2 }}>
                                        {t("validating")}
                                    </Alert>
                                )}
                            <Box
                                sx={{
                                    borderRadius: 3,
                                    border: "1px solid",
                                    borderColor: alpha("#0f172a", 0.06),
                                    bgcolor: "background.paper",
                                    px: { xs: 1.5, sm: 2 },
                                    overflow: "hidden",
                                }}
                            >
                                {items.map((item, index) => (
                                    <CartLineItem
                                        key={item.cartItemId}
                                        item={item}
                                        lineIssue={cartLineIssues[item.cartItemId]}
                                        variant="page"
                                        showDivider={index < items.length - 1}
                                        onIncrease={() =>
                                            setItemQuantity(item.cartItemId, item.quantity + 1)
                                        }
                                        onDecrease={() =>
                                            setItemQuantity(item.cartItemId, item.quantity - 1)
                                        }
                                        onRemove={() => removeItem(item.cartItemId)}
                                    />
                                ))}
                            </Box>

                            <Stack
                                direction={{ xs: "column", sm: "row" }}
                                spacing={1}
                                sx={{ mt: 1.5 }}
                                alignItems={{ xs: "stretch", sm: "center" }}
                            >
                                {hasCartLineProblems && !validationUnavailable && (
                                    <AppButton
                                        variant="outlined"
                                        color="error"
                                        onClick={handleRemoveUnavailable}
                                        startIcon={<DeleteOutlineIcon />}
                                        size="small"
                                        sx={{ textTransform: "none", fontWeight: 600 }}
                                    >
                                        {t("remove_unavailable")}
                                    </AppButton>
                                )}
                                <AppButton
                                    variant="text"
                                    color="inherit"
                                    onClick={clearCart}
                                    startIcon={<DeleteOutlineIcon />}
                                    size="small"
                                    sx={{ textTransform: "none", opacity: 0.6 }}
                                >
                                    {t("clear")}
                                </AppButton>
                            </Stack>

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
                            <Typography component="h2" variant="h6" sx={{ mb: 2, fontWeight: 700 }}>
                                {t("summary.title")}
                            </Typography>

                            {/* Line items summary */}
                            <Stack spacing={1} sx={{ mb: 2 }}>
                                <Stack direction="row" justifyContent="space-between" sx={{ minWidth: 0 }}>
                                    <Typography variant="body2" color="text.secondary" sx={{ minWidth: 0, flex: 1, pr: 1 }}>
                                        {t("summary.itemsCount", { n: items.length })}
                                    </Typography>
                                    <Typography variant="body2" sx={{ flexShrink: 0, whiteSpace: "nowrap" }}>
                                        {subtotal.toLocaleString("ru-RU")} ֏
                                    </Typography>
                                </Stack>

                                {promoDiscount > 0 && appliedPromoCode && (
                                    <Stack direction="row" justifyContent="space-between" sx={{ minWidth: 0 }}>
                                        <Typography
                                            variant="body2"
                                            color="success.main"
                                            sx={{
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
                                        <Typography variant="body2" color="success.main" fontWeight={600} sx={{ flexShrink: 0, whiteSpace: "nowrap" }}>
                                            −{promoDiscount.toLocaleString("ru-RU")} ֏
                                        </Typography>
                                    </Stack>
                                )}

                                <Stack direction="row" justifyContent="space-between" sx={{ minWidth: 0 }}>
                                    <Typography variant="body2" color="text.secondary" sx={{ minWidth: 0, flex: 1, pr: 1 }}>
                                        {t("delivery")}
                                    </Typography>
                                    <Typography variant="body2" color="success.main" fontWeight={600} sx={{ flexShrink: 0, whiteSpace: "nowrap" }}>
                                        {t("deliveryFree")}
                                    </Typography>
                                </Stack>
                            </Stack>

                            <Divider sx={{ my: 1.5 }} />

                            <Stack direction="row" justifyContent="space-between" sx={{ mb: 2, minWidth: 0 }}>
                                <Typography variant="subtitle1" fontWeight={700} sx={{ minWidth: 0, flex: 1, pr: 1 }}>
                                    {t("summary.toPay")}
                                </Typography>
                                <Typography variant="subtitle1" fontWeight={700} sx={{ flexShrink: 0, whiteSpace: "nowrap" }}>
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
                                    placeholder={t("promo.placeholder")}
                                    size="small"
                                    fullWidth
                                    disabled={!hasItems || promoApplying}
                                    error={Boolean(promoError)}
                                    helperText={
                                        promoError ||
                                        (appliedPromoCode && !promoError
                                            ? t("promo.applied", { code: appliedPromoCode })
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
                                                            {t("promo.reset")}
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
                                                        {promoApplying ? tCommon("loadingEllipsis") : t("promo.apply")}
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

                            <Typography
                                variant="caption"
                                color="text.secondary"
                                sx={{
                                    display: "block",
                                    mb: 2,
                                    textAlign: "center",
                                    lineHeight: 1.45,
                                }}
                            >
                                {t("minOrderHint")}
                            </Typography>

                            <AppButton
                                component={Link}
                                href="/checkout"
                                variant="contained"
                                color="primary"
                                fullWidth
                                size="large"
                                disabled={!canProceedToCheckout}
                                sx={{ fontWeight: 700 }}
                            >
                                {t("checkout")}
                            </AppButton>

                            <Typography
                                variant="caption"
                                color="text.secondary"
                                sx={{ display: "block", mt: 1.5, textAlign: "center" }}
                            >
                                {t("summary.nextStepHint")}
                            </Typography>
                        </Box>
                    </Stack>
                )}
        </PageContainer>
    );
}
