"use client";

import HighlightOffOutlinedIcon from "@mui/icons-material/HighlightOffOutlined";
import LocalOfferOutlinedIcon from "@mui/icons-material/LocalOfferOutlined";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import InputAdornment from "@mui/material/InputAdornment";
import TextField from "@mui/material/TextField";
import { useTranslations } from "next-intl";

import { tokens } from "./theme";

type CartDrawerPromoProps = {
    promoInput: string;
    promoError: string;
    promoApplying: boolean;
    appliedPromoCode: string | null;
    hasItems: boolean;
    onPromoInputChange: (value: string) => void;
    onApply: () => void;
    onClear: () => void;
};

export function CartDrawerPromo({
    promoInput,
    promoError,
    promoApplying,
    appliedPromoCode,
    hasItems,
    onPromoInputChange,
    onApply,
    onClear,
}: CartDrawerPromoProps) {
    const t = useTranslations("cart");
    const tCommon = useTranslations("common");

    return (
        <Box sx={{ mt: 2 }}>
            <TextField
                value={promoInput}
                onChange={(e) => {
                    onPromoInputChange(e.target.value.toUpperCase());
                }}
                onKeyDown={(e) => {
                    if (e.key === "Enter") onApply();
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
                        <InputAdornment position="end" sx={{ gap: 0.5 }}>
                            {appliedPromoCode ? (
                                <IconButton
                                    size="small"
                                    aria-label={t("promo.aria.remove")}
                                    onClick={onClear}
                                    edge="end"
                                    sx={{ color: tokens.textSecondary }}
                                >
                                    <HighlightOffOutlinedIcon fontSize="small" />
                                </IconButton>
                            ) : null}
                            <Button
                                size="small"
                                onClick={onApply}
                                disabled={!hasItems || promoApplying}
                                sx={{
                                    minWidth: "auto",
                                    px: 1.5,
                                    py: 0.5,
                                    fontSize: 12,
                                }}
                            >
                                {promoApplying
                                    ? tCommon("loadingEllipsis")
                                    : t("promo.apply")}
                            </Button>
                        </InputAdornment>
                    ),
                }}
            />
        </Box>
    );
}
