"use client";

import FilterListIcon from "@mui/icons-material/FilterList";
import Badge from "@mui/material/Badge";
import { useTranslations } from "next-intl";

import { AppButton } from "@/shared/ui";

type FilterTriggerButtonProps = {
    onClick: () => void;
    hasActiveFilters: boolean;
};

export function FilterTriggerButton({
    onClick,
    hasActiveFilters,
}: FilterTriggerButtonProps) {
    const t = useTranslations("menu");

    return (
        <Badge
            variant="dot"
            color="primary"
            invisible={!hasActiveFilters}
            overlap="circular"
            anchorOrigin={{ vertical: "top", horizontal: "right" }}
        >
            <AppButton
                variant="outlined"
                onClick={onClick}
                startIcon={<FilterListIcon fontSize="small" />}
                sx={{
                    flexShrink: 0,
                    whiteSpace: "nowrap",
                    minHeight: 44,
                    px: 2,
                }}
            >
                {t("filters")}
            </AppButton>
        </Badge>
    );
}
