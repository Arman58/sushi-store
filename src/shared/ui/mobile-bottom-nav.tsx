"use client";

import FavoriteBorderRoundedIcon from "@mui/icons-material/FavoriteBorderRounded";
import FavoriteRoundedIcon from "@mui/icons-material/FavoriteRounded";
import HomeRoundedIcon from "@mui/icons-material/HomeRounded";
import PersonOutlineRoundedIcon from "@mui/icons-material/PersonOutlineRounded";
import RestaurantMenuRoundedIcon from "@mui/icons-material/RestaurantMenuRounded";
import ShoppingBagRoundedIcon from "@mui/icons-material/ShoppingBagRounded";
import Badge from "@mui/material/Badge";
import Box from "@mui/material/Box";
import ButtonBase from "@mui/material/ButtonBase";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { motion } from "framer-motion";
import { useSession } from "next-auth/react";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState, startTransition } from "react";
import { useShallow } from "zustand/react/shallow";

import { useCartStore } from "@/features/cart";
import { useFavorites } from "@/features/favorites";
import { Link, usePathname } from "@/i18n/server";
import { triggerHaptic } from "@/shared/lib/haptic";
import { useScrollHide } from "@/shared/lib/use-scroll-hide";

import { tokens } from "./theme";

const fmt = new Intl.NumberFormat("ru-RU");

