import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Container from "@mui/material/Container";
import Typography from "@mui/material/Typography";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { Link } from "@/i18n/server";
import { NOINDEX_METADATA } from "@/lib/seo/metadata";

export async function generateMetadata(): Promise<Metadata> {
    const t = await getTranslations("metadata.orderSuccess");
    return {
        ...NOINDEX_METADATA,
        title: t("title"),
    };
}

export default async function OrderSuccessPage() {
    const t = await getTranslations("order.success");

    return (
        <Container>
            <Box
                sx={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    minHeight: "60vh",
                    textAlign: "center",
                }}
            >
                <CheckCircleOutlineIcon color="success" sx={{ fontSize: 80 }} />
                <Typography variant="h4" fontWeight={800} sx={{ mt: 2 }}>
                    {t("title")}
                </Typography>
                <Typography color="text.secondary" sx={{ mt: 1.5, maxWidth: 480 }}>
                    {t("body")}
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ mt: 2, maxWidth: 420 }}>
                    {t("hint")}
                </Typography>
                <Link href="/" style={{ textDecoration: "none" }}>
                    <Button
                        variant="contained"
                        color="primary"
                        sx={{ mt: 4, borderRadius: 3, px: 6, textTransform: "none" }}
                    >
                        {t("homeCta")}
                    </Button>
                </Link>
            </Box>
        </Container>
    );
}
