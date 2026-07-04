import Box from "@mui/material/Box";
import Chip from "@mui/material/Chip";
import { alpha } from "@mui/material/styles";
import Typography from "@mui/material/Typography";
import { getTranslations } from "next-intl/server";

import { tokens } from "@/shared/ui/theme";

import { MenuHeroCtas } from "./menu-hero-ctas";

export async function MenuHeroSection() {
    const t = await getTranslations("menu");

    return (
        <Box
            sx={{
                mb: 4,
                borderRadius: 4,
                overflow: "hidden",
                position: "relative",
                border: "1px solid",
                borderColor: "divider",
                background: `linear-gradient(135deg, ${alpha(tokens.brand, 0.08)}, rgba(var(--ew-surface-rgb), 0.98) 45%, rgba(var(--ew-text-rgb), 0.025))`,
            }}
        >
            <Box
                sx={{
                    position: "absolute",
                    inset: 0,
                    pointerEvents: "none",
                    background: `radial-gradient(circle at 15% 30%, ${alpha(tokens.brand, 0.16)}, transparent 32%), radial-gradient(circle at 85% 20%, ${alpha(tokens.brandHi, 0.12)}, transparent 30%)`,
                    opacity: 0.9,
                }}
            />

            <Box sx={{ px: 2, pt: { xs: 2, sm: 3 }, pb: { xs: 2.5, sm: 4 }, position: "relative" }}>
                <Chip
                    label={t("hero.chip")}
                    size="small"
                    sx={{
                        mb: 1.5,
                        borderRadius: 999,
                        bgcolor: "action.hover",
                        fontWeight: 600,
                    }}
                />
                <Typography
                    component="h1"
                    variant="h4"
                    sx={{
                        fontWeight: 800,
                        color: "text.primary",
                        lineHeight: 1.25,
                        maxWidth: 640,
                        fontSize: { xs: "1.6rem", sm: "2.125rem" },
                    }}
                >
                    {t("hero.title")}
                </Typography>
                <Typography
                    component="p"
                    variant="h6"
                    sx={{
                        fontWeight: 600,
                        color: "text.primary",
                        lineHeight: 1.35,
                        maxWidth: 640,
                        mt: 1,
                        fontSize: { xs: "1rem", sm: "1.125rem" },
                    }}
                >
                    {t("hero.subtitle")}
                </Typography>
                <Typography
                    variant="body1"
                    color="text.secondary"
                    // Мобайл: не съедаем первый экран длинным SEO-текстом
                    sx={{ mt: 0.5, maxWidth: 560, display: { xs: "none", sm: "block" } }}
                >
                    {t("hero.description")}
                </Typography>
                <MenuHeroCtas />
            </Box>
        </Box>
    );
}
