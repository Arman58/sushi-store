"use client";

import AddIcon from "@mui/icons-material/Add";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import RemoveIcon from "@mui/icons-material/Remove";
import Box from "@mui/material/Box";
import Chip from "@mui/material/Chip";
import IconButton from "@mui/material/IconButton";
import Stack from "@mui/material/Stack";
import { alpha } from "@mui/material/styles";
import Typography from "@mui/material/Typography";
import Image from "next/image";
import { useTranslations } from "next-intl";

import type { CartItem } from "@/features/cart/model/types";
import {
    type CartLineIssue,
    useCartLineIssueMessage,
} from "@/features/cart/model/use-cart-line-validation";
import { formatStorePrice } from "@/shared/lib/format-price";
import { sanitizeProductImageSrc } from "@/shared/lib/product-cover";
import { ProductCoverPlaceholder } from "@/shared/ui/product-cover-image";
import { tokens } from "@/shared/ui/theme";

const IMAGE_SIZE = 56;

const stepperButtonSx = {
    minWidth: 32,
    minHeight: 32,
    width: 32,
    height: 32,
    p: 0,
    flexShrink: 0,
    borderRadius: "50%",
} as const;

type CartLineItemProps = {
    item: CartItem;
    lineIssue?: CartLineIssue;
    onIncrease: () => void;
    onDecrease: () => void;
    onRemove: () => void;
    /** Drawer - компактная строка; page - строка страницы корзины. */
    variant?: "drawer" | "page";
    /** Разделитель снизу (последняя строка - false). */
    showDivider?: boolean;
    /** Компактная плашка «Недоступен» в drawer. */
    showUnavailableBadge?: boolean;
};

function modifiersLabel(item: CartItem): string | null {
    if (item.selectedModifiers.length === 0) return null;
    return item.selectedModifiers.map((m) => m.name).join(" · ");
}

