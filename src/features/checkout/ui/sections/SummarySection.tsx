"use client";

import LocalOfferOutlinedIcon from "@mui/icons-material/LocalOfferOutlined";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Divider from "@mui/material/Divider";
import InputAdornment from "@mui/material/InputAdornment";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { useTranslations } from "next-intl";

import { useCartLineValidation, useCartStore } from "@/features/cart";
import { AppInput } from "@/shared/ui";
import { tokens } from "@/shared/ui/theme";

import { CheckoutOrderLine } from "../CheckoutOrderLine";
import { checkoutFieldProps } from "../styles";

type SummarySectionProps = {
    cartSubtotal: number;
    showDeliveryBreakdown: boolean;
    deliverySummaryLabel: string;
    requiresManagerApproval: boolean;
    deliveryFee: number;
    promoDraft: string;
    setPromoDraft: (value: string) => void;
    promoError: string | null;
    setPromoError: (value: string | null) => void;
    promoDiscount: number;
    promoApplying: boolean;
    appliedPromoCode: string | null;
    deliveryBlocked: boolean;
    hasItems: boolean;
    onApplyPromo: () => void;
    onClearPromo: () => void;
    grandTotal: number;
    showDeliveryPendingHint: boolean;
};

export function SummarySection({
    cartSubtotal,
    showDeliveryBreakdown,
    deliverySummaryLabel,
    requiresManagerApproval,
    deliveryFee,
    promoDraft,
    setPromoDraft,
    promoError,
    setPromoError,
    promoDiscount,
    promoApplying,
    appliedPromoCode,
    deliveryBlocked,
    hasItems,
    onApplyPromo,
    onClearPromo,
    grandTotal,
    showDeliveryPendingHint,
}: SummarySectionProps) {
    const t = useTranslations("checkout.summary");
    const items = useCartStore((s) => s.items);
    const { cartLineIssues } = useCartLineValidation(items);

    return (
        <Box
            sx={{
                p: { xs: 2, md: 3 },
                borderRadius: 2,
                border: `1px solid ${tokens.border}`,
                bgcolor: "background.paper",
                minWidth: { xs: "100%", md: 280 },
                width: "100%",
                position: { md: "sticky" },
                top: { md: 80 },
                boxShadow: "none",
                overflow: "visible",
            }}
        >
            <Typography
                component="h2"
                variant="subtitle1"
                fontWeight={800}
                sx={{ mb: 2, letterSpacing: -0.02 }}
            >
                {t("title")}
            </Typography>

            <Stack spacing={1} sx={{ mb: 2, minWidth: 0 }}>
                {items.map((item) => (
                    <CheckoutOrderLine
                        key={item.cartItemId}
                        item={item}
                        lineIssue={cartLineIssues[item.cartItemId]}
                    />
                ))}
            </Stack>

            <Divider sx={{ my: 2 }} />

            <Stack
                direction="row"
                justifyContent="space-between"
                sx={{ mb: 0.5, minWidth: 0 }}
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
                    fontWeight={600}
                    sx={{
                        fontVariantNumeric: "tabular-nums",
                        flexShrink: 0,
                        whiteSpace: "nowrap",
                    }}
                >
                    {cartSubtotal.toLocaleString("ru-RU")} ֏
                </Typography>
            </Stack>

            {showDeliveryBreakdown ? (
                <Stack
                    direction="row"
                    justifyContent="space-between"
                    sx={{ mb: 1, minWidth: 0 }}
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
                        fontWeight={600}
                        color={
                            requiresManagerApproval
                                ? "error.main"
                                : deliveryFee === 0
                                  ? "success.main"
                                  : "text.primary"
                        }
                        sx={{
                            fontVariantNumeric: "tabular-nums",
                            flexShrink: 0,
                            whiteSpace: "nowrap",
                            textAlign: "right",
                        }}
                    >
                        {deliverySummaryLabel}
                    </Typography>
                </Stack>
            ) : null}

            <AppInput
                value={promoDraft}
                onChange={(e) => {
                    setPromoDraft(e.target.value.toUpperCase());
                    if (promoError) setPromoError(null);
                }}
                placeholder={t("promoPlaceholder")}
                {...checkoutFieldProps}
                disabled={deliveryBlocked || !hasItems || promoApplying}
                error={Boolean(promoError)}
                helperText={
                    promoError ||
                    (appliedPromoCode
                        ? t("promoApplied", { code: appliedPromoCode })
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
                                sx={{ fontSize: 18, color: "text.secondary" }}
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
                                            minWidth: 0,
                                            px: 1,
                                        }}
                                        onClick={onClearPromo}
                                    >
                                        {t("promoReset")}
                                    </Button>
                                ) : null}
                                <Button
                                    type="button"
                                    size="small"
                                    sx={{
                                        textTransform: "none",
                                        minWidth: 0,
                                        px: 1,
                                    }}
                                    disabled={
                                        deliveryBlocked ||
                                        !hasItems ||
                                        promoApplying
                                    }
                                    onClick={() => void onApplyPromo()}
                                >
                                    {promoApplying
                                        ? "…"
                                        : t("promoApply")}
                                </Button>
                            </Box>
                        </InputAdornment>
                    ),
                }}
                sx={{ mb: promoDiscount > 0 ? 0.5 : 1, width: "100%" }}
                onKeyDown={(e) => {
                    if (e.key === "Enter") {
                        e.preventDefault();
                        void onApplyPromo();
                    }
                }}
            />

            {promoDiscount > 0 ? (
                <Stack
                    direction="row"
                    justifyContent="space-between"
                    sx={{ mb: 1, minWidth: 0 }}
                >
                    <Typography
                        variant="body2"
                        color="success.main"
                        sx={{ minWidth: 0, flex: 1, pr: 1 }}
                    >
                        {t("promoDiscount")}
                    </Typography>
                    <Typography
                        variant="body2"
                        color="success.main"
                        fontWeight={600}
                        sx={{
                            fontVariantNumeric: "tabular-nums",
                            flexShrink: 0,
                            whiteSpace: "nowrap",
                        }}
                    >
                        −{promoDiscount.toLocaleString("ru-RU")} ֏
                    </Typography>
                </Stack>
            ) : null}

            <Stack
                direction="row"
                justifyContent="space-between"
                sx={{ minWidth: 0 }}
            >
                <Typography
                    variant="subtitle1"
                    fontWeight={700}
                    sx={{ minWidth: 0, flex: 1, pr: 1 }}
                >
                    {t("total")}
                </Typography>
                <Typography
                    variant="subtitle1"
                    fontWeight={800}
                    sx={{
                        fontVariantNumeric: "tabular-nums",
                        flexShrink: 0,
                        whiteSpace: "nowrap",
                    }}
                >
                    {grandTotal.toLocaleString("ru-RU")} ֏
                </Typography>
            </Stack>

            {showDeliveryPendingHint ? (
                <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{ display: "block", mt: 0.75, lineHeight: 1.45 }}
                >
                    {t("deliveryPendingHint")}
                </Typography>
            ) : null}

            <Typography
                variant="caption"
                color="text.secondary"
                sx={{ display: "block", mt: 1.5, lineHeight: 1.45 }}
            >
                {t("courierNote")}
            </Typography>
        </Box>
    );
}
