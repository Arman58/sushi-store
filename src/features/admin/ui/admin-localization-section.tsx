"use client";

import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import LanguageRoundedIcon from "@mui/icons-material/LanguageRounded";
import RadioButtonUncheckedIcon from "@mui/icons-material/RadioButtonUnchecked";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import CircularProgress from "@mui/material/CircularProgress";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import { useTranslations } from "next-intl";
import { type ReactNode, useMemo } from "react";

import {
    AdminLocalizationProvider,
    countRussianSourceFields,
    localeFillStatus,
    useAdminLocalization,
} from "@/features/admin/ui/admin-localization-context";
import type { LocalizedJson, StoreLocale } from "@/lib/i18n-utils";

type AdminLocalizationSectionProps = {
    children: ReactNode;
    fieldValues?: Array<LocalizedJson | undefined | null>;
    /** Верните true после успешного перевода — UI переключится на HY и обновит поля. */
    onTranslate?: () => boolean | void | Promise<boolean | void>;
    translating?: boolean;
    disabled?: boolean;
};

const LOCALE_META: Record<
    StoreLocale,
    { flag: string; labelKey: "localeHy" | "localeRu" | "localeEn" }
> = {
    ru: { flag: "🇷🇺", labelKey: "localeRu" },
    hy: { flag: "🇦🇲", labelKey: "localeHy" },
    en: { flag: "🇬🇧", labelKey: "localeEn" },
};

const LOCALE_ORDER: StoreLocale[] = ["ru", "hy", "en"];

function LocaleSwitcher({
    fieldValues,
    disabled,
}: {
    fieldValues: Array<LocalizedJson | undefined | null>;
    disabled?: boolean;
}) {
    const t = useTranslations("admin.aiTranslate");
    const tLang = useTranslations("languageSwitcher");
    const ctx = useAdminLocalization();
    if (!ctx) return null;

    const { activeLocale, setActiveLocale } = ctx;

    return (
        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            {LOCALE_ORDER.map((locale) => {
                const selected = activeLocale === locale;
                const filled = localeFillStatus(fieldValues, locale);
                const isSource = locale === "ru";

                return (
                    <Button
                        key={locale}
                        type="button"
                        disabled={disabled}
                        onClick={() => setActiveLocale(locale)}
                        variant={selected ? "contained" : "outlined"}
                        color={selected ? "primary" : "inherit"}
                        startIcon={
                            filled ? (
                                <CheckCircleOutlineIcon sx={{ fontSize: 16 }} />
                            ) : (
                                <RadioButtonUncheckedIcon sx={{ fontSize: 16 }} />
                            )
                        }
                        sx={{
                            textTransform: "none",
                            fontWeight: 700,
                            borderRadius: 2.5,
                            px: 1.5,
                            py: 0.75,
                            minHeight: 40,
                            borderColor: isSource
                                ? "rgba(39, 174, 96, 0.45)"
                                : "divider",
                            ...(selected
                                ? {
                                      boxShadow:
                                          "0 4px 14px rgba(39, 174, 96, 0.22)",
                                  }
                                : {}),
                        }}
                    >
                        <Box component="span" sx={{ mr: 0.75 }}>
                            {LOCALE_META[locale].flag}
                        </Box>
                        {tLang(LOCALE_META[locale].labelKey)}
                        {isSource && (
                            <Chip
                                label={t("sourceBadge")}
                                size="small"
                                sx={{
                                    ml: 1,
                                    height: 20,
                                    fontSize: "0.65rem",
                                    fontWeight: 800,
                                    bgcolor: selected
                                        ? "rgba(255,255,255,0.18)"
                                        : "rgba(39, 174, 96, 0.1)",
                                    color: selected ? "inherit" : "#27AE60",
                                }}
                            />
                        )}
                    </Button>
                );
            })}
        </Stack>
    );
}