export function CartLineItem({
    item,
    lineIssue,
    onIncrease,
    onDecrease,
    onRemove,
    variant = "page",
    showDivider = true,
    showUnavailableBadge = false,
}: CartLineItemProps) {
    const tProduct = useTranslations("product");
    const tCart = useTranslations("cart");
    const formatLineIssue = useCartLineIssueMessage();
    const lineInvalid = Boolean(lineIssue);
    const lineTotal = item.calculatedItemPrice * item.quantity;
    const isDrawer = variant === "drawer";
    const safeImage = sanitizeProductImageSrc(item.image);
    const modifiersText = modifiersLabel(item);

    return (
        <Box
            sx={{
                py: isDrawer ? 1.5 : 2,
                bgcolor: lineInvalid ? tokens.redDim : "transparent",
                border: lineInvalid
                    ? `1px solid ${alpha(tokens.red, 0.35)}`
                    : "none",
                borderRadius: lineInvalid ? 2 : 0,
                px: lineInvalid ? 1 : 0,
                borderBottom: showDivider
                    ? `1px solid ${alpha("#000", 0.08)}`
                    : "none",
            }}
        >
            <Box
                sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 1.5,
                    width: "100%",
                    minWidth: 0,
                }}
            >
                {/* 1. Image */}
                <Box
                    sx={{
                        position: "relative",
                        width: IMAGE_SIZE,
                        height: IMAGE_SIZE,
                        borderRadius: 2,
                        overflow: "hidden",
                        flexShrink: 0,
                        bgcolor: tokens.surfaceHi,
                    }}
                >
                    {safeImage ? (
                        <Image
                            src={safeImage}
                            alt={item.name}
                            fill
                            sizes={`${IMAGE_SIZE}px`}
                            style={{ objectFit: "cover" }}
                        />
                    ) : (
                        <ProductCoverPlaceholder />
                    )}
                </Box>

                {/* 2. Text */}
                <Box sx={{ flex: 1, minWidth: 0, overflow: "hidden" }}>
                    <Stack
                        direction="row"
                        spacing={0.75}
                        alignItems="center"
                        sx={{ minWidth: 0 }}
                    >
                        <Typography
                            variant="body2"
                            fontWeight={700}
                            color={lineInvalid ? "error.main" : "text.primary"}
                            sx={{
                                flex: 1,
                                minWidth: 0,
                                whiteSpace: "nowrap",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                lineHeight: 1.3,
                            }}
                        >
                            {item.name}
                        </Typography>
                        {showUnavailableBadge && isDrawer ? (
                            <Chip
                                label={tCart("item_unavailable")}
                                size="small"
                                color="error"
                                variant="outlined"
                                sx={{
                                    height: 20,
                                    fontSize: 10,
                                    fontWeight: 700,
                                    flexShrink: 0,
                                    "& .MuiChip-label": { px: 0.75 },
                                }}
                            />
                        ) : null}
                    </Stack>

                    {modifiersText ? (
                        <Typography
                            variant="caption"
                            color="text.secondary"
                            sx={{
                                display: "-webkit-box",
                                WebkitLineClamp: 1,
                                WebkitBoxOrient: "vertical",
                                overflow: "hidden",
                                mt: 0.25,
                                lineHeight: 1.35,
                            }}
                        >
                            {modifiersText}
                        </Typography>
                    ) : null}

                    <Typography
                        variant="caption"
                        color={lineInvalid ? "error.main" : "text.secondary"}
                        sx={{
                            display: "block",
                            mt: 0.25,
                            lineHeight: 1.35,
                            fontVariantNumeric: "tabular-nums",
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            textDecoration: lineInvalid ? "line-through" : undefined,
                        }}
                    >
                        {formatStorePrice(item.calculatedItemPrice)} {tProduct("perUnit")}
                    </Typography>

                    {lineIssue ? (
                        <Typography
                            variant="caption"
                            color="error.main"
                            sx={{
                                display: "block",
                                mt: 0.25,
                                lineHeight: 1.35,
                                whiteSpace: "nowrap",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                            }}
                        >
                            {formatLineIssue(lineIssue)}
                        </Typography>
                    ) : null}
                </Box>

                {/* 3. Price + stepper + delete */}
                <Stack
                    alignItems="flex-end"
                    spacing={0.5}
                    sx={{ flexShrink: 0 }}
                >
                    <Typography
                        variant="body2"
                        fontWeight={800}
                        color={lineInvalid ? "text.disabled" : "text.primary"}
                        sx={{
                            lineHeight: 1.2,
                            fontVariantNumeric: "tabular-nums",
                            whiteSpace: "nowrap",
                            textDecoration: lineInvalid ? "line-through" : undefined,
                        }}
                    >
                        {formatStorePrice(lineTotal)} ֏
                    </Typography>

                    <Stack
                        direction="row"
                        alignItems="center"
                        spacing={0.5}
                        sx={{ flexShrink: 0 }}
                    >
                        <IconButton
                            aria-label={tProduct("aria.decrease", { name: item.name })}
                            onClick={onDecrease}
                            sx={{
                                ...stepperButtonSx,
                                bgcolor: "background.paper",
                                border: "1px solid",
                                borderColor: "divider",
                                color: tokens.textSecondary,
                                "&:hover": {
                                    borderColor: tokens.brand,
                                    color: tokens.brand,
                                    bgcolor: tokens.brandDim,
                                },
                            }}
                        >
                            <RemoveIcon sx={{ fontSize: 18 }} />
                        </IconButton>

                        <Typography
                            variant="body2"
                            fontWeight={700}
                            sx={{
                                minWidth: 24,
                                textAlign: "center",
                                fontVariantNumeric: "tabular-nums",
                                lineHeight: 1,
                                flexShrink: 0,
                            }}
                        >
                            {item.quantity}
                        </Typography>

                        <IconButton
                            aria-label={tProduct("aria.increase", { name: item.name })}
                            onClick={onIncrease}
                            sx={{
                                ...stepperButtonSx,
                                bgcolor: "primary.main",
                                color: "primary.contrastText",
                                "&:hover": {
                                    bgcolor: tokens.brandHi,
                                },
                            }}
                        >
                            <AddIcon sx={{ fontSize: 18 }} />
                        </IconButton>
                    </Stack>

                    <IconButton
                        size="small"
                        aria-label={tCart("aria.remove", { name: item.name })}
                        onClick={onRemove}
                        sx={{
                            width: 32,
                            height: 32,
                            minWidth: 32,
                            minHeight: 32,
                            p: 0,
                            flexShrink: 0,
                            mt: 0.25,
                            color: "text.disabled",
                            "&:hover": {
                                color: tokens.red,
                                bgcolor: tokens.redDim,
                            },
                        }}
                    >
                        <DeleteOutlineIcon sx={{ fontSize: 18 }} />
                    </IconButton>
                </Stack>
            </Box>
        </Box>
    );
}
