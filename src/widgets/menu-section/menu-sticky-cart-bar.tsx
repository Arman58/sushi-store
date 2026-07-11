"use client";

import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import { alpha, useTheme } from "@mui/material/styles";
import Typography from "@mui/material/Typography";
import { useTranslations } from "next-intl";

import { useCartStore } from "@/features/cart";
import { Link } from "@/i18n/server";
import { formatStorePrice } from "@/shared/lib/format-price";
import { useScrollHide } from "@/shared/lib/use-scroll-hide";
import { tokens } from "@/shared/ui/theme";

/**
 * Isolated sticky checkout CTA — only this subtree re-renders on cart changes,
 * not the full product grid (INP).
 */
export function MenuStickyCartBar() {
    const t = useTranslations("menu");
    const theme = useTheme();
    const totalCount = useCartStore((s) => s.cartTotalCount);
    const totalPrice = useCartStore((s) => s.cartTotalPrice);
    const isCartHidden = useScrollHide(150);

    const visible = totalCount > 0 && !isCartHidden;

    return (
        <Box
            aria-hidden={!visible}
            sx={{
                display: { xs: "flex", md: "none" },
                position: "fixed",
                bottom: {
                    xs: "calc(72px + env(safe-area-inset-bottom))",
                    sm: 0,
                },
                left: 0,
                right: 0,
                zIndex: 1150,
                px: 1.5,
                pb: { xs: 1, sm: "calc(16px + env(safe-area-inset-bottom))" },
                pt: { xs: 0.5, sm: 1.5 },
                pointerEvents: "none",
                visibility: visible ? "visible" : "hidden",
                opacity: visible ? 1 : 0,
                transform: visible ? "translateY(0)" : "translateY(12px)",
                transition: "opacity 0.2s ease, transform 0.2s ease, visibility 0.2s",
                bgcolor: { sm: "background.paper" },
                boxShadow: visible
                    ? {
                          sm: `0 -2px 10px ${alpha(theme.palette.common.black, 0.06)}`,
                      }
                    : "none",
            }}
        >
            <Button
                fullWidth
                component={Link}
                href="/checkout"
                sx={{
                    pointerEvents: visible ? "auto" : "none",
                    height: 48,
                    borderRadius: `${tokens.radiusCardLg}px`,
                    bgcolor: "background.paper",
                    color: "text.primary",
                    justifyContent: "space-between",
                    px: 2,
                    textTransform: "none",
                    border: "1px solid",
                    borderColor: "divider",
                    boxShadow: `0 4px 20px ${alpha(theme.palette.common.black, 0.12)}`,
                    "&:hover": { bgcolor: "action.hover" },
                }}
            >
                <Box
                    sx={{
                        display: "flex",
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 1,
                        flex: 1,
                        minWidth: 0,
                        overflow: "hidden",
                    }}
                >
                    <Typography
                        sx={{
                            fontWeight: 600,
                            fontSize: "0.9rem",
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            minWidth: 0,
                        }}
                    >
                        {t("stickyCart.label", { count: totalCount })}
                    </Typography>
                    <Typography
                        component="span"
                        sx={{
                            fontWeight: 800,
                            fontSize: "1rem",
                            color: "primary.main",
                            fontVariantNumeric: "tabular-nums",
                            whiteSpace: "nowrap",
                            flexShrink: 0,
                            ml: "auto",
                        }}
                    >
                        {formatStorePrice(totalPrice)} ֏
                    </Typography>
                </Box>
                <Typography
                    sx={{
                        color: "primary.main",
                        fontWeight: 800,
                        fontSize: "1.2rem",
                        flexShrink: 0,
                    }}
                >
                    →
                </Typography>
            </Button>
        </Box>
    );
}
