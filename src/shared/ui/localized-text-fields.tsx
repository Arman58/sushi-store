"use client";

import { Box, Tab, Tabs, TextField } from "@mui/material";
import { useState } from "react";

import {
    emptyLocalizedJson,
    type LocalizedJson,
    STORE_LOCALES,
} from "@/lib/i18n-utils";

const LOCALE_TABS: { locale: (typeof STORE_LOCALES)[number]; label: string }[] = [
    { locale: "hy", label: "🇦🇲 Հայերեն" },
    { locale: "ru", label: "🇷🇺 Русский" },
    { locale: "en", label: "🇬🇧 English" },
];

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
    const [tab, setTab] = useState(0);
    const safeValue = value ?? emptyLocalizedJson();
    const activeLocale = LOCALE_TABS[tab]?.locale ?? "hy";

    return (
        <Box>
            <Tabs
                value={tab}
                onChange={(_, next) => setTab(next)}
                variant="fullWidth"
                sx={{ mb: 1, minHeight: 40 }}
            >
                {LOCALE_TABS.map((item) => (
                    <Tab
                        key={item.locale}
                        label={item.label}
                        disabled={disabled}
                        sx={{ minHeight: 40, py: 0.5, fontSize: "0.8rem" }}
                    />
                ))}
            </Tabs>
            <TextField
                fullWidth
                required={required && tab === 0}
                label={`${label} (${activeLocale})`}
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
            />
        </Box>
    );
}
