import Container from "@mui/material/Container";
import Typography from "@mui/material/Typography";
import { getTranslations } from "next-intl/server";

export async function SeoText() {
    const t = await getTranslations("home");

    return (
        <Container
            component="section"
            maxWidth="lg"
            aria-labelledby="home-seo-text-title"
            sx={{
                px: { xs: 2, md: 6 },
                py: { xs: 3, md: 4 },
            }}
        >
            <Typography
                id="home-seo-text-title"
                component="h2"
                sx={{
                    fontSize: 20,
                    fontWeight: 600,
                    color: "text.primary",
                    lineHeight: 1.35,
                    mb: 1.5,
                }}
            >
                {t("seo_text_title")}
            </Typography>
            <Typography
                component="p"
                sx={{
                    color: "text.secondary",
                    fontSize: { xs: 14, md: 16 },
                    lineHeight: 1.6,
                    whiteSpace: "normal",
                    wordBreak: "break-word",
                }}
            >
                {t("seo_text_body")}
            </Typography>
        </Container>
    );
}
