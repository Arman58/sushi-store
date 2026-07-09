"use client";

import AddIcon from "@mui/icons-material/Add";
import RemoveIcon from "@mui/icons-material/Remove";
import Box from "@mui/material/Box";
import IconButton from "@mui/material/IconButton";
import Stack from "@mui/material/Stack";
import { alpha } from "@mui/material/styles";
import Typography from "@mui/material/Typography";
import { useTranslations } from "next-intl";

import { formatStorePrice } from "@/shared/lib/format-price";
import { triggerHaptic } from "@/shared/lib/haptic";
import { tokens } from "@/shared/ui/theme";

import { stepperButtonSx } from "./product-card-shared";

type ProductCardFooterProps = {
    name: string;
    price: number;
    originalPrice?: number | null;
    hasDiscount: boolean;
    quantity: number;
    isAvailable: boolean;
    maxQtyReached: boolean;
    onAdd: (e: React.MouseEvent) => void;
    onIncrease?: () => void;
    onDecrease?: () => void;
};

/** Футер карточки: цена и «+» / степпер — без framer-motion (INP). */
export function ProductCardFooter({
    name,
    price,
    originalPrice,
    hasDiscount,
    quantity,
    isAvailable,
    maxQtyReached,
    onAdd,
    onIncrease,
    onDecrease,
}: ProductCardFooterProps) {
    const t = useTranslations("product");
    const hasInCart = quantity > 0;

    const handleAdd = (e: React.MouseEvent) => {
        e.stopPropagation();
        onAdd(e);
        queueMicrotask(() => triggerHaptic("medium"));
    };

    const handleIncrease = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (onIncrease) onIncrease();
        queueMicrotask(() => triggerHaptic("light"));
    };

    const handleDecrease = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (onDecrease) onDecrease();
        queueMicrotask(() => triggerHaptic("light"));
    };

    return (
        <Box
            sx={{
                display: "flex",
                flexDirection: "row",
                flexWrap: "nowrap",
                justifyContent: "space-between",
                alignItems: "center",
                mt: "auto",
                gap: 1,
                minWidth: 0,
                flexShrink: 0,
                width: "100%",
                px: 1.5,
                pb: 1.5,
                pt: 1,
            }}
        >
            <Stack
                direction="row"
                alignItems="baseline"
                spacing={0.75}
                sx={{ flex: 1, minWidth: 0, overflow: "hidden" }}
            >
                <Typography
                    component="span"
                    sx={{
                        fontWeight: 800,
                        fontSize: { xs: "0.9rem", sm: "1.05rem" },
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        lineHeight: 1,
                        color: "text.primary",
                        letterSpacing: -0.02,
                        fontVariantNumeric: "tabular-nums",
                    }}
                >
                    {formatStorePrice(price)}&thinsp;֏
                </Typography>
                {hasDiscount && (
                    <Typography
                        component="span"
                        sx={{
                            fontWeight: 500,
                            fontSize: { xs: "0.7rem", sm: "0.8rem" },
                            whiteSpace: "nowrap",
                            color: tokens.textMuted,
                            textDecoration: "line-through",
                            lineHeight: 1,
                            fontVariantNumeric: "tabular-nums",
                        }}
                    >
                        {formatStorePrice(originalPrice!)}&thinsp;֏
                    </Typography>
                )}
            </Stack>

            {hasInCart ? (
                <Stack
                    direction="row"
                    alignItems="center"
                    spacing={0.25}
                    sx={{ flexShrink: 0 }}
                >
                    <IconButton
                        size="small"
                        onClick={handleDecrease}
                        aria-label={t("aria.decrease", { name })}
                        sx={{
                            ...stepperButtonSx,
                            bgcolor: "action.hover",
                            color: "text.secondary",
                            "&:hover": { bgcolor: "action.selected" },
                            "&:active": { transform: "scale(0.92)" },
                        }}
                    >
                        <RemoveIcon sx={{ fontSize: 20 }} />
                    </IconButton>

                    <Typography
                        component="span"
                        sx={{
                            fontSize: { xs: "0.8rem", sm: "0.875rem" },
                            fontWeight: 700,
                            minWidth: 20,
                            textAlign: "center",
                            color: "text.primary",
                            lineHeight: 1,
                            fontVariantNumeric: "tabular-nums",
                            flexShrink: 0,
                            display: "inline-block",
                        }}
                    >
                        {quantity}
                    </Typography>

                    <IconButton
                        size="small"
                        disabled={maxQtyReached}
                        onClick={handleIncrease}
                        aria-label={t("aria.increase", { name })}
                        sx={{
                            ...stepperButtonSx,
                            bgcolor: "action.hover",
                            color: "text.secondary",
                            "&:hover": { bgcolor: "action.selected" },
                            "&:active": { transform: "scale(0.92)" },
                        }}
                    >
                        <AddIcon sx={{ fontSize: 20 }} />
                    </IconButton>
                </Stack>
            ) : (
                <IconButton
                    size="small"
                    onClick={handleAdd}
                    disabled={!isAvailable}
                    aria-label={
                        isAvailable
                            ? t("aria.add", { name })
                            : t("badge.soldOut")
                    }
                    sx={{
                        ...stepperButtonSx,
                        flexShrink: 0,
                        bgcolor: tokens.surface,
                        border: `1.5px solid ${isAvailable ? tokens.brand : tokens.borderHi}`,
                        color: isAvailable ? tokens.brand : tokens.textMuted,
                        transition:
                            "background-color 0.18s ease, color 0.18s ease, transform 0.12s ease",
                        "&:hover": {
                            bgcolor: tokens.brand,
                            color: "primary.contrastText",
                            boxShadow: `0 2px 8px ${alpha(tokens.brand, 0.35)}`,
                        },
                        "&:active": { transform: "scale(0.92)" },
                    }}
                >
                    <AddIcon sx={{ fontSize: 22, color: "inherit" }} />
                </IconButton>
            )}
        </Box>
    );
}
