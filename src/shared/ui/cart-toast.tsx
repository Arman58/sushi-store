"use client";

import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import Box from "@mui/material/Box";
import Snackbar from "@mui/material/Snackbar";
import Typography from "@mui/material/Typography";
import { useState } from "react";

import { useCartStore } from "@/features/cart";
import { tokens } from "./theme";

export function CartToast() {
    const lastAddedTitle = useCartStore((s) => s.lastAddedTitle);
    const lastAddedAt    = useCartStore((s) => s.lastAddedAt);

    const [dismissedAt, setDismissedAt] = useState<number | null>(null);

    const open =
        Boolean(lastAddedAt) && (!dismissedAt || dismissedAt !== lastAddedAt);

    return (
        <Snackbar
            open={open}
            autoHideDuration={2_000}
            onClose={() => setDismissedAt(lastAddedAt)}
            anchorOrigin={{ vertical: "top", horizontal: "right" }}
            sx={{
                top: {
                    xs: "calc(64px + env(safe-area-inset-top, 0px))",
                    sm: 72,
                },
                right: 16,
            }}
        >
            <Box
                sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 1.25,
                    px: 2.5,
                    py: 1.5,
                    borderRadius: 2.5,
                    bgcolor: tokens.surfaceHi,
                    border: `1px solid ${tokens.orange}44`,
                    boxShadow: `0 8px 32px rgba(0,0,0,0.6), 0 0 0 1px ${tokens.border}`,
                    backdropFilter: "blur(16px)",
                    minWidth: 240,
                }}
            >
                <Box
                    sx={{
                        width: 32,
                        height: 32,
                        borderRadius: "50%",
                        bgcolor: tokens.orangeDim,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                    }}
                >
                    <CheckCircleOutlineIcon sx={{ fontSize: 18, color: tokens.orange }} />
                </Box>
                <Box>
                    <Typography variant="body2" fontWeight={700} sx={{ lineHeight: 1.2 }}>
                        Добавлено в корзину
                    </Typography>
                    {lastAddedTitle && (
                        <Typography
                            variant="caption"
                            sx={{ color: tokens.textSecondary, display: "block", lineHeight: 1.3 }}
                        >
                            {lastAddedTitle}
                        </Typography>
                    )}
                </Box>
            </Box>
        </Snackbar>
    );
}
