"use client";

import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";
import LocationOnOutlinedIcon from "@mui/icons-material/LocationOnOutlined";
import ShoppingBagOutlinedIcon from "@mui/icons-material/ShoppingBagOutlined";
import AppBar from "@mui/material/AppBar";
import Box from "@mui/material/Box";
import ButtonBase from "@mui/material/ButtonBase";
import Container from "@mui/material/Container";
import Snackbar from "@mui/material/Snackbar";
import { alpha } from "@mui/material/styles";
import Toolbar from "@mui/material/Toolbar";
import Typography from "@mui/material/Typography";
import dynamic from "next/dynamic";
import Image from "next/image";
import { useTranslations } from "next-intl";
import type { ReactNode } from "react";
import { useEffect, useMemo, useRef, useState } from "react";

import { LoginButton } from "@/features/auth";
import { useCartStore } from "@/features/cart";
import { Link, usePathname } from "@/i18n/server";
import { PageTransition } from "@/shared/ui/page-transition";

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
import LanguageSwitcher from "./LanguageSwitcher";
import { MobileNavDrawer } from "./mobile-nav-drawer";
import { tokens } from "./theme";

const HEADER_ACTION_SLOT_SX = {
    flexShrink: 0,
    minWidth: 40,
    minHeight: 40,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
} as const;

const STORE_NAV_HREFS = [
    { href: "/", key: "home" },
    { href: "/menu", key: "menu" },
    { href: "/contacts", key: "contacts" },
] as const;

// ─── Desktop nav link ───────────────────────────────────────────────────────────

function NavLink({
    href,
    labelKey,
}: {
    href: (typeof STORE_NAV_HREFS)[number]["href"];
    labelKey: (typeof STORE_NAV_HREFS)[number]["key"];
}) {
    const t = useTranslations("nav");

    return (
        <ButtonBase
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
            {t(labelKey)}
        </ButtonBase>
    );
}

// ─── Cart button ──────────────────────────────────────────────────────────────

function CartHeaderButton() {
    const pathname = usePathname();
    const tNav = useTranslations("nav");
    const tCommon = useTranslations("common");
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
                isCheckoutPage
                    ? tCommon("aria.cartOnCheckout")
                    : tCommon("aria.openCart")
            }
            aria-disabled={isCheckoutPage}
            sx={(theme) => ({
                display: "flex",
                alignItems: "center",
                gap: 1,
                flexShrink: 0,
                minWidth: 40,
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
                    {tNav("cart")}
                </Typography>
            )}
        </ButtonBase>
    );
}

// ─── Shell ────────────────────────────────────────────────────────────────────

type LayoutShellProps = { children: ReactNode };

