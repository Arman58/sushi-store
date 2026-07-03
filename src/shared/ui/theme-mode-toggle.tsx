"use client";

import DarkModeOutlinedIcon from "@mui/icons-material/DarkModeOutlined";
import LightModeOutlinedIcon from "@mui/icons-material/LightModeOutlined";
import IconButton from "@mui/material/IconButton";
import { useTranslations } from "next-intl";
import { useSyncExternalStore } from "react";

const STORAGE_KEY = "ew_theme";

function currentMode(): "light" | "dark" {
    if (typeof document === "undefined") return "light";
    return document.documentElement.dataset.theme === "dark" ? "dark" : "light";
}

/** Подписка на смену data-theme (источник истины - атрибут на <html>). */
function subscribe(onChange: () => void): () => void {
    const observer = new MutationObserver(onChange);
    observer.observe(document.documentElement, {
        attributes: true,
        attributeFilter: ["data-theme"],
    });
    return () => observer.disconnect();
}

/**
 * Переключатель light/dark. Атрибут ставится init-скриптом в <head>
 * до гидратации (анти-FOUC); состояние читается из DOM через
 * useSyncExternalStore - без setState в эффектах.
 */
export function ThemeModeToggle() {
    const tCommon = useTranslations("common");
    const mode = useSyncExternalStore(subscribe, currentMode, () => "light");

    const toggle = () => {
        const next = currentMode() === "dark" ? "light" : "dark";
        document.documentElement.dataset.theme = next;
        try {
            localStorage.setItem(STORAGE_KEY, next);
        } catch {
            /* приватный режим */
        }
    };

    return (
        <IconButton
            onClick={toggle}
            aria-label={tCommon("aria.toggleTheme")}
            sx={{ width: 44, height: 44, color: "text.secondary" }}
        >
            {mode === "dark" ? (
                <LightModeOutlinedIcon sx={{ fontSize: 21 }} />
            ) : (
                <DarkModeOutlinedIcon sx={{ fontSize: 21 }} />
            )}
        </IconButton>
    );
}

/** Инлайн-скрипт для <head>: применяет сохранённую/системную тему до первой отрисовки. */
export const THEME_INIT_SCRIPT = `try{var t=localStorage.getItem("${STORAGE_KEY}");var d=t==="dark"||(!t&&matchMedia("(prefers-color-scheme: dark)").matches);document.documentElement.dataset.theme=d?"dark":"light"}catch(e){document.documentElement.dataset.theme="light"}`;
