import FavoriteOutlinedIcon from "@mui/icons-material/FavoriteOutlined";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";

import { buildLocalizedMetadata } from "@/lib/seo/metadata";
import { PageContainer } from "@/shared/ui/page-container";
import { tokens } from "@/shared/ui/theme";
import { FavoritesSection } from "@/widgets/favorites";

export async function generateMetadata(): Promise<Metadata> {
    const locale = await getLocale();
    const t = await getTranslations("metadata.favorites");

    return buildLocalizedMetadata({
        locale,
        href: "/favorites",
        title: t("title"),
        description: t("description"),
    });
}

export default async function FavoritesPage() {
    const t = await getTranslations("favorites");

    return (
        <PageContainer>
            <Box
                sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 1.25,
                    mb: { xs: 2.5, sm: 3.5 },
                }}
            >
                <FavoriteOutlinedIcon
                    aria-hidden
                    sx={{ fontSize: { xs: 22, sm: 26 }, color: tokens.brand }}
                />
                <Typography
                    component="h1"
                    sx={{
                        fontWeight: 800,
                        letterSpacing: -0.6,
                        fontSize: { xs: "1.5rem", sm: "1.9rem" },
                        lineHeight: 1.1,
                        color: tokens.textPrimary,
                    }}
                >
                    {t("title")}
                </Typography>
            </Box>

            <FavoritesSection />
        </PageContainer>
    );
}
