"use client";

import Typography from "@mui/material/Typography";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";

import {
    DELIVERY_ETA,
    getExpectedArrivalTime,
    isStoreOpen,
    OPENING_HOURS,
} from "@/lib/site-config";

import { tokens } from "./theme";

type EtaState = {
    label: string;
    value: string;
    closed: boolean;
};

function formatHm(d: Date): string {
    const hh = String(d.getHours()).padStart(2, "0");
    const mm = String(d.getMinutes()).padStart(2, "0");
    return `${hh}:${mm}`;
}

/**
 * ETA в шапке: конкретное «Привезём к ~HH:MM» вместо пугающего диапазона.
 * Кухня закрыта → честное «Сейчас закрыто · откроемся в 12:00».
 * До маунта - статичный диапазон (SSR-безопасно), далее тик раз в минуту.
 */
export function HeaderEta() {
    const t = useTranslations("common.eta");

    const [state, setState] = useState<EtaState | null>(null);

    useEffect(() => {
        const update = () => {
            if (!isStoreOpen()) {
                setState({
                    label: t("closedLabel"),
                    value: t("opensAt", { time: OPENING_HOURS.opens }),
                    closed: true,
                });
                return;
            }
            setState({
                label: t("arrivalLabel"),
                value: `~${formatHm(getExpectedArrivalTime())}`,
                closed: false,
            });
        };
        update();
        const id = window.setInterval(update, 60_000);
        return () => window.clearInterval(id);
    }, [t]);

    // SSR/первый рендер: нейтральный диапазон без расчёта времени
    const label = state?.label ?? t("arrivalLabel");
    const value =
        state?.value ??
        t("range", {
            min: DELIVERY_ETA.minMinutes,
            max: DELIVERY_ETA.maxMinutes,
        });

    return (
        <div>
            <Typography
                variant="body2"
                fontWeight={700}
                noWrap
                sx={{
                    fontSize: { xs: 14.5, sm: 13.5 },
                    lineHeight: 1.2,
                    color: state?.closed ? "#B45309" : "text.primary",
                }}
            >
                {label}
            </Typography>
            <Typography
                variant="caption"
                noWrap
                sx={{
                    color: state?.closed ? "#B45309" : tokens.textMuted,
                    display: "block",
                    lineHeight: 1.2,
                    fontSize: 11.5,
                    fontVariantNumeric: "tabular-nums",
                }}
            >
                {value}
            </Typography>
        </div>
    );
}
