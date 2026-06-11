import { tokens } from "@/shared/ui/theme";

export const checkoutSectionPaperSx = {
    p: { xs: 2, md: 3 },
    borderRadius: 2,
    border: `1px solid ${tokens.border}`,
    bgcolor: "background.paper",
    boxShadow: "none",
    display: "flex",
    flexDirection: "column",
    gap: 2.5,
    minWidth: 0,
    overflow: "visible",
} as const;

export const checkoutFieldProps = {
    size: "small" as const,
    fullWidth: true,
};

export const checkoutInputRadiusSx = {
    width: "100%",
    "& .MuiOutlinedInput-root": {
        borderRadius: `${tokens.radiusInput}px`,
        width: "100%",
    },
    "& .MuiSelect-select": {
        width: "100%",
    },
} as const;
