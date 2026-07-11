"use client";

import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import Button from "@mui/material/Button";

import { Link } from "@/i18n/server";
import { tokens } from "@/shared/ui/theme";

type HeroOrderButtonProps = {
    label: string;
};

export function HeroOrderButton({ label }: HeroOrderButtonProps) {
    return (
        <Button
            component={Link}
            href="/menu"
            variant="contained"
            size="large"
            endIcon={<ArrowForwardIcon sx={{ fontSize: 18 }} />}
            sx={{
                px: 4,
                py: 1.5,
                fontSize: { xs: "0.9rem", sm: "1rem" },
                fontWeight: 800,
                borderRadius: "12px",
                bgcolor: tokens.brand,
                boxShadow: `0 4px 16px ${tokens.brandGlow}`,
                "&:hover": {
                    bgcolor: tokens.brandHi,
                    transform: "translateY(-1px)",
                    boxShadow: `0 6px 22px ${tokens.brandGlow}`,
                },
            }}
        >
            {label}
        </Button>
    );
}
