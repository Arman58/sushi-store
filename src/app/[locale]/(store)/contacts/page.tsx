import AccessTimeIcon from "@mui/icons-material/AccessTime";
import LocationOnIcon from "@mui/icons-material/LocationOn";
import PhoneIcon from "@mui/icons-material/Phone";
import RestaurantMenuOutlinedIcon from "@mui/icons-material/RestaurantMenuOutlined";
import Box from "@mui/material/Box";
import Divider from "@mui/material/Divider";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import type { ReactNode } from "react";

import { Link } from "@/i18n/server";
import { buildLocalizedMetadata } from "@/lib/seo/metadata";
import { CONTACT_PHONE, CONTACT_PHONE_DISPLAY } from "@/lib/site-config";
import { PageContainer } from "@/shared/ui/page-container";
import { tokens } from "@/shared/ui/theme";

import { ContactsCallButton } from "./contacts-call-button";

export async function generateMetadata(): Promise<Metadata> {
    const locale = await getLocale();
    const t = await getTranslations("contacts");
    const tMeta = await getTranslations("metadata.contacts");

    return buildLocalizedMetadata({
        locale,
        href: "/contacts",
        title: t("pageTitle"),
        description: tMeta("description"),
    });
}

type ContactRowProps = {
    icon: ReactNode;
    label: string;
    value: ReactNode;
    hint: string;
};

function ContactRow({ icon, label, value, hint }: ContactRowProps) {
    return (
        <Stack direction="row" spacing={2.5} alignItems="flex-start">
            <Box
                sx={{
                    width: 56,
                    height: 56,
                    borderRadius: 3,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                    bgcolor: tokens.brandDim,
                    color: tokens.brand,
                }}
            >
                {icon}
            </Box>
            <Box sx={{ minWidth: 0, pt: 0.25 }}>
                <Typography
                    variant="overline"
                    sx={{
                        color: tokens.textMuted,
                        fontWeight: 700,
                        letterSpacing: 0.08,
                    }}
                >
                    {label}
                </Typography>
                <Box sx={{ mt: 0.5 }}>{value}</Box>
                <Typography
                    variant="body2"
                    sx={{ mt: 1, color: tokens.textSecondary, lineHeight: 1.55 }}
                >
                    {hint}
                </Typography>
            </Box>
        </Stack>
    );
}

export default async function ContactsPage() {
    const t = await getTranslations("contacts");
    const tNav = await getTranslations("nav");
    const tCommon = await getTranslations("common");

    return (
        <Box
            sx={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                minHeight: { xs: "calc(100dvh - 120px)", sm: "calc(100dvh - 160px)" },
                bgcolor: tokens.bg,
            }}
        >
            <PageContainer>
                <Box
                    sx={{
                        display: "flex",
                        justifyContent: "center",
                        py: { xs: 2, md: 4 },
                    }}
                >
                    <Paper
                        elevation={0}
                        sx={{
                            width: "100%",
                            maxWidth: 520,
                            p: { xs: 3, sm: 4.5 },
                            borderRadius: 4,
                            border: "1px solid",
                            borderColor: tokens.border,
                            bgcolor: tokens.surface,
                            boxShadow: `0 12px 40px ${tokens.brandGlow}`,
                        }}
                    >
                        <Stack spacing={1} alignItems="center" textAlign="center" sx={{ mb: 3.5 }}>
                            <Typography
                                component="h1"
                                variant="h4"
                                sx={{
                                    fontWeight: 900,
                                    letterSpacing: -0.5,
                                    color: tokens.textPrimary,
                                }}
                            >
                                {t("pageTitle")}
                            </Typography>
                            <Typography
                                variant="body1"
                                sx={{ color: tokens.textSecondary, maxWidth: 360, lineHeight: 1.6 }}
                            >
                                {t("intro")}
                            </Typography>
                        </Stack>

                        <Stack spacing={3} divider={<Divider flexItem />}>
                            <ContactRow
                                icon={<PhoneIcon sx={{ fontSize: 28 }} />}
                                label={t("phone")}
                                value={
                                    <Typography
                                        component="a"
                                        href={`tel:${CONTACT_PHONE}`}
                                        variant="body1"
                                        sx={{
                                            display: "inline-block",
                                            fontWeight: 800,
                                            color: tokens.textPrimary,
                                            textDecoration: "none",
                                            letterSpacing: -0.3,
                                            "&:hover": { color: tokens.brand },
                                        }}
                                    >
                                        {CONTACT_PHONE_DISPLAY}
                                    </Typography>
                                }
                                hint={t("phoneHint")}
                            />

                            <ContactRow
                                icon={<LocationOnIcon sx={{ fontSize: 28 }} />}
                                label={t("pickupAddress")}
                                value={
                                    <Typography
                                        variant="body1"
                                        sx={{ fontWeight: 800, color: tokens.textPrimary, lineHeight: 1.35 }}
                                    >
                                        {tCommon("address.pickup")}
                                    </Typography>
                                }
                                hint={t("addressHint")}
                            />

                            <ContactRow
                                icon={<AccessTimeIcon sx={{ fontSize: 28 }} />}
                                label={t("hours")}
                                value={
                                    <Typography
                                        variant="body1"
                                        sx={{ fontWeight: 800, color: tokens.textPrimary }}
                                    >
                                        {tCommon("hours.label")}
                                    </Typography>
                                }
                                hint={t("hoursHint")}
                            />
                        </Stack>

                        <ContactsCallButton />

                        <Link href="/menu" style={{ textDecoration: "none", display: "block" }}>
                            <Box
                                sx={{
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    gap: 1,
                                    mt: 1.5,
                                    py: 1.75,
                                    px: 3,
                                    borderRadius: 3,
                                    border: "1px solid",
                                    borderColor: tokens.border,
                                    bgcolor: tokens.surfaceHi,
                                    color: tokens.textPrimary,
                                    fontWeight: 700,
                                    fontSize: "1rem",
                                    transition: "background-color 0.18s ease, transform 0.12s ease",
                                    "&:hover": { bgcolor: tokens.border },
                                    "&:active": { transform: "scale(0.98)" },
                                }}
                            >
                                <RestaurantMenuOutlinedIcon sx={{ fontSize: 20 }} />
                                {tNav("menu")}
                            </Box>
                        </Link>
                    </Paper>
                </Box>
            </PageContainer>
        </Box>
    );
}
