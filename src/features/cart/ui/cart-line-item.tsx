"use client";

import AddIcon from "@mui/icons-material/Add";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import RemoveIcon from "@mui/icons-material/Remove";
import Box from "@mui/material/Box";
import IconButton from "@mui/material/IconButton";
import Stack from "@mui/material/Stack";
import { alpha } from "@mui/material/styles";
import Typography from "@mui/material/Typography";
import Image from "next/image";

import type { CartItem } from "@/features/cart/model/types";
import {
    type CartLineIssue,
    cartLineIssueMessage,
} from "@/features/cart/model/use-cart-line-validation";
import { sanitizeProductImageSrc } from "@/shared/lib/product-cover";
import { tokens } from "@/shared/ui/theme";

import { ModifiersList } from "./modifiers-list";

const fmt = new Intl.NumberFormat("ru-RU");

type CartLineItemProps = {
    item: CartItem;
    lineIssue?: CartLineIssue;
    onIncrease: () => void;
    onDecrease: () => void;
    onRemove: () => void;
    /** Drawer — компактная карточка на сером фоне; page — карточка страницы корзины. */
    variant?: "drawer" | "page";
};

export function CartLineItem({
    item,
    lineIssue,
    onIncrease,
    onDecrease,
    onRemove,
    variant = "page",
}: CartLineItemProps) {
    const lineInvalid = Boolean(lineIssue);
    const lineTotal = item.calculatedItemPrice * item.quantity;
    const isDrawer = variant === "drawer";

    return (
        <Box
            sx={{
                display: "flex",
                flexDirection: "row",
                alignItems: "center",
                gap: { xs: 1, sm: 1.5 },
                p: isDrawer ? 1.5 : { xs: 1.5, sm: 2 },
                borderRadius: isDrawer ? 2 : 3,
                bgcolor: lineInvalid
                    ? tokens.redDim
                    : isDrawer
                      ? "grey.100"
                      : "background.paper",
                border: "1px solid",
                borderColor: lineInvalid
                    ? alpha(tokens.red, 0.35)
                    : isDrawer
                      ? "divider"
                      : alpha("#0f172a", 0.06),
                transition: isDrawer ? "border-color 0.15s" : undefined,
                ...(isDrawer
                    ? {
                          "&:hover": { borderColor: tokens.borderHi },
                      }
                    : {}),
            }}
        >
            <Box
                sx={{
                    display: "flex",
                    flexDirection: "row",
                    alignItems: "center",
                    flex: 1,
                    minWidth: 0,
                    gap: 1.5,
                }}
            >
                <Box
                    sx={{
                        position: "relative",
                        width: 50,
                        height: 50,
                        borderRadius: 1.5,
                        overflow: "hidden",
                        flexShrink: 0,
                        bgcolor: tokens.surfaceHi,
                    }}
                >
                    {sanitizeProductImageSrc(item.image) ? (
                        <Image
                            src={sanitizeProductImageSrc(item.image)!}
                            alt={item.name}
                            fill
                            sizes="50px"
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
                                fontSize: 20,
                            }}
                        >
                            🍱
                        </Box>
                    )}
                </Box>

                <Box sx={{ flex: 1, minWidth: 0, overflow: "hidden" }}>
                    <Typography
                        variant="body2"
                        fontWeight={600}
                        color={lineInvalid ? "error.main" : "text.primary"}
                        sx={{
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                            lineHeight: 1.3,
                            fontSize: isDrawer ? undefined : { xs: 13, sm: 14 },
                        }}
                    >
                        {item.name}
                    </Typography>
                    {item.selectedModifiers.length > 0 && (
                        <ModifiersList
                            modifiers={item.selectedModifiers}
                            sx={{
                                mt: 0.25,
                                "& .MuiTypography-root": {
                                    wordBreak: "break-word",
                                    overflowWrap: "anywhere",
                                },
                            }}
                        />
                    )}
                    {lineIssue ? (
                        <Typography
                            variant="caption"
                            color="error.main"
                            sx={{
                                display: "block",
                                mt: 0.25,
                                lineHeight: 1.35,
                            }}
                        >
                            {cartLineIssueMessage(lineIssue)}
                        </Typography>
                    ) : null}
                </Box>
            </Box>

            <Box
                sx={{
                    display: "flex",
                    flexDirection: "row",
                    alignItems: "center",
                    flexShrink: 0,
                    gap: { xs: 0.75, sm: 1 },
                }}
            >
                <Stack
                    direction="row"
                    alignItems="center"
                    spacing={0.5}
                    sx={{ flexShrink: 0 }}
                >
                    <IconButton
                        size="small"
                        aria-label={`Уменьшить количество: ${item.name}`}
                        onClick={onDecrease}
                        sx={{
                            width: 40,
                            height: 40,
                            bgcolor: "background.paper",
                            border: "1px solid",
                            borderColor: "divider",
                            borderRadius: "50%",
                            color: tokens.textSecondary,
                            boxShadow: "none",
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
                            minWidth: 22,
                            textAlign: "center",
                            fontVariantNumeric: "tabular-nums",
                        }}
                    >
                        {item.quantity}
                    </Typography>
                    <IconButton
                        size="small"
                        aria-label={`Увеличить количество: ${item.name}`}
                        onClick={onIncrease}
                        sx={{
                            width: 40,
                            height: 40,
                            bgcolor: "primary.main",
                            borderRadius: "50%",
                            color: "primary.contrastText",
                            boxShadow: "none",
                            "&:hover": {
                                bgcolor: tokens.brandHi,
                            },
                        }}
                    >
                        <AddIcon sx={{ fontSize: 18 }} />
                    </IconButton>
                </Stack>

                <Stack
                    alignItems="flex-end"
                    sx={{
                        flexShrink: 0,
                        minWidth: { xs: 64, sm: 72 },
                    }}
                >
                    <Typography
                        variant="caption"
                        color={lineInvalid ? "error.main" : "text.secondary"}
                        sx={{
                            lineHeight: 1.2,
                            fontVariantNumeric: "tabular-nums",
                            whiteSpace: "nowrap",
                            textDecoration: lineInvalid ? "line-through" : undefined,
                        }}
                    >
                        {fmt.format(item.calculatedItemPrice)} ֏ / шт.
                    </Typography>
                    <Typography
                        variant="body2"
                        fontWeight={700}
                        color={lineInvalid ? "text.disabled" : tokens.brand}
                        sx={{
                            lineHeight: 1.2,
                            fontVariantNumeric: "tabular-nums",
                            whiteSpace: "nowrap",
                            textDecoration: lineInvalid ? "line-through" : undefined,
                        }}
                    >
                        {fmt.format(lineTotal)} ֏
                    </Typography>
                </Stack>

                <IconButton
                    size="small"
                    aria-label={`Удалить из корзины: ${item.name}`}
                    onClick={onRemove}
                    sx={{
                        width: 40,
                        height: 40,
                        flexShrink: 0,
                        bgcolor: "background.paper",
                        border: "1px solid",
                        borderColor: "divider",
                        borderRadius: "50%",
                        color: "text.secondary",
                        boxShadow: "none",
                        "&:hover": {
                            color: tokens.red,
                            borderColor: `${tokens.red}55`,
                            bgcolor: tokens.redDim,
                        },
                    }}
                >
                    <DeleteOutlineIcon sx={{ fontSize: 20 }} />
                </IconButton>
            </Box>
        </Box>
    );
}
