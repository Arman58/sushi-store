"use client";

import SearchOff from "@mui/icons-material/SearchOff";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { useTranslations } from "next-intl";

import { Link } from "@/i18n/server";

export default function LocaleNotFound() {
    const t = useTranslations("notFound");

    return (
        <Box
            sx={{
                display: "flex",
                minHeight: "60vh",
                justifyContent: "center",
                alignItems: "center",
                px: 2,
            }}
        >
            <Stack alignItems="center" spacing={2} maxWidth={440} textAlign="center">
                <SearchOff color="disabled" sx={{ fontSize: 72 }} />
                <Typography
                    variant="h3"
                    component="p"
                    fontWeight={900}
                    color="text.disabled"
                    sx={{ lineHeight: 1 }}
                >
                    {t("title")}
                </Typography>
                <Typography variant="h5" component="h1" fontWeight={700}>
                    {t("heading")}
                </Typography>
                <Typography variant="body1" color="text.secondary">
                    {t("body")}
                </Typography>
                <Stack
                    direction={{ xs: "column", sm: "row" }}
                    spacing={1.5}
                    sx={{ mt: 2 }}
                >
                    <Link href="/menu" style={{ textDecoration: "none" }}>
                        <Button
                            variant="contained"
                            color="primary"
                            sx={{ borderRadius: 3, px: 4, textTransform: "none" }}
                        >
                            {t("menuCta")}
                        </Button>
                    </Link>
                    <Link href="/" style={{ textDecoration: "none" }}>
                        <Button
                            variant="outlined"
                            sx={{ borderRadius: 3, px: 4, textTransform: "none" }}
                        >
                            {t("homeCta")}
                        </Button>
                    </Link>
                </Stack>
            </Stack>
        </Box>
    );
}
