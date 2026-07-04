"use client";

import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import ArrowForwardRoundedIcon from "@mui/icons-material/ArrowForwardRounded";
import Box from "@mui/material/Box";
import ButtonBase from "@mui/material/ButtonBase";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";

import { tokens } from "./theme";

/**
 * Стрелки назад/вперёд для навигации.
 * Показываются только когда приложение запущено как PWA (display-mode: standalone),
 * где нет браузерных кнопок навигации. В обычном браузере ничего не рендерим.
 */
export function PwaNavArrows() {
    const router = useRouter();
    const t = useTranslations("nav");
    const [standalone, setStandalone] = useState(false);

    useEffect(() => {
        if (typeof window === "undefined") return;

        const mq = window.matchMedia("(display-mode: standalone)");
        const iosStandalone =
            "standalone" in window.navigator &&
            (window.navigator as Navigator & { standalone?: boolean })
                .standalone === true;

        const update = () => setStandalone(mq.matches || iosStandalone);
        update();

        mq.addEventListener?.("change", update);
        return () => mq.removeEventListener?.("change", update);
    }, []);

    if (!standalone) return null;

    const btnSx = {
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        width: 40,
        height: 40,
        borderRadius: "12px",
        color: tokens.textSecondary,
        transition: "all 0.15s ease",
        "&:hover": { bgcolor: tokens.surfaceHi, color: tokens.textPrimary },
        "&:active": { transform: "scale(0.92)" },
    } as const;

    return (
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.25, flexShrink: 0 }}>
            <ButtonBase
                aria-label={t("back")}
                onClick={() => router.back()}
                sx={btnSx}
            >
                <ArrowBackRoundedIcon sx={{ fontSize: 22 }} />
            </ButtonBase>
            <ButtonBase
                aria-label={t("forward")}
                onClick={() => router.forward()}
                sx={btnSx}
            >
                <ArrowForwardRoundedIcon sx={{ fontSize: 22 }} />
            </ButtonBase>
        </Box>
    );
}