function AdminLocalizationSectionInner({
    children,
    fieldValues = [],
    onTranslate,
    translating = false,
    disabled = false,
}: AdminLocalizationSectionProps) {
    const t = useTranslations("admin.aiTranslate");
    const ctx = useAdminLocalization();
    const readyCount = useMemo(
        () => countRussianSourceFields(fieldValues),
        [fieldValues],
    );
    const canTranslate = readyCount > 0 && Boolean(onTranslate);

    const handleTranslateClick = async () => {
        if (!onTranslate || !ctx) return;
        try {
            const result = await onTranslate();
            if (result === true) {
                ctx.notifyTranslationApplied();
            }
        } catch {
            /* ошибка уже показана в toast */
        }
    };

    return (
        <Paper
            variant="outlined"
            sx={{
                p: { xs: 1.5, sm: 2 },
                borderRadius: 3,
                borderColor: "divider",
                bgcolor: "background.paper",
                boxShadow: "0 1px 0 rgba(0,0,0,0.03)",
            }}
        >
            <Stack spacing={2}>
                <Stack
                    direction={{ xs: "column", sm: "row" }}
                    spacing={1.5}
                    alignItems={{ xs: "flex-start", sm: "center" }}
                    justifyContent="space-between"
                >
                    <Stack direction="row" spacing={1.25} alignItems="center">
                        <Box
                            sx={{
                                width: 40,
                                height: 40,
                                borderRadius: 2,
                                display: "grid",
                                placeItems: "center",
                                bgcolor: "rgba(39, 174, 96, 0.1)",
                                color: "#27AE60",
                                flexShrink: 0,
                            }}
                        >
                            <LanguageRoundedIcon sx={{ fontSize: 22 }} />
                        </Box>
                        <Box>
                            <Typography
                                variant="subtitle1"
                                sx={{ fontWeight: 800, lineHeight: 1.2 }}
                            >
                                {t("sectionTitle")}
                            </Typography>
                            <Typography
                                variant="body2"
                                color="text.secondary"
                                sx={{ mt: 0.25 }}
                            >
                                {t("sectionSubtitle")}
                            </Typography>
                        </Box>
                    </Stack>

                    {onTranslate && (
                        <Tooltip
                            title={
                                canTranslate
                                    ? t("fieldsReady", { count: readyCount })
                                    : t("noTextHint")
                            }
                        >
                            <span>
                                <Button
                                    type="button"
                                    variant="contained"
                                    disabled={
                                        disabled || translating || !canTranslate
                                    }
                                    onClick={() => void handleTranslateClick()}
                                    startIcon={
                                        translating ? (
                                            <CircularProgress
                                                size={16}
                                                sx={{ color: "inherit" }}
                                            />
                                        ) : (
                                            <AutoAwesomeIcon sx={{ fontSize: 18 }} />
                                        )
                                    }
                                    sx={{
                                        textTransform: "none",
                                        fontWeight: 800,
                                        borderRadius: 2.5,
                                        px: 2,
                                        py: 1,
                                        whiteSpace: "nowrap",
                                        bgcolor: "#27AE60",
                                        "&:hover": { bgcolor: "#219653" },
                                        "&.Mui-disabled": {
                                            bgcolor: "action.disabledBackground",
                                        },
                                    }}
                                >
                                    {translating ? t("translating") : t("buttonAction")}
                                </Button>
                            </span>
                        </Tooltip>
                    )}
                </Stack>

                <Stack
                    direction={{ xs: "column", md: "row" }}
                    spacing={1.5}
                    sx={{
                        p: 1.5,
                        borderRadius: 2.5,
                        bgcolor: "action.hover",
                    }}
                >
                    {[t("step1"), t("step2"), t("step3")].map((step, index) => (
                        <Stack
                            key={step}
                            direction="row"
                            spacing={1}
                            alignItems="flex-start"
                            sx={{ flex: 1, minWidth: 0 }}
                        >
                            <Box
                                sx={{
                                    width: 22,
                                    height: 22,
                                    borderRadius: "50%",
                                    display: "grid",
                                    placeItems: "center",
                                    fontSize: "0.72rem",
                                    fontWeight: 800,
                                    bgcolor:
                                        index === 0
                                            ? "rgba(39, 174, 96, 0.15)"
                                            : "background.paper",
                                    color:
                                        index === 0 ? "#27AE60" : "text.secondary",
                                    flexShrink: 0,
                                }}
                            >
                                {index + 1}
                            </Box>
                            <Typography
                                variant="caption"
                                color="text.secondary"
                                sx={{ lineHeight: 1.45, fontWeight: 600 }}
                            >
                                {step}
                            </Typography>
                        </Stack>
                    ))}
                </Stack>

                <LocaleSwitcher fieldValues={fieldValues} disabled={disabled} />

                {ctx && ctx.translationRevision > 0 ? (
                    <Alert severity="success" sx={{ py: 0.5 }}>
                        {t("reviewAfterTranslate")}
                    </Alert>
                ) : null}

                <Stack spacing={2}>{children}</Stack>
            </Stack>
        </Paper>
    );
}

export function AdminLocalizationSection(props: AdminLocalizationSectionProps) {
    return (
        <AdminLocalizationProvider defaultLocale="ru">
            <AdminLocalizationSectionInner {...props} />
        </AdminLocalizationProvider>
    );
}
