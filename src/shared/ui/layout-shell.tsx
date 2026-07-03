"use client";

import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";
import FavoriteBorderOutlinedIcon from "@mui/icons-material/FavoriteBorderOutlined";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import LocationOnIcon from "@mui/icons-material/LocationOn";
import SearchIcon from "@mui/icons-material/Search";
import ShoppingCartOutlinedIcon from "@mui/icons-material/ShoppingCartOutlined";
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
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import type { ReactNode } from "react";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";

import { LoginButton } from "@/features/auth";
import { useCartStore } from "@/features/cart";
import { useFavorites } from "@/features/favorites";
import { Link, usePathname } from "@/i18n/server";
import { SITE_LOGO_PATH } from "@/lib/site-config";
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
import { ThemeModeToggle } from "./theme-mode-toggle";

const HEADER_ACTION_SLOT_SX = {
    flexShrink: 0,
    minWidth: 40,
    minHeight: 40,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
} as const;

// ─── Search bar ──────────────────────────────────────────────────────────────

function SearchBar({ variant = "desktop" }: { variant?: "desktop" | "mobile" }) {
    const t = useTranslations("nav");
    const router = useRouter();
    const [query, setQuery] = useState("");
    const inputRef = useRef<HTMLInputElement>(null);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (query.trim()) {
            router.push(`/menu?search=${encodeURIComponent(query.trim())}`);
        }
    };

    return (
        <Box
            component="form"
            onSubmit={handleSubmit}
            sx={
                variant === "desktop"
                    ? {
                          display: { xs: "none", md: "flex" },
                          alignItems: "center",
                          flex: "1 1 auto",
                          minWidth: 200,
                          maxWidth: 480,
                          mx: 2,
                      }
                    : {
                          display: { xs: "flex", md: "none" },
                          alignItems: "center",
                          width: "100%",
                      }
            }
        >
            <Box
                sx={{
                    display: "flex",
                    alignItems: "center",
                    width: "100%",
                    minHeight: 44,
                    gap: 1,
                    px: 2.25,
                    py: 0.75,
                    borderRadius: 999,
                    border: "1px solid transparent",
                    bgcolor: tokens.surfaceHi,
                    transition: "border-color 0.2s, box-shadow 0.2s, background-color 0.2s",
                    "&:focus-within": {
                        borderColor: "primary.main",
                        bgcolor: "background.paper",
                        boxShadow: "0 0 0 2px rgba(39,174,96,0.15)",
                    },
                }}
            >
                <SearchIcon sx={{ fontSize: 18, color: "text.muted", flexShrink: 0 }} />
                <input
                    ref={inputRef}
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder={t("searchPlaceholder") || "Поиск..."}
                    aria-label={t("search") || "Поиск"}
                    style={{
                        border: "none",
                        outline: "none",
                        background: "transparent",
                        width: "100%",
                        fontSize: "0.875rem",
                        color: "inherit",
                        lineHeight: 1.4,
                    }}
                />
            </Box>
        </Box>
    );
}

// ─── Favorites button ─────────────────────────────────────────────────────────

