"use client";

import Box from "@mui/material/Box";
import Chip from "@mui/material/Chip";
import Tooltip from "@mui/material/Tooltip";
import { useTranslations } from "next-intl";

import { localizedFillStatus, type StoreLocale } from "@/lib/i18n-utils";

const LOCALE_ORDER: StoreLocale[] = ["hy", "ru", "en"];

type LocalizedStatusChipsProps = {
    value: unknown;
    size?: "small" | "medium";
};

export function LocalizedStatusChips({
    value,
    size = "small",
}: LocalizedStatusChipsProps) {
    const t = useTranslations("admin.aiTranslate");
    const status = localizedFillStatus(value);

    return (
        <Box sx={{ display: "inline-flex", gap: 0.5, flexWrap: "wrap" }}>
            {LOCALE_ORDER.map((locale) => {
                const filled = status[locale];
                return (
                    <Tooltip
                        key={locale}
                        title={
                            filled
                                ? t("localeFilled", { locale: locale.toUpperCase() })
                                : t("localeEmpty", { locale: locale.toUpperCase() })
                        }
                    >
                        <Chip
                            label={locale.toUpperCase()}
                            size={size}
                            variant={filled ? "filled" : "outlined"}
                            sx={{
                                height: 20,
                                fontSize: "0.62rem",
                                fontWeight: 800,
                                opacity: filled ? 1 : 0.55,
                                bgcolor: filled
                                    ? "rgba(39, 174, 96, 0.12)"
                                    : "transparent",
                                color: filled ? "primary.main" : "text.secondary",
                                borderColor: filled
                                    ? "rgba(39, 174, 96, 0.35)"
                                    : "divider",
                            }}
                        />
                    </Tooltip>
                );
            })}
        </Box>
    );
}
