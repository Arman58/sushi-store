"use client";

import DeliveryDiningOutlinedIcon from "@mui/icons-material/DeliveryDiningOutlined";
import FavoriteBorderOutlinedIcon from "@mui/icons-material/FavoriteBorderOutlined";
import ShoppingCartOutlinedIcon from "@mui/icons-material/ShoppingCartOutlined";
import AppBar from "@mui/material/AppBar";
import Box from "@mui/material/Box";
import ButtonBase from "@mui/material/ButtonBase";
import Container from "@mui/material/Container";
import Toolbar from "@mui/material/Toolbar";
import Typography from "@mui/material/Typography";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { startTransition, Suspense, useEffect, useRef, useState } from "react";
import { useShallow } from "zustand/react/shallow";

import { LoginButton } from "@/features/auth";
import { useCartStore } from "@/features/cart";
import { useFavorites } from "@/features/favorites";
import { Link, usePathname } from "@/i18n/server";
import { SITE_LOGO_PATH } from "@/lib/site-config";

import { HeaderEta } from "./header-eta";
import { HeaderSearchBar } from "./header-search-bar";
import LanguageSwitcher from "./LanguageSwitcher";
import { MobileNavDrawer } from "./mobile-nav-drawer";
import { PwaNavArrows } from "./pwa-nav-arrows";
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
                        bgcolor: "error.main",
                        color: "error.contrastText",
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

function CartHeaderButton() {
    const pathname = usePathname();
    const tNav = useTranslations("nav");
    const tCommon = useTranslations("common");
    const { openCart, cartTotalCount, cartTotalPrice, addToast } = useCartStore(
        useShallow((s) => ({
            openCart: s.openCart,
            cartTotalCount: s.cartTotalCount,
            cartTotalPrice: s.cartTotalPrice,
            addToast: s.addToast,
        })),
    );
    const isCheckoutPage = pathname?.startsWith("/checkout") ?? false;

    const [cartIconPulse, setCartIconPulse] = useState(false);
    const lastAddToastRef = useRef(0);

    const count = cartTotalCount;
    const total = cartTotalPrice;

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
                startTransition(() => openCart());
            }}
            onPointerEnter={() => {
                void import("./cart-drawer");
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
                            color: "primary.contrastText",
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

type StoreHeaderProps = {
    onOpenSearch: () => void;
};

export function StoreHeader({ onOpenSearch }: StoreHeaderProps) {
    const pathname = usePathname();
    const tCommon = useTranslations("common");
    const hideHeaderSearch =
        pathname === "/menu" || pathname.startsWith("/menu/c/");

    return (
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
                            gap: { xs: 0.75, sm: 2 },
                            minWidth: 0,
                            width: "100%",
                            px: { xs: 1.5, sm: 3 },
                            overflow: "visible",
                        }}
                    >
                        <PwaNavArrows />

                        <Box
                            component={Link}
                            href="/"
                            sx={{
                                display: "flex",
                                alignItems: "center",
                                gap: { xs: 1, sm: 1.25 },
                                textDecoration: "none",
                                minWidth: 0,
                                flex: "0 1 auto",
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
                                }}
                            >
                                <Image
                                    src={SITE_LOGO_PATH}
                                    alt={tCommon("logoAlt")}
                                    width={36}
                                    height={36}
                                    style={{ objectFit: "cover" }}
                                />
                            </Box>
                            <Typography
                                component="span"
                                sx={{
                                    fontWeight: 800,
                                    fontSize: { xs: "0.95rem", sm: "1.05rem" },
                                    color: "text.primary",
                                    letterSpacing: "-0.02em",
                                    whiteSpace: "nowrap",
                                    overflow: "hidden",
                                    textOverflow: "ellipsis",
                                }}
                            >
                                {tCommon("brandName")}
                            </Typography>
                        </Box>

                        <Box
                            sx={{
                                display: { xs: "none", sm: "flex" },
                                alignItems: "center",
                                gap: 0.75,
                                minWidth: 0,
                                flexShrink: 1,
                            }}
                        >
                            <DeliveryDiningOutlinedIcon
                                sx={{
                                    fontSize: { xs: 22, sm: 22 },
                                    color: tokens.brand,
                                }}
                            />
                            <HeaderEta />
                        </Box>

                        {!hideHeaderSearch && (
                            <HeaderSearchBar onOpen={onOpenSearch} />
                        )}

                        <Box
                            sx={{
                                display: "flex",
                                alignItems: "center",
                                gap: { xs: 0.25, sm: 0.5 },
                                flexShrink: 0,
                                ml: "auto",
                            }}
                        >
                            <Box sx={HEADER_ACTION_SLOT_SX}>
                                <Suspense
                                    fallback={<Box sx={{ width: 40, height: 40 }} />}
                                >
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

                {!hideHeaderSearch && (
                    <Container
                        maxWidth="lg"
                        sx={{
                            display: { xs: "block", md: "none" },
                            px: 2,
                            pb: 1.25,
                        }}
                    >
                        <HeaderSearchBar
                            variant="mobile"
                            onOpen={onOpenSearch}
                        />
                    </Container>
                )}
            </AppBar>
        </Box>
    );
}
