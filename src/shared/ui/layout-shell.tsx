"use client";

import LocationOnOutlinedIcon from "@mui/icons-material/LocationOnOutlined";
import ShoppingBagOutlinedIcon from "@mui/icons-material/ShoppingBagOutlined";
import AppBar from "@mui/material/AppBar";
import Box from "@mui/material/Box";
import ButtonBase from "@mui/material/ButtonBase";
import Container from "@mui/material/Container";
import Stack from "@mui/material/Stack";
import Toolbar from "@mui/material/Toolbar";
import Typography from "@mui/material/Typography";
import Image from "next/image";
import Link from "next/link";
import dynamic from "next/dynamic";
import type { ReactNode } from "react";
import { useMemo } from "react";

import { useCartStore } from "@/features/cart";

const CartDrawer = dynamic(
    () => import("./cart-drawer").then((m) => m.CartDrawer),
    { ssr: false },
);
import { CartToast } from "./cart-toast";
import { MobileBottomNav } from "./mobile-bottom-nav";
import { tokens } from "./theme";

const fmt = new Intl.NumberFormat("ru-RU");

// ─── Cart button ──────────────────────────────────────────────────────────────

function CartHeaderButton() {
    const openCart = useCartStore((s) => s.openCart);
    const items    = useCartStore((s) => s.items);

    const { count, total } = useMemo(
        () => ({
            count: items.reduce((s, i) => s + i.quantity, 0),
            total: items.reduce((s, i) => s + i.price * i.quantity, 0),
        }),
        [items],
    );

    return (
        <ButtonBase
            onClick={openCart}
            aria-label="Корзина"
            sx={{
                display: "flex",
                alignItems: "center",
                gap: 1,
                px: { xs: 1.5, sm: 2 },
                py: 1,
                borderRadius: 2,
                bgcolor: count > 0 ? tokens.orange : tokens.surface,
                border: `1px solid ${count > 0 ? tokens.orange : "#f0f0f0"}`,
                color: count > 0 ? "#fff" : tokens.textSecondary,
                transition: "all 0.18s ease",
                "&:hover": {
                    bgcolor: count > 0 ? tokens.orangeHi : tokens.surfaceHi,
                    transform: "translateY(-1px)",
                    boxShadow:
                        count > 0
                            ? "0 1px 4px rgba(0,0,0,0.08)"
                            : "0 1px 3px rgba(0,0,0,0.06)",
                },
                "&:active": { transform: "scale(0.97)" },
            }}
        >
            <ShoppingBagOutlinedIcon
                id="cart-icon"
                sx={{ fontSize: 18 }}
            />

            {count > 0 ? (
                <>
                    <Box
                        sx={{
                            display: { xs: "none", sm: "flex" },
                            alignItems: "center",
                            justifyContent: "center",
                            width: 20,
                            height: 20,
                            borderRadius: "50%",
                            bgcolor: "rgba(255,255,255,0.25)",
                            fontSize: 11,
                            fontWeight: 800,
                        }}
                    >
                        {count}
                    </Box>
                    <Typography
                        variant="body2"
                        fontWeight={700}
                        sx={{
                            fontSize: { xs: 12, sm: 13 },
                            display: { xs: "none", sm: "block" },
                        }}
                    >
                        {fmt.format(total)} ֏
                    </Typography>
                    {/* Mobile: just show count */}
                    <Typography
                        variant="caption"
                        fontWeight={800}
                        sx={{ display: { xs: "block", sm: "none" } }}
                    >
                        {count}
                    </Typography>
                </>
            ) : (
                <Typography
                    variant="body2"
                    sx={{ display: { xs: "none", sm: "block" } }}
                >
                    Корзина
                </Typography>
            )}
        </ButtonBase>
    );
}

// ─── Shell ────────────────────────────────────────────────────────────────────

type LayoutShellProps = { children: ReactNode };

