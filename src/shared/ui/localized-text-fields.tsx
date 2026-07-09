"use client";

import { Box, Tab, Tabs, TextField } from "@mui/material";
import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";

import { useAdminLocalization } from "@/features/admin/ui/admin-localization-context";
import {
    emptyLocalizedJson,
    type LocalizedJson,
    STORE_LOCALES,
} from "@/lib/i18n-utils";

type LocalizedTextFieldsProps = {
    label: string;
    value: LocalizedJson;
    onChange: (next: LocalizedJson) => void;
    disabled?: boolean;
    multiline?: boolean;
    minRows?: number;
    required?: boolean;
};

export function LocalizedTextFields({
    label,
    value,
    onChange,
    disabled = false,
    multiline = false,
    minRows = 3,
    required = false,
}: LocalizedTextFieldsProps) {
    const t = useTranslations("admin.aiTranslate");
    const tLang = useTranslations("languageSwitcher");
    const localization = useAdminLocalization();
    const [tab, setTab] = useState(1);
    const safeValue = value ?? emptyLocalizedJson();

    const localeTabs = useMemo(
        () =>
            [
                { locale: "hy" as const, label: `🇦🇲 ${tLang("localeHy")}` },
                { locale: "ru" as const, label: `🇷🇺 ${tLang("localeRu")}` },
                { locale: "en" as const, label: `🇬🇧 ${tLang("localeEn")}` },
            ] satisfies {
                locale: (typeof STORE_LOCALES)[number];
                label: string;
            }[],
        [tLang],
    );

    const activeLocale =
        localization?.activeLocale ??
        (localeTabs[tab]?.locale ?? "ru");
    const isSharedMode = Boolean(localization);
    const isSourceLocale = activeLocale === "ru";
    const fieldRevision = localization?.translationRevision ?? 0;

    const localeLabel =
        activeLocale === "hy"
            ? tLang("localeHy")
            : activeLocale === "ru"
              ? tLang("localeRu")
              : tLang("localeEn");

    return (
        <Box>
            {!isSharedMode && (
                <Tabs
                    value={tab}
                    onChange={(_, next) => setTab(next)}
                    variant="fullWidth"
                    sx={{ mb: 1, minHeight: 40 }}
                >
                    {localeTabs.map((item) => (
                        <Tab
                            key={item.locale}
                            label={item.label}
                            disabled={disabled}
                            sx={{ minHeight: 40, py: 0.5, fontSize: "0.8rem" }}
                        />
                    ))}
                </Tabs>
            )}
            <TextField
                key={`${activeLocale}-${fieldRevision}`}
                fullWidth
                required={required && activeLocale === "hy"}
                label={
                    isSharedMode
                        ? `${label} · ${localeLabel}`
                        : `${label} (${activeLocale})`
                }
                value={safeValue[activeLocale] ?? ""}
                onChange={(e) =>
                    onChange({
                        ...safeValue,
                        [activeLocale]: e.target.value,
                    })
                }
                disabled={disabled}
                multiline={multiline}
                minRows={multiline ? minRows : undefined}
                helperText={
                    isSharedMode && isSourceLocale
                        ? t("sourceFieldHint")
                        : isSharedMode && !isSourceLocale
                          ? t("targetFieldHint")
                          : undefined
                }
                FormHelperTextProps={{
                    sx: {
                        mx: 0,
                        mt: 0.75,
                        fontWeight: isSourceLocale ? 600 : 400,
                        color: isSourceLocale ? "primary.main" : "text.secondary",
                    },
                }}
                slotProps={{
                    input: {
                        sx: isSourceLocale
                            ? {
                                  bgcolor: "rgba(39, 174, 96, 0.04)",
                              }
                            : undefined,
                    },
                }}
            />
        </Box>
    );
}
