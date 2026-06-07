"use client";

import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Chip from "@mui/material/Chip";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import { alpha } from "@mui/material/styles";
import Typography from "@mui/material/Typography";
import Image from "next/image";

import {
    type CartItem,
    type CartLineIssue,
    cartLineIssueMessage,
} from "@/features/cart";
import { sanitizeProductImageSrc } from "@/shared/lib/product-cover";
import { ProductCoverPlaceholder } from "@/shared/ui/product-cover-image";
import { tokens } from "@/shared/ui/theme";

const fmt = new Intl.NumberFormat("ru-RU");

function formatModifiersInline(
    modifiers: CartItem["selectedModifiers"],
): string {
    return modifiers
        .map((m) => {
            const delta =
                m.priceDelta !== 0
                    ? ` (+${fmt.format(m.priceDelta)} ֏)`
                    : "";
            return `${m.name}${delta}`;
        })
        .join(", ");
}

type CheckoutOrderLineProps = {
    item: CartItem;
    lineIssue?: CartLineIssue;
};

export function CheckoutOrderLine({ item, lineIssue }: CheckoutOrderLineProps) {
    const lineInvalid = Boolean(lineIssue);
    const lineTotal = item.calculatedItemPrice * item.quantity;
    const safeImage = sanitizeProductImageSrc(item.image ?? null);
    const hasModifiers = item.selectedModifiers.length > 0;

    return (
        <Paper
            elevation={0}
            sx={{
                p: 1.25,
                borderRadius: 2,
                border: "1px solid",
                borderColor: lineInvalid
                    ? alpha(tokens.red, 0.4)
                    : alpha(tokens.textPrimary, 0.08),
                bgcolor: lineInvalid ? tokens.redDim : tokens.surfaceHi,
            }}
        >
            <Stack direction="row" alignItems="flex-start" spacing={1.25}>
                <Box
                    sx={{
                        position: "relative",
                        width: 56,
                        height: 56,
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
                            sizes="56px"
                            style={{ objectFit: "cover" }}
                        />
                    ) : (
                        <ProductCoverPlaceholder />
                    )}
                </Box>

                <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography
                        variant="body2"
                        fontWeight={700}
                        color={lineInvalid ? "error.main" : "text.primary"}
                        sx={{
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                            lineHeight: 1.3,
                        }}
                    >
                        {item.name}
                    </Typography>

                    {hasModifiers ? (
                        <Stack spacing={0.75} sx={{ mt: 0.75 }}>
                            <Stack
                                direction="row"
                                flexWrap="wrap"
                                gap={0.5}
                                useFlexGap
                            >
                                {item.selectedModifiers.map((m) => (
                                    <Chip
                                        key={m.id}
                                        label={m.name}
                                        size="small"
                                        variant="outlined"
                                        color="primary"
                                        sx={{
                                            height: 24,
                                            fontWeight: 600,
                                            fontSize: "0.7rem",
                                            "& .MuiChip-label": { px: 1 },
                                        }}
                                    />
                                ))}
                            </Stack>
                            <Typography
                                variant="caption"
                                sx={{
                                    color: "primary.main",
                                    fontWeight: 600,
                                    lineHeight: 1.45,
                                    display: "block",
                                }}
                            >
                                {formatModifiersInline(item.selectedModifiers)}
                            </Typography>
                        </Stack>
                    ) : null}
                </Box>

                <Stack
                    alignItems="flex-end"
                    spacing={0.25}
                    sx={{ flexShrink: 0, minWidth: 72 }}
                >
                    <Typography
                        variant="body2"
                        color={lineInvalid ? "error.main" : "text.secondary"}
                        sx={{
                            fontVariantNumeric: "tabular-nums",
                            whiteSpace: "nowrap",
                        }}
                    >
                        × {item.quantity}
                    </Typography>
                    <Typography
                        variant="body2"
                        fontWeight={800}
                        color={lineInvalid ? "text.disabled" : "text.primary"}
                        sx={{
                            fontVariantNumeric: "tabular-nums",
                            whiteSpace: "nowrap",
                            textDecoration: lineInvalid ? "line-through" : undefined,
                        }}
                    >
                        {fmt.format(lineTotal)} ֏
                    </Typography>
                </Stack>
            </Stack>

            {lineIssue ? (
                <Alert severity="error" sx={{ py: 0.25, mt: 1 }}>
                    {cartLineIssueMessage(lineIssue)}
                </Alert>
            ) : null}
        </Paper>
    );
}