export function LayoutShell({ children }: LayoutShellProps) {
    return (
        <Box sx={{ minHeight: "100vh", bgcolor: "background.default" }}>
            {/* ── Sticky header ── */}
            <AppBar
                position="sticky"
                elevation={0}
                color="transparent"
                sx={{ color: tokens.textPrimary }}
            >
                <Toolbar
                    disableGutters
                    sx={{
                        minHeight: { xs: 56, sm: 64 },
                        pt: "env(safe-area-inset-top)",
                        height: {
                            xs: "calc(56px + env(safe-area-inset-top))",
                            sm: 64,
                        },
                    }}
                >
                    <Container
                        maxWidth="lg"
                        sx={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            gap: 2,
                            px: { xs: 2, sm: 3 },
                        }}
                    >
                        {/* Logo */}
                        <Box
                            component={Link}
                            href="/"
                            sx={{
                                display: "flex",
                                alignItems: "center",
                                gap: 1.25,
                                textDecoration: "none",
                                flexShrink: 0,
                            }}
                        >
                            <Box
                                sx={{
                                    width: 36,
                                    height: 36,
                                    borderRadius: 1.5,
                                    overflow: "hidden",
                                    bgcolor: tokens.surface,
                                    border: "1px solid #f0f0f0",
                                    flexShrink: 0,
                                    position: "relative",
                                }}
                            >
                                <Image
                                    src="/east-west-logo.png"
                                    alt="East West"
                                    fill
                                    sizes="36px"
                                    style={{ objectFit: "cover" }}
                                />
                            </Box>
                            <Box sx={{ display: { xs: "none", sm: "block" } }}>
                                <Typography
                                    variant="subtitle1"
                                    fontWeight={800}
                                    sx={{
                                        lineHeight: 1,
                                        color: tokens.textPrimary,
                                        letterSpacing: -0.3,
                                    }}
                                >
                                    East West
                                </Typography>
                                <Typography
                                    variant="caption"
                                    sx={{ color: tokens.textMuted, display: "block", lineHeight: 1.2 }}
                                >
                                    Delivery
                                </Typography>
                            </Box>
                        </Box>

                        {/* Location indicator — desktop only */}
                        <Box
                            sx={{
                                display: { xs: "none", md: "flex" },
                                alignItems: "center",
                                gap: 0.75,
                                px: 2,
                                py: 0.75,
                                borderRadius: 999,
                                bgcolor: tokens.surface,
                                border: "1px solid #f0f0f0",
                            }}
                        >
                            <LocationOnOutlinedIcon
                                sx={{ fontSize: 15, color: tokens.orange }}
                            />
                            <Typography variant="body2" fontWeight={600} sx={{ fontSize: 13 }}>
                                Ереван
                            </Typography>
                            <Typography
                                variant="caption"
                                sx={{ color: tokens.textMuted }}
                            >
                                · 45–60 мин
                            </Typography>
                        </Box>

                        {/* Right actions */}
                        <Stack direction="row" spacing={1} alignItems="center">
                            {/* Nav links — desktop */}
                            <Box sx={{ display: { xs: "none", sm: "flex" }, gap: 0.5 }}>
                                {[
                                    { href: "/menu",         label: "Меню" },
                                    { href: "/order-status", label: "Мой заказ" },
                                ].map(({ href, label }) => (
                                    <ButtonBase
                                        key={href}
                                        component={Link}
                                        href={href}
                                        sx={{
                                            px: 1.5,
                                            py: 0.75,
                                            borderRadius: 1.5,
                                            color: tokens.textSecondary,
                                            fontSize: 14,
                                            fontWeight: 600,
                                            transition: "background-color 0.15s, color 0.15s",
                                            "&:hover": {
                                                color: tokens.textPrimary,
                                                bgcolor: tokens.surfaceHi,
                                            },
                                        }}
                                    >
                                        {label}
                                    </ButtonBase>
                                ))}
                            </Box>

                            <CartHeaderButton />
                        </Stack>
                    </Container>
                </Toolbar>
            </AppBar>

            {/* Page content */}
            <Box component="main" sx={{ pb: { xs: 10, sm: 4 } }}>
                {children}
            </Box>

            {/* Global overlays */}
            <CartDrawer />
            <CartToast />
            <MobileBottomNav />
        </Box>
    );
}
