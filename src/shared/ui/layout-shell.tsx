"use client";

import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";
import LocationOnOutlinedIcon from "@mui/icons-material/LocationOnOutlined";
import MenuIcon from "@mui/icons-material/Menu";
import ShoppingBagOutlinedIcon from "@mui/icons-material/ShoppingBagOutlined";
import AppBar from "@mui/material/AppBar";
import Box from "@mui/material/Box";
import IconButton from "@mui/material/IconButton";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import Snackbar from "@mui/material/Snackbar";
import ButtonBase from "@mui/material/ButtonBase";
import Container from "@mui/material/Container";
import Stack from "@mui/material/Stack";
import Toolbar from "@mui/material/Toolbar";
import Typography from "@mui/material/Typography";
import { alpha } from "@mui/material/styles";
import Image from "next/image";
import Link from "next/link";
import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import CountUp from "react-countup";

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
import { tokens } from "./theme";
import { StoreFooter } from "./store-footer";

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
                <MenuIcon />
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
    const openCart = useCartStore((s) => s.openCart);
    const items    = useCartStore((s) => s.items);
    const addToast = useCartStore((s) => s.addToast);

    const [cartIconPulse, setCartIconPulse] = useState(0);
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
        setCartIconPulse((n) => n + 1);
    }, [addToast]);

    return (
        <ButtonBase
            onClick={openCart}
            aria-label="Корзина"
            sx={(theme) => ({
                display: "flex",
                alignItems: "center",
                gap: 1,
                px: { xs: 1.5, sm: 2 },
                py: 1,
                borderRadius: 2,
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
            <motion.span
                key={cartIconPulse}
                style={{ display: "inline-flex", lineHeight: 0 }}
                initial={{ scale: 1 }}
                animate={
                    cartIconPulse === 0
                        ? { scale: 1 }
                        : { scale: [1, 1.2, 1] }
                }
                transition={
                    cartIconPulse === 0
                        ? { duration: 0 }
                        : { duration: 0.2, times: [0, 0.4, 1], ease: "easeOut" }
                }
            >
                <ShoppingBagOutlinedIcon
                    id="cart-icon"
                    sx={{ fontSize: 18 }}
                />
            </motion.span>

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
                        <AnimatePresence mode="popLayout" initial={false}>
                            <motion.span
                                key={count}
                                initial={{ opacity: 0, y: -5 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: 5 }}
                                transition={{ duration: 0.16 }}
                                style={{
                                    fontVariantNumeric: "tabular-nums",
                                    lineHeight: 1,
                                }}
                            >
                                {count}
                            </motion.span>
                        </AnimatePresence>
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
                        <motion.span
                            key={total}
                            layout
                            initial={{ scale: 0.96, opacity: 0.8 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ duration: 0.2 }}
                            style={{ display: "inline-block" }}
                        >
                            <CountUp
                                end={total}
                                duration={0.45}
                                separator=" "
                                decimals={0}
                            />
                        </motion.span>
                        &nbsp;֏
                    </Typography>
                    <Box
                        sx={{
                            display: { xs: "block", sm: "none" },
                            fontSize: 12,
                            fontWeight: 800,
                            fontVariantNumeric: "tabular-nums",
                        }}
                    >
                        <AnimatePresence mode="popLayout" initial={false}>
                            <motion.span
                                key={count}
                                initial={{ opacity: 0, y: -4 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: 4 }}
                                transition={{ duration: 0.16 }}
                            >
                                {count}
                            </motion.span>
                        </AnimatePresence>
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
                                    bgcolor: "background.paper",
                                    border: "1px solid",
                                    borderColor: "divider",
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
                        <Stack direction="row" spacing={1} alignItems="center">
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
                                    sx={{ color: "error.main", fontSize: 20 }}
                                />
                            ) : (
                                <CheckCircleOutlineIcon
                                    sx={{
                                        color: isAppToast
                                            ? "success.main"
                                            : "secondary.main",
                                        fontSize: 20,
                                    }}
                                />
                            )}
                            <Box component="span">{snackbarMessage}</Box>
                        </Box>
                    }
                />

            {/* Page content */}
            <Box sx={{ pb: { xs: 10, sm: 4 }, display: "flex", flexDirection: "column", minHeight: "calc(100vh - 64px)" }}>
                {children}
                <StoreFooter />
            </Box>

            {/* Global overlays */}
            <CartDrawer />
            <MobileBottomNav />
        </Box>
    );
}
