"use client";

import CheckRoundedIcon from "@mui/icons-material/CheckRounded";
import DarkModeOutlinedIcon from "@mui/icons-material/DarkModeOutlined";
import ExpandMoreRoundedIcon from "@mui/icons-material/ExpandMoreRounded";
import LanguageRoundedIcon from "@mui/icons-material/LanguageRounded";
import LightModeOutlinedIcon from "@mui/icons-material/LightModeOutlined";
import Box from "@mui/material/Box";
import ButtonBase from "@mui/material/ButtonBase";
import IconButton from "@mui/material/IconButton";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import Typography from "@mui/material/Typography";
import { useTranslations } from "next-intl";
import { useState, useSyncExternalStore } from "react";

/**
 * Контролы шапки админки: тема (light/dark) и язык сайта.
 * Админка живёт вне [locale], поэтому компоненты self-contained и НЕ зависят
 * от next-intl - тема управляется атрибутом data-theme на <html>, язык -
 * cookie NEXT_LOCALE (влияет на язык витрины).
 */

const THEME_KEY = "ew_theme";
const LOCALE_COOKIE = "NEXT_LOCALE";
const DEFAULT_LOCALE = "hy";

const languages = [
    { code: "hy", labelKey: "localeHy" as const, flag: "🇦🇲" },
    { code: "ru", labelKey: "localeRu" as const, flag: "🇷🇺" },
    { code: "en", labelKey: "localeEn" as const, flag: "🇬🇧" },
];

// ─── Тема ───────────────────────────────────────────────────────────────────

function currentMode(): "light" | "dark" {
    if (typeof document === "undefined") return "light";
    return document.documentElement.dataset.theme === "dark" ? "dark" : "light";
}

function subscribeTheme(onChange: () => void): () => void {
    if (typeof document === "undefined") return () => {};
    const observer = new MutationObserver(onChange);
    observer.observe(document.documentElement, {
        attributes: true,
        attributeFilter: ["data-theme"],
    });
    return () => observer.disconnect();
}

function AdminThemeToggle() {
    const t = useTranslations("admin.header");
    const mode = useSyncExternalStore(
        subscribeTheme,
        currentMode,
        () => "light",
    );

    const toggle = () => {
        const next = currentMode() === "dark" ? "light" : "dark";
        document.documentElement.dataset.theme = next;
        try {
            localStorage.setItem(THEME_KEY, next);
        } catch {
            /* приватный режим */
        }
    };

    return (
        <IconButton
            onClick={toggle}
            aria-label={mode === "dark" ? t("lightTheme") : t("darkTheme")}
            sx={{ width: 40, height: 40, color: "text.secondary" }}
        >
            {mode === "dark" ? (
                <LightModeOutlinedIcon sx={{ fontSize: 21 }} />
            ) : (
                <DarkModeOutlinedIcon sx={{ fontSize: 21 }} />
            )}
        </IconButton>
    );
}

// ─── Язык ───────────────────────────────────────────────────────────────────

function writeLocaleCookie(code: string): void {
    if (typeof document === "undefined") return;
    document.cookie = `${LOCALE_COOKIE}=${code}; path=/; max-age=31536000; samesite=lax`;
}

function readLocaleCookie(): string {
    if (typeof document === "undefined") return DEFAULT_LOCALE;
    const match = document.cookie.match(/(?:^|;\s*)NEXT_LOCALE=([^;]+)/);
    const code = match?.[1];
    if (code && languages.some((l) => l.code === code)) return code;
    const htmlLang = document.documentElement.lang;
    if (languages.some((l) => l.code === htmlLang)) return htmlLang;
    return DEFAULT_LOCALE;
}

function AdminLangSwitcher() {
    const t = useTranslations("admin.header");
    const tLang = useTranslations("languageSwitcher");
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
    const open = Boolean(anchorEl);

    // Локаль из cookie. Сервер отдаёт дефолт, клиент реконсилит после гидратации.
    const locale = useSyncExternalStore(
        () => () => {},
        readLocaleCookie,
        () => DEFAULT_LOCALE,
    );

    const handleChange = (code: string) => {
        setAnchorEl(null);
        if (code === locale) return;
        writeLocaleCookie(code);
        // Перерисовать: язык витрины берётся из cookie.
        window.location.reload();
    };

    const current =
        languages.find((l) => l.code === locale) ?? languages[0];

    return (
        <>
            <ButtonBase
                onClick={(e) => setAnchorEl(e.currentTarget)}
                aria-label={t("siteLanguage")}
                aria-haspopup="menu"
                aria-expanded={open}
                sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 0.5,
                    height: 40,
                    px: 1,
                    borderRadius: "12px",
                    color: "text.secondary",
                    "&:hover": { bgcolor: "action.hover" },
                }}
            >
                <LanguageRoundedIcon sx={{ fontSize: 20 }} />
                <Typography
                    component="span"
                    sx={{
                        fontSize: 14,
                        fontWeight: 600,
                        textTransform: "uppercase",
                        display: { xs: "none", sm: "block" },
                    }}
                >
                    {current.code}
                </Typography>
                <ExpandMoreRoundedIcon sx={{ fontSize: 18 }} />
            </ButtonBase>
            <Menu
                anchorEl={anchorEl}
                open={open}
                onClose={() => setAnchorEl(null)}
                anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
                transformOrigin={{ vertical: "top", horizontal: "right" }}
            >
                {languages.map((lang) => (
                    <MenuItem
                        key={lang.code}
                        selected={lang.code === locale}
                        onClick={() => handleChange(lang.code)}
                        sx={{ gap: 1.25, minWidth: 180 }}
                    >
                        <Box component="span" sx={{ fontSize: 18 }}>
                            {lang.flag}
                        </Box>
                        <Typography sx={{ flex: 1, fontSize: 14 }}>
                            {tLang(lang.labelKey)}
                        </Typography>
                        {lang.code === locale && (
                            <CheckRoundedIcon
                                sx={{ fontSize: 18, color: "primary.main" }}
                            />
                        )}
                    </MenuItem>
                ))}
            </Menu>
        </>
    );
}

export function AdminHeaderControls() {
    return (
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
            <AdminLangSwitcher />
            <AdminThemeToggle />
        </Box>
    );
}
