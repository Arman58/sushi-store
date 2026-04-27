"use client";

import Typography from "@mui/material/Typography";

type SectionTitleProps = {
    children: string;
};

export function SectionTitle({ children }: SectionTitleProps) {
    return (
        <Typography
            variant="h4"
            component="h2"
            sx={{ mb: 3, fontWeight: 800, letterSpacing: -0.5, lineHeight: 1.1 }}
        >
            {children}
        </Typography>
    );
}
