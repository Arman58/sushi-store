import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import type { SxProps, Theme } from "@mui/material/styles";
import { useTranslations } from "next-intl";

import { tokens } from "@/shared/ui/theme";

type AITranslateButtonProps = {
    onClick: () => void | Promise<void>;
    loading: boolean;
    disabled?: boolean;
    label?: string;
    sx?: SxProps<Theme>;
};

export function AITranslateButton({
    onClick,
    loading,
    disabled = false,
    label,
    sx,
}: AITranslateButtonProps) {
    const t = useTranslations("admin.aiTranslate");

    return (
        <Button
            variant="outlined"
            size="small"
            onClick={onClick}
            disabled={disabled || loading}
            startIcon={
                loading ? (
                    <CircularProgress size={14} sx={{ color: "inherit" }} />
                ) : (
                    <AutoAwesomeIcon sx={{ fontSize: 14 }} />
                )
            }
            sx={{
                fontWeight: 600,
                borderRadius: 2.5,
                textTransform: "none",
                borderColor: tokens.brandGlow,
                color: "primary.main",
                fontSize: "0.825rem",
                px: 1.75,
                py: 0.5,
                transition: "all 0.2s ease-in-out",
                "&:hover": {
                    borderColor: tokens.brand,
                    bgcolor: tokens.brandDim,
                    transform: "translateY(-1px)",
                    boxShadow: `0 2px 8px ${tokens.brandGlow}`,
                },
                "&:active": {
                    transform: "translateY(0)",
                },
                "&.Mui-disabled": {
                    borderColor: "action.disabledBackground",
                    color: "text.disabled",
                },
                ...sx,
            }}
        >
            {label ?? t("button")}
        </Button>
    );
}
