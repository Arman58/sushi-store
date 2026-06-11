"use client";

import Box from "@mui/material/Box";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";

import { tokens } from "@/shared/ui/theme";

type PaymentCardProps = {
    selected: boolean;
    onSelect: () => void;
    icon: React.ReactNode;
    label: string;
    sublabel: string;
};

export function PaymentCard({
    selected,
    onSelect,
    icon,
    label,
    sublabel,
}: PaymentCardProps) {
    return (
        <Paper
            onClick={onSelect}
            elevation={0}
            role="radio"
            aria-checked={selected}
            tabIndex={0}
            onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") onSelect();
            }}
            sx={{
                flex: 1,
                minWidth: 0,
                p: 2,
                cursor: "pointer",
                border: "1px solid",
                borderColor: selected ? "primary.main" : "divider",
                borderRadius: 2,
                bgcolor: selected ? tokens.brandDim : "background.paper",
                boxShadow: "none",
                transition: "all 0.15s ease",
                display: "flex",
                alignItems: "center",
                gap: 1.5,
                "&:hover": {
                    borderColor: selected ? "primary.main" : tokens.borderHi,
                    bgcolor: selected ? tokens.brandDim : tokens.surfaceHi,
                },
                userSelect: "none",
            }}
        >
            <Box
                sx={{
                    width: 40,
                    height: 40,
                    borderRadius: "50%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    bgcolor: selected ? "primary.main" : tokens.surfaceHi,
                    color: selected ? "primary.contrastText" : "text.secondary",
                    transition: "all 0.15s ease",
                    flexShrink: 0,
                }}
            >
                {icon}
            </Box>
            <Box sx={{ flex: 1, minWidth: 0, overflow: "hidden" }}>
                <Typography
                    variant="body2"
                    fontWeight={700}
                    sx={{
                        lineHeight: 1.2,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                    }}
                >
                    {label}
                </Typography>
                <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{
                        display: "block",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                    }}
                >
                    {sublabel}
                </Typography>
            </Box>
        </Paper>
    );
}
