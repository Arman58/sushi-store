"use client";

import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import { type SxProps, type Theme } from "@mui/material/styles";
import Typography from "@mui/material/Typography";

import type { CartModifierSnapshot } from "../model/types";

const fmt = new Intl.NumberFormat("ru-RU");

/**
 * Колоночное представление выбранных модификаторов:
 *
 *   · 35 см              300 ֏
 *   · Сырный соус         50 ֏
 *   · Острый соус
 *
 * Цена показывается без знака «+» (если положительна) - спека Шага 7, задача 2.2.
 * Нулевые priceDelta не печатаются вовсе (только название с «·»).
 *
 * Используется в Cart Drawer, Cart Page и Order Summary на чекауте, чтобы
 * клиент видел один и тот же формат на всех экранах оформления заказа.
 */
export function ModifiersList({
    modifiers,
    sx,
}: {
    modifiers: CartModifierSnapshot[];
    sx?: SxProps<Theme>;
}) {
    if (modifiers.length === 0) return null;

    return (
        <Stack
            component="ul"
            spacing={0.25}
            sx={[
                {
                    m: 0,
                    p: 0,
                    listStyle: "none",
                },
                ...(Array.isArray(sx) ? sx : [sx]),
            ]}
        >
            {modifiers.map((m) => (
                <Box
                    component="li"
                    key={m.id}
                    sx={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "baseline",
                        gap: 1,
                    }}
                >
                    <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{
                            lineHeight: 1.4,
                            // Маркер списка через ::before - даёт мягкую сдвижку
                            // и не теряет seleсt/copy всё названия (как у ::marker).
                            "&::before": {
                                content: '"· "',
                                color: "text.disabled",
                            },
                        }}
                    >
                        {m.name}
                    </Typography>
                    {m.priceDelta !== 0 ? (
                        <Typography
                            variant="caption"
                            color="text.secondary"
                            sx={{
                                lineHeight: 1.4,
                                fontVariantNumeric: "tabular-nums",
                                flexShrink: 0,
                            }}
                        >
                            {fmt.format(m.priceDelta)} ֏
                        </Typography>
                    ) : null}
                </Box>
            ))}
        </Stack>
    );
}
