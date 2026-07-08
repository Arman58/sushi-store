"use client";

import DarkModeOutlinedIcon from "@mui/icons-material/DarkModeOutlined";
import LightModeOutlinedIcon from "@mui/icons-material/LightModeOutlined";
import IconButton from "@mui/material/IconButton";
import { useColorScheme } from "@mui/material/styles";
import { useTranslations } from "next-intl";
import { useSyncExternalStore } from "react";

function useIsHydrated(): boolean {
    return useSyncExternalStore(
        () => () => {},
        () => true,
        () => false,
    );
}

export function ThemeModeToggle() {
    const tCommon = useTranslations("common");
    const hydrated = useIsHydrated();
    const { mode, setMode } = useColorScheme();
    const current = mode === "dark" ? "dark" : "light";

    const toggle = () => {
        setMode(current === "dark" ? "light" : "dark");
    };

    if (!hydrated) {
        return (
            <IconButton
                aria-label={tCommon("aria.toggleTheme")}
                sx={{ width: 44, height: 44, color: "text.secondary" }}
                disabled
            />
        );
    }

    return (
        <IconButton
            onClick={toggle}
            aria-label={tCommon("aria.toggleTheme")}
            sx={{ width: 44, height: 44, color: "text.secondary" }}
        >
            {current === "dark" ? (
                <LightModeOutlinedIcon sx={{ fontSize: 21 }} />
            ) : (
                <DarkModeOutlinedIcon sx={{ fontSize: 21 }} />
            )}
        </IconButton>
    );
}
