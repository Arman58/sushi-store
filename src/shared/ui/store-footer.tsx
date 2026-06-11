"use client";

import Box from "@mui/material/Box";
import Container from "@mui/material/Container";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { useTranslations } from "next-intl";

import { Link } from "@/i18n/server";
import {
    CONTACT_PHONE,
    CONTACT_PHONE_DISPLAY,
    SITE_NAME,
} from "@/lib/site-config";

import { tokens } from "./theme";

const footerLinkSx = {
    color: tokens.textSecondary,
    textDecoration: "none",
    fontSize: 14,
    fontWeight: 500,
    transition: "color 0.15s",
    "&:hover": { color: tokens.textPrimary },
} as const;

const FOOTER_LINKS = [
    { href: "/contacts", key: "contacts" },
    { href: "/menu", key: "menu" },
    { href: "/offer", key: "offer" },
    { href: "/privacy", key: "privacy" },
] as const;

export function StoreFooter() {
    const t = useTranslations("footer");
    const tCommon = useTranslations("common");

    return (
        <Box
            component="footer"
            sx={{
                mt: "auto",
                borderTop: "1px solid",
                borderColor: "divider",
                bgcolor: "background.paper",
                py: { xs: 4, sm: 5 },
            }}
        >
            <Container maxWidth="lg" sx={{ px: { xs: 2, sm: 3 } }}>
                <Stack
                    direction={{ xs: "column", md: "row" }}
                    spacing={{ xs: 3, md: 6 }}
                    justifyContent="space-between"
                >
                    <Box>
                        <Typography variant="subtitle1" fontWeight={800} sx={{ mb: 1 }}>
                            {SITE_NAME}
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 320 }}>
                            {t("tagline")}
                        </Typography>
                    </Box>

                    <Box component="nav" aria-label={t("aria.contactsNav")}>
                        <Typography variant="overline" color="text.secondary" sx={{ display: "block", mb: 1 }}>
                            {t("contactsHeading")}
                        </Typography>
                        <Stack spacing={0.75}>
                            <Typography
                                component="a"
                                href={`tel:${CONTACT_PHONE}`}
                                variant="body2"
                                fontWeight={700}
                                sx={{ ...footerLinkSx, color: tokens.textPrimary, fontSize: 16 }}
                            >
                                {CONTACT_PHONE_DISPLAY}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                {tCommon("address.full")}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                {tCommon("hours.label")}
                            </Typography>
                        </Stack>
                    </Box>

                    <Box component="nav" aria-label={t("aria.legalNav")}>
                        <Typography variant="overline" color="text.secondary" sx={{ display: "block", mb: 1 }}>
                            {t("infoHeading")}
                        </Typography>
                        <Stack spacing={0.75}>
                            {FOOTER_LINKS.map(({ href, key }) => (
                                <Typography
                                    key={href}
                                    component={Link}
                                    href={href}
                                    variant="body2"
                                    sx={footerLinkSx}
                                >
                                    {t(`links.${key}`)}
                                </Typography>
                            ))}
                        </Stack>
                    </Box>
                </Stack>

                <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{ display: "block", mt: 3 }}
                >
                    {t("copyright", { year: new Date().getFullYear(), site: SITE_NAME })}
                </Typography>
            </Container>
        </Box>
    );
}
