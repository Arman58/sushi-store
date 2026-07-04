"use client";

import AccessTimeRoundedIcon from "@mui/icons-material/AccessTimeRounded";
import Alert from "@mui/material/Alert";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";

import { isStoreOpen, OPENING_HOURS } from "@/lib/site-config";

/**
 * Предупреждение «кухня закрыта» в чекауте.
 * Стартует скрытым (SSR-безопасно) и пересчитывается раз в минуту.
 */
export function StoreClosedAlert() {
    const t = useTranslations("checkout.form");
    const [closed, setClosed] = useState(false);

    useEffect(() => {
        const update = () => setClosed(!isStoreOpen());
        update();
        const id = window.setInterval(update, 60_000);
        return () => window.clearInterval(id);
    }, []);

    if (!closed) return null;

    return (
        <Alert
            severity="warning"
            icon={<AccessTimeRoundedIcon fontSize="inherit" />}
            sx={{ mb: 2, borderRadius: 2 }}
        >
            {t("storeClosed", {
                opens: OPENING_HOURS.opens,
                closes: OPENING_HOURS.closes,
            })}
        </Alert>
    );
}
