import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import Box from "@mui/material/Box";
import Container from "@mui/material/Container";
import Typography from "@mui/material/Typography";
import { getLocale, getTranslations } from "next-intl/server";

import { Link } from "@/i18n/server";
import { tokens } from "@/shared/ui/theme";
import { fetchStorefrontCategories } from "@/widgets/category-pills/lib/fetch-storefront-categories";
import { CategoryPillsList } from "@/widgets/category-pills/ui/CategoryPillsList";

const sectionContainerSx = {
    maxWidth: "lg",
    px: { xs: 2, md: 6 },
} as const;

export async function HomeCategoryPillsSection() {
    const locale = await getLocale();
    const t = await getTranslations("home");
    const categories = await fetchStorefrontCategories(locale);

    if (categories.length === 0) {
        return null;
    }

    return (
        <Container
            component="section"
            sx={{
                ...sectionContainerSx,
                mt: { xs: 3, md: 5 },
            }}
        >
            <Box
                sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 1,
                    mb: { xs: 1.5, sm: 2 },
                }}
            >
                <Typography
                    component="h2"
                    variant="h5"
                    fontWeight={800}
                    sx={{
                        letterSpacing: -0.5,
                        fontSize: { xs: "1.25rem", sm: "1.5rem" },
                        lineHeight: 1.1,
                        color: tokens.textPrimary,
                    }}
                >
                    {t("categories")}
                </Typography>

                <Link href="/menu" style={{ textDecoration: "none", flexShrink: 0 }}>
                    <Box
                        sx={{
                            display: "flex",
                            alignItems: "center",
                            gap: 0.75,
                            color: tokens.brand,
                            fontSize: 14,
                            fontWeight: 700,
                            transition: "gap 0.18s ease, color 0.18s ease",
                            "&:hover": { gap: 1.1, color: "#1E8449" },
                        }}
                    >
                        {t("seeAll")}
                        <ArrowForwardIcon sx={{ fontSize: 16 }} />
                    </Box>
                </Link>
            </Box>

            <CategoryPillsList categories={categories} mode="link" />
        </Container>
    );
}