function FavoritesHeaderButton() {
    const t = useTranslations("favorites");
    const { ids } = useFavorites();
    const count = ids.length;

    return (
        <ButtonBase
            component={Link}
            href="/favorites"
            aria-label={t("aria_open")}
            sx={{
                position: "relative",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: 44,
                height: 44,
                borderRadius: "12px",
                color: tokens.textSecondary,
                transition: "all 0.18s ease",
                "&:hover": {
                    color: "#E74C3C",
                    bgcolor: tokens.surfaceHi,
                },
                "&:active": { transform: "scale(0.94)" },
            }}
        >
            <FavoriteBorderOutlinedIcon sx={{ fontSize: 22 }} />
            {count > 0 && (
                <Box
                    sx={{
                        position: "absolute",
                        top: 4,
                        right: 2,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        minWidth: 16,
                        height: 16,
                        borderRadius: 999,
                        bgcolor: "#E74C3C",
                        color: "#FFFFFF",
                        fontSize: 9.5,
                        fontWeight: 800,
                        px: 0.4,
                        border: "2px solid var(--ew-surface)",
                        boxSizing: "content-box",
                        fontVariantNumeric: "tabular-nums",
                        lineHeight: 1,
                    }}
                >
                    {count > 99 ? "99+" : count}
                </Box>
            )}
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
        const timer = window.setTimeout(() => setCartIconPulse(false), 320);
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
            sx={{
                display: "flex",
                alignItems: "center",
                gap: 1.25,
                flexShrink: 0,
                minWidth: 40,
                px: { xs: 1, sm: 1.25 },
                py: 1,
                borderRadius: "12px",
                ...(isCheckoutPage
                    ? { opacity: 0.55, cursor: "default" }
                    : {}),
                bgcolor: "transparent",
                color: tokens.brand,
                transition: "all 0.18s ease",
                "&:hover": {
                    bgcolor: tokens.brandDim,
                },
                "&:active": { transform: "scale(0.97)" },
            }}
        >
            <Box
                sx={{
                    position: "relative",
                    display: "inline-flex",
                    lineHeight: 0,
                    animation: cartIconPulse
                        ? "cart-icon-pulse 0.32s ease-out"
                        : "none",
                    "@keyframes cart-icon-pulse": {
                        "0%": { transform: "scale(1)" },
                        "40%": { transform: "scale(1.1)" },
                        "70%": { transform: "scale(0.97)" },
                        "100%": { transform: "scale(1)" },
                    },
                }}
            >
                <ShoppingCartOutlinedIcon
                    id="cart-icon"
                    aria-hidden
                    focusable="false"
                    sx={{ fontSize: 22, color: tokens.brand }}
                />
                {count > 0 && (
                    <Box
                        sx={{
                            position: "absolute",
                            top: -6,
                            right: -8,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            minWidth: 17,
                            height: 17,
                            borderRadius: 999,
                            bgcolor: tokens.brand,
                            color: "#FFFFFF",
                            fontSize: 10,
                            fontWeight: 800,
                            px: 0.5,
                            border: "2px solid var(--ew-surface)",
                            boxSizing: "content-box",
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
                )}
            </Box>

            {count > 0 ? (
                <Typography
                    component="span"
                    variant="body2"
                    fontWeight={800}
                    sx={{
                        fontSize: { xs: 13, sm: 14 },
                        display: { xs: "none", sm: "inline-flex" },
                        fontVariantNumeric: "tabular-nums",
                        alignItems: "baseline",
                        color: tokens.textPrimary,
                    }}
                >
                    {total.toLocaleString("ru-RU")}&nbsp;֏
                </Typography>
            ) : (
                <Typography
                    variant="body2"
                    sx={{
                        display: { xs: "none", sm: "block" },
                        color: tokens.textSecondary,
                        fontWeight: 600,
                    }}
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
                                    src={SITE_LOGO_PATH}
                                    alt={tCommon("logoAlt")}
                                    fill
                                    sizes="36px"
                                    priority
                                    fetchPriority="high"
                                    unoptimized
                                    style={{ objectFit: "cover" }}
                                />
                            </Box>
                            <Box sx={{ display: { xs: "none", sm: "block" } }}>
                                <Typography
                                    variant="subtitle1"
                                    sx={{
                                        fontWeight: 900,
                                        fontSize: "1.35rem",
                                        lineHeight: 1,
                                        letterSpacing: -0.5,
                                        color: tokens.textPrimary,
                                    }}
                                >
                                    {tCommon("brandName")}
                                </Typography>
                            </Box>
                        </Box>

                        {/* Location indicator */}
                        <Box
                            sx={{
                                display: "flex",
                                alignItems: "center",
                                gap: { xs: 0.5, md: 0.75 },
                                flex: "0 1 auto",
                                minWidth: 0,
                                overflow: "hidden",
                                ml: { xs: 0, md: 1 },
                            }}
                        >
                            <LocationOnIcon
                                aria-hidden
                                focusable="false"
                                sx={{ fontSize: 20, color: tokens.brand }}
                            />
                            <Box sx={{ minWidth: 0 }}>
                                <Box
                                    sx={{
                                        display: "flex",
                                        alignItems: "center",
                                        gap: 0.25,
                                    }}
                                >
                                    <Typography
                                        variant="body2"
                                        fontWeight={700}
                                        sx={{ fontSize: 13.5, lineHeight: 1.2 }}
                                    >
                                        {tCommon("location.city")}
                                    </Typography>
                                    <KeyboardArrowDownIcon
                                        aria-hidden
                                        focusable="false"
                                        sx={{ fontSize: 16, color: tokens.textMuted }}
                                    />
                                </Box>
                                <Typography
                                    variant="caption"
                                    sx={{
                                        color: tokens.textMuted,
                                        display: "block",
                                        lineHeight: 1.2,
                                        fontSize: 11.5,
                                    }}
                                >
                                    {tCommon("location.deliveryEta")}
                                </Typography>
                            </Box>
                        </Box>

                        {/* На /menu поиск в шапке скрыт - там свой sticky-поиск с фильтрами */}
                        {pathname !== "/menu" && <SearchBar />}

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
                                sx={{
                                    ...HEADER_ACTION_SLOT_SX,
                                    display: { xs: "none", sm: "flex" },
                                }}
                            >
                                <Suspense fallback={<Box sx={{ width: 40, height: 40 }} />}>
                                    <LanguageSwitcher />
                                </Suspense>
                            </Box>
                            <Box
                                sx={{
                                    ...HEADER_ACTION_SLOT_SX,
                                    display: { xs: "none", sm: "flex" },
                                }}
                            >
                                <ThemeModeToggle />
                            </Box>
                            <Box
                                sx={{
                                    ...HEADER_ACTION_SLOT_SX,
                                    display: { xs: "none", sm: "flex" },
                                }}
                            >
                                <FavoritesHeaderButton />
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

                {/* Mobile search row; на /menu не показываем - там свой sticky-поиск */}
                {pathname !== "/menu" && (
                    <Container
                        maxWidth="lg"
                        sx={{
                            display: { xs: "block", md: "none" },
                            px: 2,
                            pb: 1.25,
                        }}
                    >
                        <SearchBar variant="mobile" />
                    </Container>
                )}
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