export function MobileBottomNav() {
    const t = useTranslations("nav");
    const tAuth = useTranslations("auth");
    const pathname  = usePathname();
    const { openCart, cartTotalCount, cartTotalPrice, addToast } = useCartStore(
        useShallow((s) => ({
            openCart: s.openCart,
            cartTotalCount: s.cartTotalCount,
            cartTotalPrice: s.cartTotalPrice,
            addToast: s.addToast,
        })),
    );

    const [cartPulse, setCartPulse] = useState(0);
    const lastAddToastRef = useRef(0);

    useEffect(() => {
        if (!addToast || addToast === lastAddToastRef.current) return;
        lastAddToastRef.current = addToast;
        queueMicrotask(() => setCartPulse((n) => n + 1));
        triggerHaptic("success");
    }, [addToast]);

    const totalItems = cartTotalCount;
    const cartTotal = cartTotalPrice;

    const { status } = useSession();
    const { ids: favoriteIds } = useFavorites();

    const activeKey =
        pathname === "/"
            ? "home"
            : pathname.startsWith("/menu")
              ? "menu"
              : pathname.startsWith("/favorites")
                ? "favorites"
                : pathname.startsWith("/profile")
                  ? "profile"
                  : "";
    const hidden = useScrollHide(150);

    return (
        <Box
            component={motion.div}
            variants={{
                visible: { y: 0 },
                hidden: { y: "150%" }
            }}
            animate={hidden ? "hidden" : "visible"}
            transition={{ duration: 0.35, ease: "easeInOut" }}
            sx={{
                position: "fixed",
                left: 0,
                right: 0,
                bottom: 0,
                zIndex: 1200,
                display: { xs: "block", sm: "none" },
                pb: "calc(16px + env(safe-area-inset-bottom))",
            }}
        >
            {/* Blur backdrop */}
            <Box
                sx={{
                    position: "absolute",
                    inset: 0,
                    // rgba от CSS-переменной - корректно адаптируется к dark
                    bgcolor: "rgba(var(--ew-surface-rgb), 0.75)",
                    backdropFilter: "saturate(180%) blur(20px)",
                    WebkitBackdropFilter: "saturate(180%) blur(20px)",
                }}
            />

            <Stack direction="row" sx={{ position: "relative", px: 1, py: 0.75, minWidth: 0 }}>
                {/* Home */}
                <ButtonBase
                    component={Link}
                    href="/"
                    prefetch={false}
                    sx={{
                        flex: 1,
                        flexDirection: "column",
                        alignItems: "center",
                        gap: 0.3,
                        minHeight: 48,
                        py: 1,
                        borderRadius: 2,
                        color: activeKey === "home" ? tokens.brand : tokens.textMuted,
                        transition: "all 0.15s",
                        "&:active": { transform: "scale(0.92)" },
                    }}
                >
                    <HomeRoundedIcon fontSize="small" />
                    <Typography
                        variant="caption"
                        sx={{
                            fontSize: { xs: 10, sm: 11 },
                            fontWeight: activeKey === "home" ? 700 : 500,
                            lineHeight: 1,
                        }}
                    >
                        {t("home")}
                    </Typography>
                </ButtonBase>

                {/* Menu */}
                <ButtonBase
                    component={Link}
                    href="/menu"
                    prefetch={false}
                    sx={{
                        flex: 1,
                        flexDirection: "column",
                        alignItems: "center",
                        gap: 0.3,
                        minHeight: 48,
                        py: 1,
                        borderRadius: 2,
                        color: activeKey === "menu" ? tokens.brand : tokens.textMuted,
                        transition: "all 0.15s",
                        "&:active": { transform: "scale(0.92)" },
                    }}
                >
                    <RestaurantMenuRoundedIcon fontSize="small" />
                    <Typography
                        variant="caption"
                        sx={{
                            fontSize: { xs: 10, sm: 11 },
                            fontWeight: activeKey === "menu" ? 700 : 500,
                            lineHeight: 1,
                        }}
                    >
                        {t("menu")}
                    </Typography>
                </ButtonBase>

                {/* Favorites */}
                <ButtonBase
                    component={Link}
                    href="/favorites"
                    prefetch={false}
                    sx={{
                        flex: 1,
                        flexDirection: "column",
                        alignItems: "center",
                        gap: 0.3,
                        minHeight: 48,
                        py: 1,
                        borderRadius: 2,
                        color:
                            activeKey === "favorites"
                                ? tokens.brand
                                : tokens.textMuted,
                        transition: "all 0.15s",
                        "&:active": { transform: "scale(0.92)" },
                    }}
                >
                    <Badge
                        badgeContent={favoriteIds.length}
                        invisible={favoriteIds.length === 0}
                        sx={{
                            "& .MuiBadge-badge": {
                                bgcolor: "error.main",
                                color: "error.contrastText",
                                fontWeight: 800,
                                fontSize: 9,
                                minWidth: 15,
                                height: 15,
                                padding: "0 3px",
                            },
                        }}
                    >
                        {activeKey === "favorites" ? (
                            <FavoriteRoundedIcon fontSize="small" />
                        ) : (
                            <FavoriteBorderRoundedIcon fontSize="small" />
                        )}
                    </Badge>
                    <Typography
                        variant="caption"
                        sx={{
                            fontSize: { xs: 10, sm: 11 },
                            fontWeight: activeKey === "favorites" ? 700 : 500,
                            lineHeight: 1,
                        }}
                    >
                        {t("favorites")}
                    </Typography>
                </ButtonBase>

                {/* Profile */}
                <ButtonBase
                    component={Link}
                    href="/profile"
                    prefetch={false}
                    sx={{
                        flex: 1,
                        flexDirection: "column",
                        alignItems: "center",
                        gap: 0.3,
                        minHeight: 48,
                        py: 1,
                        borderRadius: 2,
                        color:
                            activeKey === "profile"
                                ? tokens.brand
                                : tokens.textMuted,
                        transition: "all 0.15s",
                        "&:active": { transform: "scale(0.92)" },
                    }}
                >
                    <PersonOutlineRoundedIcon fontSize="small" />
                    <Typography
                        variant="caption"
                        sx={{
                            fontSize: { xs: 10, sm: 11 },
                            fontWeight: activeKey === "profile" ? 700 : 500,
                            lineHeight: 1,
                        }}
                    >
                        {status === "authenticated" ? t("profile") : tAuth("login")}
                    </Typography>
                </ButtonBase>

                {/* Cart - opens drawer */}
                <ButtonBase
                    onClick={() => startTransition(() => openCart())}
                    sx={{
                        flex: 1,
                        flexDirection: "column",
                        alignItems: "center",
                        gap: 0.3,
                        minHeight: 48,
                        py: 1,
                        borderRadius: 2,
                        bgcolor: totalItems > 0 ? tokens.brand : "transparent",
                        color:
                            totalItems > 0 ? "primary.contrastText" : tokens.textMuted,
                        transition: "all 0.18s ease",
                        "&:hover": {
                            bgcolor:
                                totalItems > 0 ? tokens.brandHi : "action.hover",
                        },
                        "&:active": { transform: "scale(0.92)" },
                    }}
                >
                    <motion.div
                        key={`cart-pulse-${cartPulse}`}
                        style={{ display: "inline-flex", lineHeight: 0 }}
                        initial={{ scale: 1 }}
                        animate={
                            cartPulse === 0
                                ? { scale: 1 }
                                : { scale: [1, 1.3, 0.9, 1.05, 1] }
                        }
                        transition={
                            cartPulse === 0
                                ? { duration: 0 }
                                : { duration: 0.35, ease: "easeInOut", times: [0, 0.2, 0.5, 0.8, 1] }
                        }
                    >
                        <Badge
                            badgeContent={totalItems}
                            invisible={totalItems === 0}
                            sx={{
                                "& .MuiBadge-badge": {
                                    bgcolor: "background.paper",
                                    color: "primary.main",
                                    fontWeight: 800,
                                    fontSize: 9,
                                    minWidth: 16,
                                    height: 16,
                                    padding: "0 3px",
                                },
                            }}
                        >
                            <ShoppingBagRoundedIcon fontSize="small" />
                        </Badge>
                    </motion.div>
                    <Typography
                        variant="caption"
                        noWrap
                        component={motion.span}
                        key={`cart-total-${cartTotal}`}
                        initial={{ opacity: 0.75 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.12 }}
                        sx={{
                            fontSize: { xs: 10, sm: 11 },
                            fontWeight: 700,
                            lineHeight: 1,
                            maxWidth: 72,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            fontVariantNumeric: "tabular-nums",
                            display: "block",
                        }}
                    >
                        {totalItems > 0 ? `${fmt.format(cartTotal)} ֏` : t("cart")}
                    </Typography>
                </ButtonBase>
            </Stack>
        </Box>
    );
}
