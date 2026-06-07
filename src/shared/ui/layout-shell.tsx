"use client";

import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";
import LocationOnOutlinedIcon from "@mui/icons-material/LocationOnOutlined";
import MenuIcon from "@mui/icons-material/Menu";
import ShoppingBagOutlinedIcon from "@mui/icons-material/ShoppingBagOutlined";
import AppBar from "@mui/material/AppBar";
import Box from "@mui/material/Box";
import ButtonBase from "@mui/material/ButtonBase";
import Container from "@mui/material/Container";
import IconButton from "@mui/material/IconButton";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import Snackbar from "@mui/material/Snackbar";
import Stack from "@mui/material/Stack";
import { alpha } from "@mui/material/styles";
import Toolbar from "@mui/material/Toolbar";
import Typography from "@mui/material/Typography";
import dynamic from "next/dynamic";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { useEffect, useMemo, useRef, useState } from "react";

import { LoginButton } from "@/features/auth";
import { useCartStore } from "@/features/cart";

const CartDrawer = dynamic(
    () => import("./cart-drawer").then((m) => m.CartDrawer),
    { ssr: false },
);
const MobileBottomNav = dynamic(
    () => import("./mobile-bottom-nav").then((m) => m.MobileBottomNav),
    { ssr: false },
);
const StoreFooter = dynamic(
    () => import("./store-footer").then((m) => m.StoreFooter),
    { ssr: false, loading: () => null },
);
import { tokens } from "./theme";

const STORE_NAV_LINKS = [
    { href: "/", label: "Главная" },
    { href: "/menu", label: "Меню" },
    { href: "/contacts", label: "Контакты" },
] as const;

// ─── Mobile nav menu ────────────────────────────────────────────────────────────

function MobileNavMenu() {
    const pathname = usePathname();
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
    const open = Boolean(anchorEl);

    return (
        <>
            <IconButton
                onClick={(e) => setAnchorEl(e.currentTarget)}
                aria-label="Меню навигации"
                sx={{
                    display: { xs: "inline-flex", sm: "none" },
                    border: "1px solid",
                    borderColor: "divider",
                    bgcolor: "background.paper",
                    color: tokens.textSecondary,
                }}
            >
                <MenuIcon aria-hidden focusable="false" />
            </IconButton>

            <Menu
                anchorEl={anchorEl}
                open={open}
                onClose={() => setAnchorEl(null)}
                anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
                transformOrigin={{ vertical: "top", horizontal: "right" }}
                PaperProps={{
                    sx: {
                        mt: 0.75,
                        minWidth: 200,
                        borderRadius: 2,
                        border: "1px solid",
                        borderColor: "divider",
                    },
                }}
            >
                {STORE_NAV_LINKS.map(({ href, label }) => (
                    <MenuItem
                        key={href}
                        component={Link}
                        href={href}
                        onClick={() => setAnchorEl(null)}
                        selected={pathname === href}
                        sx={{ fontWeight: pathname === href ? 700 : 500 }}
                    >
                        {label}
                    </MenuItem>
                ))}
            </Menu>
        </>
    );
}

// ─── Cart button ──────────────────────────────────────────────────────────────

