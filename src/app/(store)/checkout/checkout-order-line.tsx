"use client";

import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Paper from "@mui/material/Paper";
import { alpha } from "@mui/material/styles";
import Typography from "@mui/material/Typography";

import {
    type CartItem,
    type CartLineIssue,
    cartLineIssueMessage,
} from "@/features/cart";
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
                minWidth: 0,
                overflow: "hidden",
            }}
        >
            <Box
                sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 1,
                    minWidth: 0,
                }}
            >
                <Box sx={{ flex: 1, minWidth: 0, overflow: "hidden" }}>
                    <Typography
                        variant="body2"
                        fontWeight={700}
                        color={lineInvalid ? "error.main" : "text.primary"}
                        sx={{
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            lineHeight: 1.3,
                        }}
                    >
                        {item.name}
                    </Typography>

                    {hasModifiers ? (
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
                            {formatModifiersInline(item.selectedModifiers)}
                        </Typography>
                    ) : null}
                </Box>

                <Box
                    sx={{
                        flexShrink: 0,
                        textAlign: "right",
                        whiteSpace: "nowrap",
                    }}
                >
                    <Typography
                        variant="body2"
                        color={lineInvalid ? "error.main" : "text.secondary"}
                        sx={{
                            fontVariantNumeric: "tabular-nums",
                            whiteSpace: "nowrap",
                            lineHeight: 1.2,
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
                            lineHeight: 1.2,
                            textDecoration: lineInvalid ? "line-through" : undefined,
                        }}
                    >
                        {fmt.format(lineTotal)} ֏
                    </Typography>
                </Box>
            </Box>

            {lineIssue ? (
                <Alert severity="error" sx={{ py: 0.25, mt: 1 }}>
                    {cartLineIssueMessage(lineIssue)}
                </Alert>
            ) : null}
        </Paper>
    );
}
