"use client";

import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import LocationOnOutlinedIcon from "@mui/icons-material/LocationOnOutlined";
import ShoppingBagOutlinedIcon from "@mui/icons-material/ShoppingBagOutlined";
import AppBar from "@mui/material/AppBar";
import Box from "@mui/material/Box";
import Snackbar from "@mui/material/Snackbar";
import ButtonBase from "@mui/material/ButtonBase";
import Container from "@mui/material/Container";
import Stack from "@mui/material/Stack";
import Toolbar from "@mui/material/Toolbar";
import Typography from "@mui/material/Typography";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import dynamic from "next/dynamic";
import type { ReactNode } from "react";
import { useMemo } from "react";
import CountUp from "react-countup";

import { useCartStore } from "@/features/cart";

const CartDrawer = dynamic(
    () => import("./cart-drawer").then((m) => m.CartDrawer),
    { ssr: false },
);
const MobileBottomNav = dynamic(
    () => import("./mobile-bottom-nav").then((m) => m.MobileBottomNav),
    { ssr: false },
);
import { tokens } from "./theme";

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
                        <CountUp
                            end={total}
                            duration={0.5}
                            separator=" "
                            decimals={0}
                        />{" "}
                        ֏
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
    const pathname = usePathname();
    const showClientChrome = !pathname.startsWith("/admin");
    const addToast        = useCartStore((state) => state.addToast);
    const setAddToast     = useCartStore((state) => state.setAddToast);
    const lastAddedTitle  = useCartStore((state) => state.lastAddedTitle);

    const addToCartMessage = lastAddedTitle
        ? `${lastAddedTitle} добавлен в корзину`
        : "Добавлено в корзину";

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
                                    sx={{
                                        fontWeight: 900,
                                        fontSize: "1.4rem",
                                        lineHeight: 1,
                                        letterSpacing: -0.3,
                                        background:
                                            "linear-gradient(135deg, #E85D4A 0%, #FF8A65 100%)",
                                        backgroundClip: "text",
                                        WebkitBackgroundClip: "text",
                                        color: "transparent",
                                        WebkitTextFillColor: "transparent",
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

                            {showClientChrome ? <CartHeaderButton /> : null}
                        </Stack>
                    </Container>
                </Toolbar>
            </AppBar>

            {showClientChrome ? (
                <Snackbar
                    open={addToast !== 0}
                    autoHideDuration={1500}
                    onClose={() => setAddToast(0)}
                    anchorOrigin={{ vertical: "top", horizontal: "right" }}
                    sx={{
                        position: "fixed",
                        top: {
                            xs: "calc(64px + env(safe-area-inset-top))",
                            sm: 72,
                        },
                        right: 16,
                        zIndex: 1400,
                        pointerEvents: "none",
                        maxWidth: 320,
                    }}
                    ContentProps={{
                        sx: {
                            bgcolor: "#ffffff",
                            color: "text.primary",
                            borderRadius: 3,
                            boxShadow: "0 8px 24px rgba(0,0,0,0.15)",
                            p: 1.5,
                            display: "flex",
                            alignItems: "center",
                            gap: 1.5,
                        },
                    }}
                    message={
                        <Box
                            sx={{
                                display: "flex",
                                alignItems: "center",
                                gap: 1.5,
                            }}
                        >
                            <CheckCircleOutlineIcon
                                sx={{ color: "#2DB5A0", fontSize: 20 }}
                            />
                            <Box component="span">{addToCartMessage}</Box>
                        </Box>
                    }
                />
            ) : null}

            {/* Page content */}
            <Box component="main" sx={{ pb: { xs: 10, sm: 4 } }}>
                {children}
            </Box>

            {/* Global overlays */}
            <CartDrawer />
            {showClientChrome ? <MobileBottomNav /> : null}
        </Box>
    );
}