export function LayoutShell({ children }: LayoutShellProps) {
    const pathname = usePathname();
    const tCommon = useTranslations("common");
    const isAdminRoute =
        typeof pathname === "string" && pathname.startsWith("/admin");

    const addToast           = useCartStore((state) => state.addToast);
    const setAddToast        = useCartStore((state) => state.setAddToast);
    const lastAddedTitle     = useCartStore((state) => state.lastAddedTitle);
    const appToastMessage    = useCartStore((state) => state.appToastMessage);
    const appToastSeverity   = useCartStore((state) => state.appToastSeverity);

    /** Админка - отдельный layout (src/app/admin), без витринного хедера и корзины. */
    if (isAdminRoute) {
        return <>{children}</>;
    }

    const isAppToast = Boolean(appToastMessage);
    const isErrorToast = appToastSeverity === "error";

    const snackbarMessage = isAppToast
        ? appToastMessage
        : lastAddedTitle
          ? tCommon("toast.addedNamed", { name: lastAddedTitle })
          : tCommon("toast.added");

    const snackbarDuration = isAppToast ? 3500 : 1500;

    return (
        <Box sx={{ minHeight: "100vh", bgcolor: "background.default" }}>
            <Box component="header">
            <AppBar
                position="sticky"
                elevation={0}
                color="transparent"
                sx={{ color: tokens.textPrimary, overflow: "visible" }}
            >
                <Toolbar
                    disableGutters
                    sx={{
                        minHeight: {
                            xs: "calc(56px + env(safe-area-inset-top))",
                            sm: 64,
                        },
                        pt: "env(safe-area-inset-top)",
                        overflow: "visible",
                    }}
                >
                    <Container
                        maxWidth="lg"
                        sx={{
                            display: "flex",
                            alignItems: "center",
                            gap: { xs: 1, sm: 2 },
                            minWidth: 0,
                            width: "100%",
                            px: { xs: 2, sm: 3 },
                            overflow: "visible",
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
                                minWidth: 0,
                                flex: "0 1 auto",
                                maxWidth: { xs: "38%", sm: "none" },
                                overflow: "hidden",
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
                                    alt={tCommon("logoAlt")}
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
                                    {tCommon("brandName")}
                                </Typography>
                                <Typography
                                    variant="caption"
                                    sx={{ color: tokens.textMuted, display: "block", lineHeight: 1.2 }}
                                >
                                    {tCommon("brandTagline")}
                                </Typography>
                            </Box>
                        </Box>

                        {/* Location indicator - desktop only */}
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
                                flex: "0 1 auto",
                                minWidth: 0,
                                mx: { md: "auto" },
                            }}
                        >
                            <LocationOnOutlinedIcon
                                aria-hidden
                                focusable="false"
                                sx={{ fontSize: 15, color: "primary.dark" }}
                            />
                            <Typography variant="body2" fontWeight={600} sx={{ fontSize: 13 }}>
                                {tCommon("location.city")}
                            </Typography>
                            <Typography
                                variant="caption"
                                sx={{ color: tokens.textMuted }}
                            >
                                · {tCommon("location.deliveryEta")}
                            </Typography>
                        </Box>

                        {/* Right actions */}
                        <Box
                            sx={{
                                display: "flex",
                                alignItems: "center",
                                gap: 1,
                                flexShrink: 0,
                                ml: "auto",
                            }}
                        >
                            <Box
                                component="nav"
                                aria-label={tCommon("aria.mainNav")}
                                sx={{
                                    display: { xs: "none", sm: "flex" },
                                    gap: 0.5,
                                    flexShrink: 0,
                                }}
                            >
                                {STORE_NAV_HREFS.map(({ href, key }) => (
                                    <NavLink key={href} href={href} labelKey={key} />
                                ))}
                            </Box>

                            <Box
                                sx={{
                                    ...HEADER_ACTION_SLOT_SX,
                                    display: { xs: "none", sm: "flex" },
                                }}
                            >
                                <LanguageSwitcher />
                            </Box>
                            <Box sx={HEADER_ACTION_SLOT_SX}>
                                <MobileNavDrawer />
                            </Box>
                            <Box
                                sx={{
                                    ...HEADER_ACTION_SLOT_SX,
                                    display: { xs: "none", sm: "flex" },
                                }}
                            >
                                <LoginButton />
                            </Box>
                            <Box sx={HEADER_ACTION_SLOT_SX}>
                                <CartHeaderButton />
                            </Box>
                        </Box>
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
                    flex: 1,
                    pb: {
                        xs: "calc(80px + env(safe-area-inset-bottom))",
                        sm: 4,
                    },
                    display: "flex",
                    flexDirection: "column",
                    minHeight: {
                        xs: "calc(100vh - 56px - env(safe-area-inset-top))",
                        sm: "calc(100vh - 64px)",
                    },
                    overflow: "visible",
                    maxWidth: "100%",
                }}
            >
                <PageTransition>{children}</PageTransition>
                <StoreFooter />
            </Box>

            {/* Global overlays */}
            <CartDrawer />
            {!pathname.startsWith("/checkout") && <MobileBottomNav />}
        </Box>
    );
}
