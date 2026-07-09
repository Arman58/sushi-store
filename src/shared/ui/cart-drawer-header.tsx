"use client";

import CloseIcon from "@mui/icons-material/Close";
import ShoppingBagOutlinedIcon from "@mui/icons-material/ShoppingBagOutlined";
import Box from "@mui/material/Box";
import IconButton from "@mui/material/IconButton";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { AnimatePresence, motion } from "framer-motion";
import { useTranslations } from "next-intl";

import { tokens } from "./theme";

type CartDrawerHeaderProps = {
    count: number;
    onClose: () => void;
};

export function CartDrawerHeader({ count, onClose }: CartDrawerHeaderProps) {
    const t = useTranslations("cart");

    return (
        <Box
            sx={{
                px: { xs: 2.5, sm: 3 },
                py: { xs: 2, sm: 2.5 },
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                borderBottom: "1px solid",
                borderColor: "divider",
                flexShrink: 0,
                bgcolor: "background.paper",
            }}
        >
            <Stack
                direction="row"
                spacing={1.5}
                alignItems="center"
                sx={{ flex: 1, minWidth: 0 }}
            >
                <ShoppingBagOutlinedIcon
                    sx={{ color: tokens.brand, fontSize: 22 }}
                />
                <Typography
                    id="cart-drawer-title"
                    component="h2"
                    variant="h6"
                    fontWeight={700}
                >
                    {t("pageTitle")}
                </Typography>
                {count > 0 && (
                    <motion.div
                        layout
                        key="cart-badge"
                        initial={{ scale: 0.85 }}
                        animate={{ scale: 1 }}
                        transition={{
                            type: "spring",
                            stiffness: 520,
                            damping: 28,
                        }}
                        style={{ display: "inline-flex" }}
                    >
                        <Box
                            sx={{
                                px: 1,
                                py: 0.25,
                                borderRadius: 999,
                                bgcolor: tokens.brandDim,
                                border: `1px solid ${tokens.brand}44`,
                            }}
                        >
                            <AnimatePresence mode="popLayout" initial={false}>
                                <motion.div
                                    key={count}
                                    initial={{ opacity: 0, y: -6 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: 6 }}
                                    transition={{ duration: 0.18 }}
                                    style={{ display: "flex" }}
                                >
                                    <Typography
                                        variant="caption"
                                        fontWeight={700}
                                        sx={{
                                            color: tokens.brand,
                                            fontVariantNumeric: "tabular-nums",
                                        }}
                                    >
                                        {count}
                                    </Typography>
                                </motion.div>
                            </AnimatePresence>
                        </Box>
                    </motion.div>
                )}
            </Stack>
            <IconButton
                onClick={onClose}
                size="small"
                aria-label={t("aria.close")}
                sx={{
                    color: "text.secondary",
                    bgcolor: "background.paper",
                    border: "1px solid",
                    borderColor: "divider",
                    "&:hover": {
                        bgcolor: "action.hover",
                        color: "text.primary",
                        borderColor: "divider",
                    },
                }}
            >
                <CloseIcon fontSize="small" aria-hidden focusable="false" />
            </IconButton>
        </Box>
    );
}