function CartHeaderButton() {
    const pathname = usePathname();
    const openCart = useCartStore((s) => s.openCart);
    const items    = useCartStore((s) => s.items);
    const isCheckoutPage = pathname?.startsWith("/checkout") ?? false;
    const addToast = useCartStore((s) => s.addToast);

    const [cartIconPulse, setCartIconPulse] = useState(false);
    const lastAddToastRef = useRef(0);

    const { count, total } = useMemo(
        () => ({
            count: items.reduce((s, i) => s + i.quantity, 0),
            total: items.reduce(
                        (s, i) => s + i.calculatedItemPrice * i.quantity,
                        0,
                    ),
        }),
        [items],
    );

    useEffect(() => {
        if (!addToast || addToast === lastAddToastRef.current) return;
        lastAddToastRef.current = addToast;
        queueMicrotask(() => setCartIconPulse(true));
        const timer = window.setTimeout(() => setCartIconPulse(false), 220);
        return () => window.clearTimeout(timer);
    }, [addToast]);

    return (
        <ButtonBase
            onClick={() => {
                if (isCheckoutPage) return;
                openCart();
            }}
            aria-label={
                isCheckoutPage ? "Корзина (на странице оформления)" : "Открыть корзину"
            }
            aria-disabled={isCheckoutPage}
            sx={(theme) => ({
                display: "flex",
                alignItems: "center",
                gap: 1,
                px: { xs: 1.5, sm: 2 },
                py: 1,
                borderRadius: 2,
                ...(isCheckoutPage
                    ? { opacity: 0.55, cursor: "default" }
                    : {}),
                bgcolor: count > 0 ? tokens.brand : "background.paper",
                border: "1px solid",
                borderColor: count > 0 ? tokens.brand : theme.palette.divider,
                color:
                    count > 0 ? theme.palette.primary.contrastText : "text.secondary",
                transition: "all 0.18s ease",
                "&:hover": {
                    bgcolor: count > 0 ? tokens.brandHi : "action.hover",
                    transform: "translateY(-1px)",
                    boxShadow:
                        count > 0
                            ? `0 1px 4px ${alpha(theme.palette.common.black, 0.08)}`
                            : `0 1px 3px ${alpha(theme.palette.common.black, 0.06)}`,
                },
                "&:active": { transform: "scale(0.97)" },
            })}
        >
            <Box
                sx={{
                    display: "inline-flex",
                    lineHeight: 0,
                    animation: cartIconPulse
                        ? "cart-icon-pulse 0.22s ease-out"
                        : "none",
                    "@keyframes cart-icon-pulse": {
                        "0%": { transform: "scale(1)" },
                        "40%": { transform: "scale(1.2)" },
                        "100%": { transform: "scale(1)" },
                    },
                }}
            >
                <ShoppingBagOutlinedIcon
                    id="cart-icon"
                    aria-hidden
                    focusable="false"
                    sx={{ fontSize: 18 }}
                />
            </Box>

            {count > 0 ? (
                <>
                    <Box
                        sx={{
                            display: { xs: "none", sm: "flex" },
                            alignItems: "center",
                            justifyContent: "center",
                            minWidth: 20,
                            height: 20,
                            borderRadius: "50%",
                            bgcolor: (theme) =>
                                alpha(theme.palette.primary.contrastText, 0.28),
                            fontSize: 11,
                            fontWeight: 800,
                            px: 0.5,
                        }}
                    >
                        <Box
                            component="span"
                            sx={{
                                fontVariantNumeric: "tabular-nums",
                                lineHeight: 1,
                            }}
                        >
                            {count}
                        </Box>
                    </Box>
                    <Typography
                        component="span"
                        variant="body2"
                        fontWeight={700}
                        sx={{
                            fontSize: { xs: 12, sm: 13 },
                            display: { xs: "none", sm: "inline-flex" },
                            fontVariantNumeric: "tabular-nums",
                            alignItems: "baseline",
                        }}
                    >
                        {total.toLocaleString("ru-RU")}&nbsp;֏
                    </Typography>
                    <Box
                        sx={{
                            display: { xs: "block", sm: "none" },
                            fontSize: 12,
                            fontWeight: 800,
                            fontVariantNumeric: "tabular-nums",
                        }}
                    >
                        {count}
                    </Box>
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
    const isAdminRoute =
        typeof pathname === "string" && pathname.startsWith("/admin");

    const addToast           = useCartStore((state) => state.addToast);
    const setAddToast        = useCartStore((state) => state.setAddToast);
    const lastAddedTitle     = useCartStore((state) => state.lastAddedTitle);
    const appToastMessage    = useCartStore((state) => state.appToastMessage);
    const appToastSeverity   = useCartStore((state) => state.appToastSeverity);

    /** Админка — отдельный layout (src/app/admin), без витринного хедера и корзины. */
    if (isAdminRoute) {
        return <>{children}</>;
    }

    const isAppToast = Boolean(appToastMessage);
    const isErrorToast = appToastSeverity === "error";

    const snackbarMessage = isAppToast
        ? appToastMessage
        : lastAddedTitle
          ? `${lastAddedTitle} добавлен в корзину`
          : "Добавлено в корзину";

    const snackbarDuration = isAppToast ? 3500 : 1500;

    return (
        <Box sx={{ minHeight: "100vh", bgcolor: "background.default" }}>
            <Box component="header">
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
                            minWidth: 0,
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
                                    bgcolor: "background.paper",
                                    border: "1px solid",
                                    borderColor: "divider",
                                    flexShrink: 0,
                                    position: "relative",
                                }}
                            >
                                <Image
                                    src="/east-west-logo.png"
                                    alt="East West Delivery - sushi and pizza Yerevan"
                                    fill
                                    sizes="36px"
                                    priority
                                    fetchPriority="high"
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
                                            `linear-gradient(135deg, ${tokens.brand} 0%, ${tokens.brandHi} 100%)`,
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
                                bgcolor: "background.paper",
                                border: "1px solid",
                                borderColor: "divider",
                            }}
                        >
                            <LocationOnOutlinedIcon
                                aria-hidden
                                focusable="false"
                                sx={{ fontSize: 15, color: "primary.dark" }}
                            />
                            <Typography variant="body2" fontWeight={600} sx={{ fontSize: 13 }}>
                                Ереван
                            </Typography>
                            <Typography
                                variant="caption"
                                sx={{ color: tokens.textMuted }}
                            >
                                · 45-60 мин
                            </Typography>
                        </Box>

                        {/* Right actions */}
                        <Stack direction="row" spacing={1} alignItems="center" sx={{ flexShrink: 0 }}>
                            {/* Nav links — desktop */}
                            <Box
                                component="nav"
                                aria-label="Основная навигация"
                                sx={{ display: { xs: "none", sm: "flex" }, gap: 0.5 }}
                            >
                                {STORE_NAV_LINKS.map(({ href, label }) => (
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

                            <MobileNavMenu />
                            <LoginButton />
                            <CartHeaderButton />
                        </Stack>
                    </Container>
                </Toolbar>
            </AppBar>
            </Box>

            <Snackbar
                    open={addToast !== 0}
                    autoHideDuration={snackbarDuration}
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
                        maxWidth: 360,
                    }}
                    ContentProps={{
                        sx: (theme) => ({
                            bgcolor: isErrorToast
                                ? alpha(theme.palette.error.main, 0.08)
                                : "background.paper",
                            color: "text.primary",
                            borderRadius: 3,
                            border: "1px solid",
                            borderColor: isErrorToast
                                ? alpha(theme.palette.error.main, 0.35)
                                : alpha(theme.palette.divider, 0.9),
                            boxShadow: `0 8px 24px ${alpha(theme.palette.common.black, 0.15)}`,
                            p: 1.5,
                            display: "flex",
                            alignItems: "center",
                            gap: 1.5,
                        }),
                    }}
                    message={
                        <Box
                            sx={{
                                display: "flex",
                                alignItems: "center",
                                gap: 1.5,
                            }}
                        >
                            {isErrorToast ? (
                                <ErrorOutlineIcon
                                    aria-hidden
                                    focusable="false"
                                    sx={{ color: "error.main", fontSize: 20 }}
                                />
                            ) : (
                                <CheckCircleOutlineIcon
                                    aria-hidden
                                    focusable="false"
                                    sx={{
                                        color: isAppToast
                                            ? "success.main"
                                            : "secondary.main",
                                        fontSize: 20,
                                    }}
                                />
                            )}
                            <Box component="span" sx={{ minWidth: 0, overflow: "hidden", textOverflow: "ellipsis" }}>{snackbarMessage}</Box>
                        </Box>
                    }
                />

            <Box
                component="main"
                id="main-content"
                sx={{
                    pb: {
                        xs: "calc(72px + env(safe-area-inset-bottom))",
                        sm: 4,
                    },
                    display: "flex",
                    flexDirection: "column",
                    minHeight: "calc(100vh - 64px)",
                    overflowX: "clip",
                    maxWidth: "100%",
                }}
            >
                {children}
                <StoreFooter />
            </Box>

            {/* Global overlays */}
            <CartDrawer />
            {!pathname.startsWith("/checkout") && <MobileBottomNav />}
        </Box>
    );
}
