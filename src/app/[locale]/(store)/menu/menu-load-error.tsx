"use client";

import RefreshIcon from "@mui/icons-material/Refresh";
import RestaurantMenuOutlinedIcon from "@mui/icons-material/RestaurantMenuOutlined";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

import { tokens } from "@/shared/ui/theme";

/**
 * Menu catalog failure UI — not an MUI Alert.
 * Alerts were becoming LCP (3s+) when the catalog Suspense resolved to an error
 * and no hero image competed. Reserved minHeight matches the product grid.
 */
export function MenuLoadError() {
    const t = useTranslations("menu");
    const router = useRouter();

    return (
        <Box
            role="alert"
            sx={{
                mt: 2,
                minHeight: { xs: 280, sm: 360 },
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                borderRadius: 3,
                border: `1px solid ${tokens.border}`,
                bgcolor: tokens.surfaceHi,
                px: 3,
                py: 4,
            }}
        >
            <Stack spacing={1.5} alignItems="center" sx={{ maxWidth: 360, textAlign: "center" }}>
                <RestaurantMenuOutlinedIcon
                    sx={{ fontSize: 48, color: tokens.textMuted, opacity: 0.5 }}
                    aria-hidden
                />
                <Typography variant="subtitle1" fontWeight={700}>
                    {t("load_error")}
                </Typography>
                <Button
                    variant="contained"
                    color="primary"
                    size="small"
                    startIcon={<RefreshIcon />}
                    onClick={() => router.refresh()}
                    sx={{ mt: 1, fontWeight: 700, textTransform: "none" }}
                >
                    {t("retry")}
                </Button>
            </Stack>
        </Box>
    );
}
