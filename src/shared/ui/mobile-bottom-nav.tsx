"use client";

import HomeRoundedIcon from "@mui/icons-material/HomeRounded";
import RestaurantMenuRoundedIcon from "@mui/icons-material/RestaurantMenuRounded";
import ShoppingBagRoundedIcon from "@mui/icons-material/ShoppingBagRounded";
import Badge from "@mui/material/Badge";
import Box from "@mui/material/Box";
import ButtonBase from "@mui/material/ButtonBase";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { motion } from "framer-motion";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { useCartStore } from "@/features/cart";
import { tokens } from "./theme";

const fmt = new Intl.NumberFormat("ru-RU");

export function MobileBottomNav() {
    const pathname  = usePathname();
    const openCart  = useCartStore((s) => s.openCart);
    const items     = useCartStore((s) => s.items);

    const totalItems = items.reduce((s, i) => s + i.quantity, 0);
    const cartTotal = items.reduce((s, i) => s + i.price * i.quantity, 0);

    const activeKey =
        pathname === "/" ? "home" : pathname.startsWith("/menu") ? "menu" : "";

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
                    bgcolor: `${tokens.surface}EE`,
                    backdropFilter: "blur(20px)",
                    borderTop: `1px solid ${tokens.border}`,
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
                        color: activeKey === "home" ? tokens.orange : tokens.textMuted,
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
                        color: activeKey === "menu" ? tokens.orange : tokens.textMuted,
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
                        bgcolor: totalItems > 0 ? tokens.orange : "transparent",
                        color: totalItems > 0 ? "#fff" : tokens.textMuted,
                        transition: "all 0.18s ease",
                        "&:hover": { bgcolor: totalItems > 0 ? tokens.orangeHi : tokens.surfaceUp },
                        "&:active": { transform: "scale(0.92)" },
                    }}
                >
                    <motion.div
                        key={totalItems}
                        initial={{ scale: 0.6 }}
                        animate={{ scale: 1 }}
                        transition={{ type: "spring", stiffness: 500, damping: 15 }}
                        style={{ display: "inline-flex", lineHeight: 0 }}
                    >
                        <Badge
                            badgeContent={totalItems}
                            invisible={totalItems === 0}
                            sx={{
                                "& .MuiBadge-badge": {
                                    bgcolor: "#fff",
                                    color: tokens.orange,
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
                        }}
                    >
                        {totalItems > 0 ? `${fmt.format(cartTotal)} ֏` : "Корзина"}
                    </Typography>
                </ButtonBase>
            </Stack>
        </Box>
    );
}
