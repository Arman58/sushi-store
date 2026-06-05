"use client";

import HomeRoundedIcon from "@mui/icons-material/HomeRounded";
import PersonOutlineRoundedIcon from "@mui/icons-material/PersonOutlineRounded";
import RestaurantMenuRoundedIcon from "@mui/icons-material/RestaurantMenuRounded";
import ShoppingBagRoundedIcon from "@mui/icons-material/ShoppingBagRounded";
import Badge from "@mui/material/Badge";
import Box from "@mui/material/Box";
import ButtonBase from "@mui/material/ButtonBase";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { alpha } from "@mui/material/styles";
import { motion } from "framer-motion";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { useEffect, useRef, useState } from "react";

import { useCartStore } from "@/features/cart";
import { tokens } from "./theme";

const fmt = new Intl.NumberFormat("ru-RU");

export function MobileBottomNav() {
    const pathname  = usePathname();
    const openCart  = useCartStore((s) => s.openCart);
    const items     = useCartStore((s) => s.items);
    const addToast  = useCartStore((s) => s.addToast);

    const [cartPulse, setCartPulse] = useState(0);
    const lastAddToastRef = useRef(0);

    useEffect(() => {
        if (!addToast || addToast === lastAddToastRef.current) return;
        lastAddToastRef.current = addToast;
        setCartPulse((n) => n + 1);
    }, [addToast]);

    const totalItems = items.reduce((s, i) => s + i.quantity, 0);
    const cartTotal = items.reduce(
        (s, i) => s + i.calculatedItemPrice * i.quantity,
        0,
    );

    const { status } = useSession();

    const activeKey =
        pathname === "/"
            ? "home"
            : pathname.startsWith("/menu")
              ? "menu"
              : pathname.startsWith("/profile")
                ? "profile"
                : "";

    return (
        <Box
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
                    bgcolor: (theme) => alpha(theme.palette.background.paper, 0.8),
                    backdropFilter: "blur(12px)",
                    WebkitBackdropFilter: "blur(12px)",
                }}
            />

            <Stack direction="row" sx={{ position: "relative", px: 1, py: 0.75 }}>
                {/* Home */}
                <ButtonBase
                    component={Link}
                    href="/"
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
                        Главная
                    </Typography>
                </ButtonBase>

                {/* Menu */}
                <ButtonBase
                    component={Link}
                    href="/menu"
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
                        Меню
                    </Typography>
                </ButtonBase>

                {/* Profile */}
                <ButtonBase
                    component={Link}
                    href="/profile"
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
                        {status === "authenticated" ? "Профиль" : "Войти"}
                    </Typography>
                </ButtonBase>

                {/* Cart — opens drawer */}
                <ButtonBase
                    onClick={openCart}
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
                        key={cartPulse}
                        style={{ display: "inline-flex", lineHeight: 0 }}
                        initial={{ scale: 1 }}
                        animate={
                            cartPulse === 0
                                ? { scale: 1 }
                                : { scale: [1, 1.2, 1] }
                        }
                        transition={
                            cartPulse === 0
                                ? { duration: 0 }
                                : { duration: 0.2, times: [0, 0.4, 1], ease: "easeOut" }
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
                        sx={{
                            fontSize: { xs: 10, sm: 11 },
                            fontWeight: 700,
                            lineHeight: 1,
                            maxWidth: 72,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            fontVariantNumeric: "tabular-nums",
                        }}
                    >
                        {totalItems > 0 ? `${fmt.format(cartTotal)} ֏` : "Корзина"}
                    </Typography>
                </ButtonBase>
            </Stack>
        </Box>
    );
}
