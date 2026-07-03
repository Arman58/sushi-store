"use client";

import RocketLaunchOutlinedIcon from "@mui/icons-material/RocketLaunchOutlined";
import SendOutlinedIcon from "@mui/icons-material/SendOutlined";
import SetMealOutlinedIcon from "@mui/icons-material/SetMealOutlined";
import VerifiedOutlinedIcon from "@mui/icons-material/VerifiedOutlined";
import Box from "@mui/material/Box";
import Grid from "@mui/material/Grid";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import { useTranslations } from "next-intl";
import { useMemo } from "react";

import { tokens } from "@/shared/ui/theme";

type FeatureItem = {
    id: string;
    icon: typeof RocketLaunchOutlinedIcon;
    titleKey: string;
    descKey: string;
};

const FEATURES: FeatureItem[] = [
    {
        id: "fast",
        icon: RocketLaunchOutlinedIcon,
        titleKey: "feature_fast_title",
        descKey: "feature_fast_desc",
    },
    {
        id: "big",
        icon: SetMealOutlinedIcon,
        titleKey: "feature_big_title",
        descKey: "feature_big_desc",
    },
    {
        id: "quality",
        icon: VerifiedOutlinedIcon,
        titleKey: "feature_quality_title",
        descKey: "feature_quality_desc",
    },
    {
        id: "support",
        icon: SendOutlinedIcon,
        titleKey: "feature_support_title",
        descKey: "feature_support_desc",
    },
];

export function FeaturesBlock() {
    const t = useTranslations("home");

    const items = useMemo(() => FEATURES, []);

    return (
        <Grid container spacing={{ xs: 1, md: 2 }}>
            {items.map(({ id, icon: Icon, titleKey, descKey }) => (
                <Grid key={id} size={{ xs: 6, md: 3 }}>
                    <Paper
                        elevation={0}
                        sx={{
                            height: "100%",
                            minHeight: { xs: 96, md: 160 },
                            p: { xs: 1.5, md: 2.5 },
                            borderRadius: { xs: 2, md: 3 },
                            border: { xs: "none", md: "1px solid" },
                            borderColor: tokens.border,
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            justifyContent: "center",
                            textAlign: "center",
                            gap: { xs: 0.75, md: 1.25 },
                            bgcolor: { xs: tokens.surfaceHi, md: tokens.surface },
                            transition:
                                "border-color 0.2s ease, transform 0.2s ease, background-color 0.2s ease",
                            "&:hover": {
                                borderColor: { xs: "transparent", md: tokens.borderHi },
                                bgcolor: { xs: tokens.surfaceHi, md: tokens.surface },
                                transform: { xs: "none", md: "translateY(-2px)" },
                            },
                        }}
                    >
                        <Box
                            sx={{
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                width: { xs: 40, md: 48 },
                                height: { xs: 40, md: 48 },
                                borderRadius: 2,
                                bgcolor: tokens.brandDim,
                                flexShrink: 0,
                            }}
                        >
                            <Icon
                                sx={{
                                    fontSize: { xs: 26, md: 28 },
                                    color: "primary.main",
                                }}
                            />
                        </Box>

                        <Typography
                            variant="subtitle2"
                            sx={{
                                fontWeight: 700,
                                color: "text.primary",
                                lineHeight: 1.25,
                                fontSize: { xs: "0.72rem", sm: "0.8125rem", md: "0.875rem" },
                            }}
                        >
                            {t(titleKey)}
                        </Typography>

                        <Typography
                            variant="body2"
                            color="text.secondary"
                            sx={{
                                display: { xs: "none", md: "block" },
                                lineHeight: 1.45,
                                maxWidth: 220,
                            }}
                        >
                            {t(descKey)}
                        </Typography>
                    </Paper>
                </Grid>
            ))}
        </Grid>
    );
}
