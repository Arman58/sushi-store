"use client";

import TakeoutDiningOutlinedIcon from "@mui/icons-material/TakeoutDiningOutlined";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import { alpha } from "@mui/material/styles";
import Link from "next/link";

import { tokens } from "./theme";

export type EmptyCartProps = {
    onNavigate?: () => void;
    /** Внутри drawer — строка на всю высоту; на странице — компактный блок */
    layout?: "drawer" | "page";
    title?: string;
    subtitle?: string;
    ctaHref?: string;
    ctaLabel?: string;
};

/** Плейсхолдер пустой корзины / пустого списка: крупная иконка, заголовок, CTA в меню. */
export function EmptyCart({
    onNavigate,
    layout = "drawer",
    title = "Корзина пуста",
    subtitle = "Добавьте что-нибудь вкусное!",
    ctaHref = "/menu",
    ctaLabel = "Перейти в меню",
}: EmptyCartProps) {
    const isPage = layout === "page";

    return (
        <Box
            sx={{
                flex: isPage ? "0 0 auto" : 1,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 2.5,
                px: 3,
                py: isPage ? { xs: 6, sm: 8 } : 4,
                textAlign: "center",
                minHeight: isPage ? { xs: 320, sm: 380 } : undefined,
            }}
        >
            <Box
                sx={{
                    width: 120,
                    height: 120,
                    borderRadius: "50%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    bgcolor: tokens.brandDim,
                    border: `1px solid ${alpha(tokens.brand, 0.22)}`,
                    boxShadow: `0 10px 32px ${alpha(tokens.textPrimary, 0.07)}`,
                }}
            >
                <TakeoutDiningOutlinedIcon
                    sx={{
                        fontSize: 56,
                        color: tokens.brand,
                        opacity: 0.95,
                    }}
                />
            </Box>
            <Box sx={{ maxWidth: 300 }}>
                <Typography
                    variant="subtitle1"
                    fontWeight={800}
                    letterSpacing={-0.02}
                    sx={{ mb: 0.75, color: tokens.textPrimary }}
                >
                    {title}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.55 }}>
                    {subtitle}
                </Typography>
            </Box>
            <Button
                variant="contained"
                size="large"
                component={Link}
                href={ctaHref}
                onClick={onNavigate}
                sx={{
                    mt: 0.5,
                    minWidth: 220,
                    fontWeight: 700,
                    px: 3,
                }}
            >
                {ctaLabel}
            </Button>
        </Box>
    );
}
