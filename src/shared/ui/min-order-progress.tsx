"use client";

import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import Box from "@mui/material/Box";
import LinearProgress from "@mui/material/LinearProgress";
import Typography from "@mui/material/Typography";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useState } from "react";

import { formatStorePrice } from "@/shared/lib/format-price";
import { tokens } from "@/shared/ui/theme";

type Zone = { minOrderAmount: number; deliveryPrice: number };

/** Кэш на сессию - зоны меняются редко. */
let zonesCache: Zone[] | null = null;

/**
 * Прогресс до минимальной суммы заказа (самая доступная зона).
 * total >= порога - зелёное подтверждение. Мотивирует добрать корзину.
 */
export function MinOrderProgress({ total }: { total: number }) {
    const t = useTranslations("cart");
    const locale = useLocale();
    const [zones, setZones] = useState<Zone[] | null>(zonesCache);

    useEffect(() => {
        if (zonesCache) return;
        const controller = new AbortController();
        void (async () => {
            try {
                const res = await fetch(`/api/delivery-zones?locale=${locale}`, {
                    signal: controller.signal,
                });
                if (!res.ok) return;
                const data = (await res.json()) as Zone[];
                if (Array.isArray(data) && data.length > 0) {
                    zonesCache = data;
                    setZones(data);
                }
            } catch {
                /* фолбэк - статичная подсказка останется */
            }
        })();
        return () => controller.abort();
    }, [locale]);

    if (!zones || zones.length === 0) {
        // Фолбэк: прежняя статичная подсказка
        return (
            <Typography
                variant="caption"
                sx={{
                    display: "block",
                    mb: 1.5,
                    color: tokens.textMuted,
                    textAlign: "center",
                    lineHeight: 1.45,
                }}
            >
                {t("minOrderHint")}
            </Typography>
        );
    }

    const minThreshold = Math.min(...zones.map((z) => z.minOrderAmount));
    const reached = total >= minThreshold;
    const percent = Math.min(100, (total / Math.max(1, minThreshold)) * 100);

    return (
        <Box sx={{ mb: 1.5 }} aria-live="polite">
            {reached ? (
                <Box
                    sx={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 0.5,
                    }}
                >
                    <CheckCircleRoundedIcon
                        sx={{ fontSize: 16, color: tokens.brand }}
                    />
                    <Typography
                        variant="caption"
                        sx={{ color: tokens.brand, fontWeight: 700 }}
                    >
                        {t("minOrderReached")}
                    </Typography>
                </Box>
            ) : (
                <>
                    <LinearProgress
                        variant="determinate"
                        value={percent}
                        sx={{
                            height: 6,
                            borderRadius: 999,
                            mb: 0.5,
                            bgcolor: tokens.surfaceHi,
                            "& .MuiLinearProgress-bar": {
                                bgcolor: tokens.brand,
                                borderRadius: 999,
                            },
                        }}
                    />
                    <Typography
                        variant="caption"
                        sx={{
                            display: "block",
                            color: tokens.textSecondary,
                            textAlign: "center",
                            lineHeight: 1.45,
                        }}
                    >
                        {t("minOrderRemaining", {
                            amount: formatStorePrice(minThreshold - total),
                        })}
                    </Typography>
                </>
            )}
        </Box>
    );
}
