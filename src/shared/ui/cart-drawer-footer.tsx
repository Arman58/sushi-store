"use client";

import Box from "@mui/material/Box";
import Divider from "@mui/material/Divider";
import Stack from "@mui/material/Stack";
import { alpha } from "@mui/material/styles";
import Typography from "@mui/material/Typography";
import { motion } from "framer-motion";
import { useTranslations } from "next-intl";

import { Link } from "@/i18n/server";
import { OPENING_HOURS } from "@/lib/site-config";
import { formatStorePrice } from "@/shared/lib/format-price";

import { AppButton } from "./AppButton";
import { MinOrderProgress } from "./min-order-progress";
import { tokens } from "./theme";

type CartDrawerFooterProps = {
    subtotal: number;
    total: number;
    promoDiscount: number;
    appliedPromoCode: string | null;
    storeClosed: boolean;
    hasCartLineProblems: boolean;
    canProceedToCheckout: boolean;
    isCheckoutPage: boolean;
    clearArmed: boolean;
    onClose: () => void;
    onClearClick: () => void;
};

export function CartDrawerFooter({
    subtotal,
    total,
    promoDiscount,
    appliedPromoCode,
    storeClosed,
    hasCartLineProblems,
    canProceedToCheckout,
    isCheckoutPage,
    clearArmed,
    onClose,
    onClearClick,
}: CartDrawerFooterProps) {
    const t = useTranslations("cart");

    return (
        <Box
            sx={{
                px: { xs: 2.5, sm: 3 },
                pt: { xs: 1.5, sm: 2 },
                pb: {
                    xs: "calc(12px + env(safe-area-inset-bottom))",
                    sm: 3,
                },
                borderTop: "1px solid",
                borderColor: "divider",
                flexShrink: 0,
                position: "sticky",
                bottom: 0,
                bgcolor: "background.paper",
                boxShadow: (theme) =>
                    `0 -4px 12px ${alpha(theme.palette.common.black, 0.06)}`,
            }}
        >
            <Stack spacing={0.75} sx={{ mb: { xs: 1.25, sm: 2 } }}>
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
                            fontVariantNumeric: "tabular-nums",
                            flexShrink: 0,
                            whiteSpace: "nowrap",
                        }}
                    >
                        {formatStorePrice(subtotal)} ֏
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
                                fontVariantNumeric: "tabular-nums",
                                flexShrink: 0,
                                whiteSpace: "nowrap",
                            }}
                            fontWeight={600}
                        >
                            −{formatStorePrice(promoDiscount)} ֏
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

            <Divider sx={{ mb: { xs: 1.25, sm: 2 } }} />

            <Stack
                direction="row"
                justifyContent="space-between"
                sx={{ mb: { xs: 1.25, sm: 2 }, minWidth: 0 }}
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
                            fontVariantNumeric: "tabular-nums",
                        }}
                    >
                        {formatStorePrice(total)} ֏
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

            {storeClosed && (
                <Typography
                    variant="caption"
                    sx={{
                        display: "block",
                        mb: 1,
                        textAlign: "center",
                        lineHeight: 1.45,
                        color: "#B45309",
                    }}
                >
                    {t("closedNotice", {
                        opens: OPENING_HOURS.opens,
                    })}
                </Typography>
            )}

            <MinOrderProgress total={total} />

            {isCheckoutPage ? (
                <AppButton
                    component={Link}
                    href="/checkout"
                    onClick={onClose}
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
                    onClick={onClose}
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
                    {t("checkout")} · {formatStorePrice(total)} ֏
                </AppButton>
            )}

            <AppButton
                onClick={onClearClick}
                variant="text"
                fullWidth
                size="small"
                sx={{
                    mt: 1,
                    color: clearArmed ? tokens.red : tokens.textMuted,
                    fontWeight: clearArmed ? 700 : 400,
                    fontSize: 12,
                    "&:hover": { color: tokens.red },
                }}
            >
                {clearArmed ? t("clearConfirm") : t("clear")}
            </AppButton>
        </Box>
    );
}
