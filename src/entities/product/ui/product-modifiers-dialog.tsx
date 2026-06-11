"use client";

import CheckIcon from "@mui/icons-material/Check";
import CloseIcon from "@mui/icons-material/Close";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import IconButton from "@mui/material/IconButton";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import { alpha, useTheme } from "@mui/material/styles";
import Typography from "@mui/material/Typography";
import useMediaQuery from "@mui/material/useMediaQuery";
import { motion } from "framer-motion";
import { useTranslations } from "next-intl";
import { useEffect, useMemo, useState } from "react";

import type { MenuModifierGroup } from "@/entities/product/model/modifiers";
import type { CartModifierSnapshot } from "@/features/cart/model/types";
import { storePriceFormatter } from "@/shared/lib/format-price";
import { tokens } from "@/shared/ui/theme";

const MotionPaper = motion.create(Paper);

const bottomSheetTransition = {
    duration: 0.3,
    ease: [0.32, 0.72, 0, 1] as [number, number, number, number],
};

export type ProductModifiersDialogProps = {
    open: boolean;
    onClose: () => void;
    productName: string;
    basePrice: number;
    modifierGroups: MenuModifierGroup[];
    onConfirm: (payload: {
        selectedModifiers: CartModifierSnapshot[];
        calculatedItemPrice: number;
    }) => void;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function selectionValid(
    groups: MenuModifierGroup[],
    selectedByGroup: Record<number, number[]>,
): boolean {
    for (const g of groups) {
        const picked = selectedByGroup[g.id] ?? [];
        if (g.required && picked.length === 0) return false;
        if (g.maxChoices > 0 && picked.length > g.maxChoices) return false;
    }
    return true;
}

// ─── OptionTile: универсальная плитка для radio и checkbox режимов ────────────

/**
 * Кликабельная плитка с подсветкой при выборе.
 *
 * - mode="radio"     → без чекмарка; выбор выражается рамкой и фоном.
 * - mode="checkbox"  → круглый чекмарк в углу; визуально подтверждает мульти-выбор.
 *
 * Цена опции:
 *   priceDelta > 0 → «+300 ֏» жирным primary
 *   priceDelta < 0 → «−50 ֏» жирным success
 *   priceDelta = 0 → не выводится (по UX-договорённости - без «Бесплатно»)
 *
 * a11y: role="radio"/"checkbox", aria-checked, активация по Space/Enter,
 * обводка focus-visible.
 */
function OptionTile({
    name,
    priceDelta,
    selected,
    disabled = false,
    mode,
    onClick,
    fmt,
}: {
    name: string;
    priceDelta: number;
    selected: boolean;
    disabled?: boolean;
    mode: "radio" | "checkbox";
    onClick: () => void;
    fmt: Intl.NumberFormat;
}) {
    return (
        <Box
            role={mode}
            aria-checked={selected}
            aria-disabled={disabled || undefined}
            tabIndex={disabled ? -1 : 0}
            onClick={() => {
                if (disabled) return;
                onClick();
            }}
            onKeyDown={(e) => {
                if (disabled) return;
                if (e.key === " " || e.key === "Enter") {
                    e.preventDefault();
                    onClick();
                }
            }}
            sx={(theme) => ({
                position: "relative",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 1.5,
                minWidth: 0,
                px: 1.75,
                py: 1.5,
                minHeight: 44,
                borderRadius: 2,
                cursor: disabled ? "not-allowed" : "pointer",
                userSelect: "none",
                opacity: disabled ? 0.45 : 1,
                border: "1.5px solid",
                borderColor: selected
                    ? theme.palette.primary.main
                    : theme.palette.divider,
                bgcolor: selected
                    ? alpha(theme.palette.primary.main, 0.06)
                    : "background.paper",
                transition:
                    "border-color 120ms ease, background-color 120ms ease",
                "&:hover": disabled
                    ? {}
                    : {
                          borderColor: selected
                              ? theme.palette.primary.main
                              : theme.palette.text.disabled,
                      },
                "&:focus-visible": {
                    outline: "2px solid",
                    outlineColor: theme.palette.primary.main,
                    outlineOffset: 2,
                },
            })}
        >
            <Typography
                variant="body2"
                sx={{
                    flex: 1,
                    minWidth: 0,
                    fontWeight: selected ? 700 : 500,
                    lineHeight: 1.3,
                    pr: 1,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                }}
            >
                {name}
            </Typography>

            <Stack
                direction="row"
                alignItems="center"
                spacing={1.25}
                sx={{ flexShrink: 0 }}
            >
                {priceDelta > 0 ? (
                    <Typography
                        variant="body2"
                        sx={{
                            color: "primary.main",
                            fontWeight: 700,
                            whiteSpace: "nowrap",
                            fontVariantNumeric: "tabular-nums",
                        }}
                    >
                        +{fmt.format(priceDelta)} ֏
                    </Typography>
                ) : null}
                {priceDelta < 0 ? (
                    <Typography
                        variant="body2"
                        sx={{
                            color: "success.main",
                            fontWeight: 700,
                            whiteSpace: "nowrap",
                            fontVariantNumeric: "tabular-nums",
                        }}
                    >
                        {fmt.format(priceDelta)} ֏
                    </Typography>
                ) : null}

                {mode === "checkbox" ? (
                    <Box
                        sx={(theme) => ({
                            width: 22,
                            height: 22,
                            borderRadius: "50%",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            border: "1.5px solid",
                            borderColor: selected
                                ? theme.palette.primary.main
                                : theme.palette.divider,
                            bgcolor: selected
                                ? theme.palette.primary.main
                                : "transparent",
                            color: selected ? "primary.contrastText" : "transparent",
                            transition:
                                "background-color 120ms ease, border-color 120ms ease",
                            flexShrink: 0,
                        })}
                    >
                        {selected ? (
                            <CheckIcon sx={{ fontSize: 14 }} />
                        ) : null}
                    </Box>
                ) : null}
            </Stack>
        </Box>
    );
}

// ─── Dialog ───────────────────────────────────────────────────────────────────

export function ProductModifiersDialog({
    open,
    onClose,
    productName,
    basePrice,
    modifierGroups,
    onConfirm,
}: ProductModifiersDialogProps) {
    const t = useTranslations("product.modifiers");
    const tCommon = useTranslations("common");
    const fmt = storePriceFormatter;
    const [selectedByGroup, setSelectedByGroup] = useState<
        Record<number, number[]>
    >({});

    /**
     * Инициализация при открытии:
     *   required && modifiers.length > 0 → предвыбираем первую опцию;
     *   иначе → пустой выбор.
     * Зависим от modifierGroups для случая переоткрытия с другим товаром.
     */
    useEffect(() => {
        if (!open) return;
        const initial: Record<number, number[]> = {};
        for (const g of modifierGroups) {
            if (g.required && g.modifiers.length > 0) {
                initial[g.id] = [g.modifiers[0].id];
            } else {
                initial[g.id] = [];
            }
        }
        queueMicrotask(() => setSelectedByGroup(initial));
    }, [open, modifierGroups]);

    const hasModifiers = modifierGroups.length > 0;

    const computed = useMemo(() => {
        const snapshots: CartModifierSnapshot[] = [];
        let delta = 0;
        for (const g of modifierGroups) {
            const ids = selectedByGroup[g.id] ?? [];
            const idSet = new Set(g.modifiers.map((m) => m.id));
            for (const mid of ids) {
                const m = g.modifiers.find((x) => x.id === mid);
                if (m && idSet.has(mid)) {
                    snapshots.push({
                        id: m.id,
                        name: m.name,
                        priceDelta: m.priceDelta,
                    });
                    delta += m.priceDelta;
                }
            }
        }
        return { snapshots, unitPrice: basePrice + delta };
    }, [basePrice, modifierGroups, selectedByGroup]);

    const canSubmit =
        hasModifiers && selectionValid(modifierGroups, selectedByGroup);

    /**
     * Радио-режим (maxChoices === 1).
     * Если группа НЕ обязательная и кликнули по уже выбранной опции - снимаем выбор
     * (UX, более естественный, чем отдельная плитка «Не выбирать»).
     */
    const toggleRadio = (group: MenuModifierGroup, modifierId: number) => {
        const cur = selectedByGroup[group.id] ?? [];
        const isCurrentlySelected = cur[0] === modifierId;
        if (isCurrentlySelected && !group.required) {
            setSelectedByGroup((prev) => ({ ...prev, [group.id]: [] }));
            return;
        }
        setSelectedByGroup((prev) => ({ ...prev, [group.id]: [modifierId] }));
    };

    /**
     * Чекбокс-режим (maxChoices !== 1).
     * При попытке превысить maxChoices - клик молча игнорируется,
     * UI отключает невыбранные плитки через `disabled` ниже.
     */
    const toggleMulti = (group: MenuModifierGroup, modifierId: number) => {
        const cur = selectedByGroup[group.id] ?? [];
        const idx = cur.indexOf(modifierId);
        let next: number[];
        if (idx >= 0) {
            next = cur.filter((id) => id !== modifierId);
        } else if (group.maxChoices > 0 && cur.length >= group.maxChoices) {
            return;
        } else {
            next = [...cur, modifierId];
        }
        setSelectedByGroup((prev) => ({ ...prev, [group.id]: next }));
    };

    const handleConfirm = () => {
        if (!canSubmit) return;
        onConfirm({
            selectedModifiers: computed.snapshots,
            calculatedItemPrice: computed.unitPrice,
        });
        onClose();
    };

    const theme = useTheme();
    const isBottomSheet = useMediaQuery(theme.breakpoints.down("md"));

    return (
        <Dialog
            open={open}
            onClose={onClose}
            fullWidth
            maxWidth="sm"
            sx={
                isBottomSheet
                    ? {
                          "& .MuiDialog-container": {
                              alignItems: "flex-end",
                          },
                      }
                    : undefined
            }
            slots={{ paper: MotionPaper }}
            slotProps={{
                paper: {
                    elevation: 24,
                    initial: isBottomSheet
                        ? { y: "100%", opacity: 1 }
                        : { opacity: 0, scale: 0.96, y: 14 },
                    animate: open
                        ? { y: 0, opacity: 1, scale: 1 }
                        : isBottomSheet
                          ? { y: "100%", opacity: 1 }
                          : { opacity: 0, scale: 0.96, y: 14 },
                    transition: isBottomSheet
                        ? bottomSheetTransition
                        : { duration: 0.22, ease: [0.33, 1, 0.68, 1] },
                    sx: {
                        ...(isBottomSheet
                            ? {
                                  m: 0,
                                  maxWidth: "100%",
                                  width: "100%",
                                  maxHeight: "min(92dvh, 920px)",
                                  borderRadius: "24px 24px 0 0",
                                  border: `1px solid ${tokens.border}`,
                                  borderBottom: "none",
                                  display: "flex",
                                  flexDirection: "column",
                                  overflow: "hidden",
                              }
                            : {
                                  borderRadius: { xs: 2, sm: 3 },
                                  m: { xs: 2, sm: 4 },
                                  maxHeight: {
                                      xs: "calc(100vh - 24px)",
                                      sm: "calc(100% - 64px)",
                                  },
                              }),
                    },
                // Framer motion props on Paper slot
                } as object,
            }}
        >
            {isBottomSheet ? (
                <Box
                    sx={{
                        pt: 1,
                        pb: 0.25,
                        flexShrink: 0,
                        bgcolor: "background.paper",
                    }}
                >
                    <Box
                        aria-hidden
                        sx={{
                            width: 40,
                            height: 4,
                            borderRadius: 999,
                            bgcolor: alpha(theme.palette.grey[500], 0.45),
                            mx: "auto",
                            boxShadow: `inset 0 1px 2px ${alpha(theme.palette.common.black, 0.08)}`,
                        }}
                    />
                </Box>
            ) : null}
            {/* ── Title: имя товара + базовая цена + кнопка закрытия ── */}
            <DialogTitle sx={{ pr: 1.5, pb: 1.5, pt: isBottomSheet ? 0.5 : undefined }}>
                <Stack
                    direction="row"
                    alignItems="flex-start"
                    justifyContent="space-between"
                    gap={2}
                >
                    <Stack sx={{ minWidth: 0, pt: 0.25 }}>
                        <Typography
                            component="span"
                            variant="h6"
                            fontWeight={800}
                            sx={{ lineHeight: 1.2 }}
                        >
                            {productName}
                        </Typography>
                        <Typography
                            variant="body2"
                            color="text.secondary"
                            sx={{ mt: 0.5, fontVariantNumeric: "tabular-nums" }}
                        >
                            {t("fromPrice", { price: fmt.format(basePrice) })}
                        </Typography>
                    </Stack>
                    <IconButton
                        onClick={onClose}
                        aria-label={tCommon("aria.close")}
                        size="small"
                        sx={{ flexShrink: 0 }}
                    >
                        <CloseIcon />
                    </IconButton>
                </Stack>
            </DialogTitle>

            {/* ── Body: группы с плитками-опциями ── */}
            <DialogContent
                dividers
                sx={{
                    py: 2.5,
                    flex: 1,
                    minHeight: 0,
                    overflowY: "auto",
                }}
            >
                <Stack spacing={3}>
                    {modifierGroups.map((group) => {
                        const picked = selectedByGroup[group.id] ?? [];
                        const useRadio = group.maxChoices === 1;
                        const limitReached =
                            !useRadio &&
                            group.maxChoices > 0 &&
                            picked.length >= group.maxChoices;

                        return (
                            <Box
                                key={group.id}
                                role="group"
                                aria-label={group.name}
                            >
                                {/* ── Заголовок группы: название + бейджи ── */}
                                <Stack
                                    direction="row"
                                    alignItems="center"
                                    spacing={1}
                                    sx={{ mb: 1.25 }}
                                    flexWrap="wrap"
                                    useFlexGap
                                >
                                    <Typography
                                        variant="subtitle1"
                                        fontWeight={700}
                                        sx={{ lineHeight: 1.25 }}
                                    >
                                        {group.name}
                                    </Typography>
                                    {group.required ? (
                                        <Chip
                                            label={t("required")}
                                            size="small"
                                            color="error"
                                            variant="outlined"
                                            sx={{
                                                height: 22,
                                                fontSize: "0.7rem",
                                                fontWeight: 600,
                                                "& .MuiChip-label": {
                                                    px: 0.875,
                                                },
                                            }}
                                        />
                                    ) : null}
                                    {group.maxChoices > 1 ? (
                                        <Chip
                                            label={t("maxChoices", { n: group.maxChoices })}
                                            size="small"
                                            variant="outlined"
                                            sx={{
                                                height: 22,
                                                fontSize: "0.7rem",
                                                color: "text.secondary",
                                                "& .MuiChip-label": {
                                                    px: 0.875,
                                                },
                                            }}
                                        />
                                    ) : null}
                                    {!useRadio && group.maxChoices === 0 ? (
                                        <Chip
                                            label={t("unlimited")}
                                            size="small"
                                            variant="outlined"
                                            sx={{
                                                height: 22,
                                                fontSize: "0.7rem",
                                                color: "text.secondary",
                                                "& .MuiChip-label": {
                                                    px: 0.875,
                                                },
                                            }}
                                        />
                                    ) : null}
                                </Stack>

                                {/* ── Плитки опций ── */}
                                <Stack
                                    spacing={1}
                                    role={useRadio ? "radiogroup" : undefined}
                                    aria-label={group.name}
                                >
                                    {group.modifiers.map((m) => {
                                        const selected = picked.includes(m.id);
                                        return (
                                            <OptionTile
                                                key={m.id}
                                                name={m.name}
                                                priceDelta={m.priceDelta}
                                                selected={selected}
                                                fmt={fmt}
                                                mode={
                                                    useRadio
                                                        ? "radio"
                                                        : "checkbox"
                                                }
                                                // Disabled только для невыбранных плиток в чекбокс-режиме при достижении лимита.
                                                // Это даёт явный визуальный сигнал, что лимит исчерпан.
                                                disabled={
                                                    !selected && limitReached
                                                }
                                                onClick={() =>
                                                    useRadio
                                                        ? toggleRadio(
                                                              group,
                                                              m.id,
                                                          )
                                                        : toggleMulti(
                                                              group,
                                                              m.id,
                                                          )
                                                }
                                            />
                                        );
                                    })}
                                </Stack>
                            </Box>
                        );
                    })}
                </Stack>
            </DialogContent>

            {/* ── Sticky footer: крупная итоговая цена + большая CTA ── */}
            <DialogActions
                sx={{
                    px: { xs: 2, sm: 3 },
                    py: 2,
                    borderTop: "1px solid",
                    borderColor: "divider",
                    bgcolor: "background.paper",
                    flexShrink: 0,
                    pb: {
                        xs: "calc(16px + env(safe-area-inset-bottom))",
                        sm: 2,
                    },
                }}
            >
                <Stack
                    direction="row"
                    alignItems="center"
                    spacing={2}
                    sx={{ width: "100%" }}
                >
                    <Stack sx={{ flex: 1, minWidth: 0 }}>
                        <Typography
                            variant="caption"
                            color="text.secondary"
                            sx={{ lineHeight: 1.2 }}
                        >
                            {t("total")}
                        </Typography>
                        <Typography
                            variant="h5"
                            fontWeight={800}
                            sx={{
                                color: "primary.main",
                                lineHeight: 1.1,
                                fontVariantNumeric: "tabular-nums",
                            }}
                        >
                            {fmt.format(computed.unitPrice)} ֏
                        </Typography>
                    </Stack>
                    <Button
                        variant="contained"
                        disabled={!canSubmit}
                        onClick={handleConfirm}
                        size="large"
                        sx={{
                            minWidth: { xs: 140, sm: 200 },
                            py: 1.25,
                            borderRadius: 2,
                            textTransform: "none",
                            fontWeight: 700,
                            fontSize: "1rem",
                        }}
                    >
                        {t("addToCart")}
                    </Button>
                </Stack>
            </DialogActions>
        </Dialog>
    );
}
