"use client";

import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import Box from "@mui/material/Box";
import Drawer from "@mui/material/Drawer";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";

import { useCartStore } from "@/features/cart";
import { triggerHaptic } from "@/shared/lib/haptic";
import { AppButton } from "@/shared/ui";

export function WelcomePromoDrawer() {
    const t = useTranslations();
    const [open, setOpen] = useState(false);
    const setAppliedPromoCode = useCartStore((state) => state.setAppliedPromoCode);

    useEffect(() => {
        const hasSeen = localStorage.getItem("hasSeenWelcomePromo");
        if (!hasSeen) {
            // Show after 2 seconds
            const timer = setTimeout(() => {
                setOpen(true);
                localStorage.setItem("hasSeenWelcomePromo", "true");
            }, 2000);
            return () => clearTimeout(timer);
        }
    }, []);

    const handleApply = () => {
        triggerHaptic("success");
        setAppliedPromoCode("WELCOME10");
        setOpen(false);
    };

    return (
        <Drawer
            anchor="bottom"
            open={open}
            onClose={() => setOpen(false)}
            PaperProps={{
                sx: {
                    borderTopLeftRadius: 24,
                    borderTopRightRadius: 24,
                    p: 3,
                    pb: "calc(24px + env(safe-area-inset-bottom))",
                    bgcolor: "background.paper",
                    backgroundImage: "none",
                    maxWidth: 480,
                    margin: "0 auto",
                },
            }}
        >
            <Box
                sx={{
                    width: 36,
                    height: 4,
                    bgcolor: "divider",
                    borderRadius: 2,
                    mx: "auto",
                    mb: 3,
                }}
            />

            <Typography variant="h5" fontWeight={800} sx={{ mb: 1, textAlign: "center" }}>
                {t("home.welcomePromo.title")}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3, textAlign: "center" }}>
                {t("home.welcomePromo.description")}
            </Typography>

            <Stack
                direction="row"
                alignItems="center"
                justifyContent="center"
                spacing={1}
                sx={{
                    bgcolor: "rgba(39, 174, 96, 0.1)",
                    py: 1.5,
                    px: 3,
                    borderRadius: 3,
                    mb: 3,
                    border: "1px dashed rgba(39, 174, 96, 0.4)",
                    mx: "auto",
                }}
            >
                <Typography variant="h6" fontWeight={800} color="#27AE60" sx={{ letterSpacing: 2 }}>
                    WELCOME10
                </Typography>
            </Stack>

            <AppButton
                variant="contained"
                color="primary"
                fullWidth
                size="large"
                onClick={handleApply}
                startIcon={<ContentCopyIcon />}
                sx={{ fontWeight: 700 }}
            >
                {t("home.welcomePromo.apply")}
            </AppButton>
        </Drawer>
    );
}
