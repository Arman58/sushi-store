"use client";

import AddIcon from "@mui/icons-material/Add";
import RemoveIcon from "@mui/icons-material/Remove";
import Box from "@mui/material/Box";
import IconButton from "@mui/material/IconButton";
import Stack from "@mui/material/Stack";
import { alpha } from "@mui/material/styles";
import Typography from "@mui/material/Typography";
import { AnimatePresence, motion } from "framer-motion";
import { useTranslations } from "next-intl";

import { formatStorePrice } from "@/shared/lib/format-price";
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

/** Футер карточки: цена (+ зачёркнутая старая) и «+» / степпер количества. */
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

            <AnimatePresence mode="wait" initial={false}>
                {hasInCart ? (
                    <motion.div
                        key="stepper"
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        transition={{ duration: 0.15 }}
                        style={{ flexShrink: 0 }}
                    >
                        <Stack
                            direction="row"
                            alignItems="center"
                            spacing={0.25}
                            sx={{ flexShrink: 0 }}
                        >
                            <IconButton
                                size="small"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onDecrease?.();
                                }}
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
                                component={motion.span}
                                key={quantity}
                                initial={{ scale: 1.25, opacity: 0.6 }}
                                animate={{ scale: 1, opacity: 1 }}
                                transition={{ duration: 0.15 }}
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
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onIncrease?.();
                                }}
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
                    </motion.div>
                ) : (
                    <motion.div
                        key="add"
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        transition={{ duration: 0.15 }}
                        style={{ flexShrink: 0 }}
                    >
                        <IconButton
                            size="small"
                            onClick={onAdd}
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
                                color: isAvailable
                                    ? tokens.brand
                                    : tokens.textMuted,
                                transition:
                                    "background-color 0.18s ease, color 0.18s ease, transform 0.12s ease",
                                "&:hover": {
                                    bgcolor: tokens.brand,
                                    color: "#FFFFFF",
                                    boxShadow: `0 2px 8px ${alpha(tokens.brand, 0.35)}`,
                                },
                                "&:active": { transform: "scale(0.92)" },
                            }}
                        >
                            <AddIcon sx={{ fontSize: 22, color: "inherit" }} />
                        </IconButton>
                    </motion.div>
                )}
            </AnimatePresence>
        </Box>
    );
}
