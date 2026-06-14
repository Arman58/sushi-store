"use client";

import HomeOutlined from "@mui/icons-material/HomeOutlined";
import RefreshOutlined from "@mui/icons-material/RefreshOutlined";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { motion } from "framer-motion";
import type { ReactNode } from "react";

type FatalErrorScreenProps = {
    badge: string;
    heading: string;
    body: string;
    retryLabel: string;
    onRetry: () => void;
    secondaryAction?: ReactNode;
};

export function FatalErrorScreen({
    badge,
    heading,
    body,
    retryLabel,
    onRetry,
    secondaryAction,
}: FatalErrorScreenProps) {
    return (
        <Box
            component="main"
            sx={{
                minHeight: "100vh",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                px: 2,
                py: 6,
                position: "relative",
                overflow: "hidden",
                color: "#F8F6F3",
                background:
                    "radial-gradient(ellipse 80% 60% at 50% -10%, rgba(0,179,65,0.18), transparent 55%), linear-gradient(165deg, #0B0D0C 0%, #17120F 42%, #101412 100%)",
            }}
        >
            <Box
                aria-hidden
                sx={{
                    position: "absolute",
                    inset: 0,
                    opacity: 0.35,
                    backgroundImage:
                        "linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)",
                    backgroundSize: "48px 48px",
                    maskImage: "radial-gradient(circle at center, black 20%, transparent 80%)",
                }}
            />

            <Stack
                component={motion.div}
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
                alignItems="center"
                spacing={3}
                sx={{ position: "relative", zIndex: 1, maxWidth: 520, textAlign: "center" }}
            >
                <Typography
                    component="p"
                    sx={{
                        fontSize: { xs: "4.5rem", sm: "5.5rem" },
                        lineHeight: 1,
                        fontWeight: 900,
                        letterSpacing: "-0.06em",
                        background:
                            "linear-gradient(180deg, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0.35) 100%)",
                        WebkitBackgroundClip: "text",
                        WebkitTextFillColor: "transparent",
                    }}
                >
                    {badge}
                </Typography>

                <Stack spacing={1.25}>
                    <Typography
                        variant="h4"
                        component="h1"
                        sx={{
                            fontWeight: 800,
                            letterSpacing: "-0.03em",
                            fontSize: { xs: "1.75rem", sm: "2rem" },
                        }}
                    >
                        {heading}
                    </Typography>
                    <Typography
                        variant="body1"
                        sx={{
                            color: "rgba(248,246,243,0.72)",
                            fontSize: { xs: "1rem", sm: "1.0625rem" },
                            lineHeight: 1.7,
                        }}
                    >
                        {body}
                    </Typography>
                </Stack>

                <Stack
                    direction={{ xs: "column", sm: "row" }}
                    spacing={1.5}
                    sx={{ pt: 1, width: "100%", justifyContent: "center" }}
                >
                    <Button
                        variant="contained"
                        size="large"
                        startIcon={<RefreshOutlined />}
                        onClick={onRetry}
                        sx={{
                            borderRadius: 999,
                            px: 3.5,
                            py: 1.25,
                            textTransform: "none",
                            fontWeight: 700,
                            bgcolor: "#00B341",
                            boxShadow: "0 12px 32px rgba(0,179,65,0.28)",
                            "&:hover": { bgcolor: "#2BC760" },
                        }}
                    >
                        {retryLabel}
                    </Button>
                    {secondaryAction}
                </Stack>
            </Stack>
        </Box>
    );
}

export function FatalErrorHomeButton({
    href,
    label,
    component = "a",
}: {
    href: string;
    label: string;
    component?: "a" | "button";
}) {
    return (
        <Button
            component={component}
            href={component === "a" ? href : undefined}
            variant="outlined"
            size="large"
            startIcon={<HomeOutlined />}
            sx={{
                borderRadius: 999,
                px: 3.5,
                py: 1.25,
                textTransform: "none",
                fontWeight: 700,
                color: "#F8F6F3",
                borderColor: "rgba(248,246,243,0.28)",
                "&:hover": {
                    borderColor: "rgba(248,246,243,0.5)",
                    bgcolor: "rgba(255,255,255,0.06)",
                },
            }}
        >
            {label}
        </Button>
    );
}
