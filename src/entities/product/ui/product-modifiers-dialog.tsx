"use client";

import CheckIcon from "@mui/icons-material/Check";
import CloseIcon from "@mui/icons-material/Close";
import Box from "@mui/material/Box";
import Chip from "@mui/material/Chip";
import Dialog from "@mui/material/Dialog";
import Divider from "@mui/material/Divider";
import IconButton from "@mui/material/IconButton";
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
import { AppButton } from "@/shared/ui/AppButton";

const MotionBox = motion.create(Box);

const desktopPaperTransition = {
    duration: 0.22,
    ease: [0.33, 1, 0.68, 1] as [number, number, number, number],
};

export type ProductModifiersDialogProps = {
    open: boolean;
    onClose: () => void;
    productName: string;
    /** Краткое описание блюда (опционально). */
    description?: string | null;
    basePrice: number;
    modifierGroups: MenuModifierGroup[];
    onConfirm: (payload: {
        selectedModifiers: CartModifierSnapshot[];
        calculatedItemPrice: number;
    }) => void;
};

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
                gap: 2,
                width: "100%",
                minWidth: 0,
                px: 2,
                py: 1.75,
                minHeight: 48,
                borderRadius: 2.5,
                cursor: disabled ? "not-allowed" : "pointer",
                userSelect: "none",
                opacity: disabled ? 0.45 : 1,
                border: "2px solid",
                borderColor: selected
                    ? theme.palette.primary.main
                    : theme.palette.divider,
                bgcolor: selected
                    ? alpha(theme.palette.primary.main, 0.08)
                    : "background.paper",
                boxShadow: selected
                    ? `0 0 0 1px ${alpha(theme.palette.primary.main, 0.12)}`
                    : "none",
                transition:
                    "border-color 140ms ease, background-color 140ms ease, box-shadow 140ms ease",
                "&:active": disabled
                    ? {}
                    : {
                          transform: "scale(0.99)",
                      },
                "&:focus-visible": {
                    outline: "2px solid",
                    outlineColor: theme.palette.primary.main,
                    outlineOffset: 2,
                },
            })}
        >
            <Typography
                variant="body1"
                sx={{
                    flex: 1,
                    minWidth: 0,
                    fontWeight: selected ? 700 : 500,
                    lineHeight: 1.35,
                    pr: 1,
                    whiteSpace: "normal",
                    wordBreak: "break-word",
                }}
            >
                {name}
            </Typography>

            <Stack
                direction="row"
                alignItems="center"
                spacing={1.25}
                sx={{ flexShrink: 0, ml: "auto" }}
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
                            width: 24,
                            height: 24,
                            borderRadius: "50%",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            border: "2px solid",
                            borderColor: selected
                                ? theme.palette.primary.main
                                : theme.palette.divider,
                            bgcolor: selected
                                ? theme.palette.primary.main
                                : "transparent",
                            color: selected ? "primary.contrastText" : "transparent",
                            flexShrink: 0,
                        })}
                    >
                        {selected ? (
                            <CheckIcon sx={{ fontSize: 15 }} />
                        ) : null}
                    </Box>
                ) : null}
            </Stack>
        </Box>
    );
}

export function ProductModifiersDialog({
    open,
    onClose,
    productName,
    description,
    basePrice,
    modifierGroups,
    onConfirm,
}: ProductModifiersDialogProps) {
    const t = useTranslations("product.modifiers");
    const tCommon = useTranslations("common");
    const fmt = storePriceFormatter;
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

    const [selectedByGroup, setSelectedByGroup] = useState<
        Record<number, number[]>
    >({});

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

    const toggleRadio = (group: MenuModifierGroup, modifierId: number) => {
        const cur = selectedByGroup[group.id] ?? [];
        const isCurrentlySelected = cur[0] === modifierId;
        if (isCurrentlySelected && !group.required) {
            setSelectedByGroup((prev) => ({ ...prev, [group.id]: [] }));
            return;
        }
        setSelectedByGroup((prev) => ({ ...prev, [group.id]: [modifierId] }));
    };

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

    const dialogBody = (
        <Box
            sx={{
                display: "flex",
                flexDirection: "column",
                height: "100%",
                minHeight: 0,
                overflow: "hidden",
            }}
        >
            {/* Top bar: close */}
            <Box
                sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "flex-end",
                    flexShrink: 0,
                    px: { xs: 1, md: 2 },
                    pt: isMobile ? "env(safe-area-inset-top)" : 1,
                    pb: 0.5,
                }}
            >
                <IconButton
                    onClick={onClose}
                    aria-label={tCommon("aria.close")}
                    size="large"
                    sx={{ flexShrink: 0 }}
                >
                    <CloseIcon />
                </IconButton>
            </Box>

            {/* Scrollable content */}
            <Box
                sx={{
                    flex: 1,
                    minHeight: 0,
                    overflowY: "auto",
                    WebkitOverflowScrolling: "touch",
                    px: { xs: 2, md: 3 },
                    pb: 2,
                }}
            >
                <Typography
                    variant={isMobile ? "h5" : "h6"}
                    fontWeight={800}
                    sx={{ lineHeight: 1.2, mb: description ? 1 : 0.5 }}
                >
                    {productName}
                </Typography>

                {description?.trim() ? (
                    <Typography
                        variant="body2"
                        color="text.secondary"
                        sx={{ mb: 1, lineHeight: 1.5 }}
                    >
                        {description.trim()}
                    </Typography>
                ) : null}

                <Typography
                    variant="body1"
                    color="text.secondary"
                    sx={{ fontVariantNumeric: "tabular-nums", mb: 2 }}
                >
                    {t("fromPrice", { price: fmt.format(basePrice) })}
                </Typography>

                <Divider sx={{ mb: 3 }} />

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
                                sx={{ my: { xs: 0.5, md: 0 } }}
                            >
                                <Stack
                                    direction="row"
                                    alignItems="center"
                                    spacing={1}
                                    sx={{ mb: 1.5 }}
                                    flexWrap="wrap"
                                    useFlexGap
                                >
                                    <Typography
                                        variant="subtitle1"
                                        fontWeight={700}
                                        sx={{ lineHeight: 1.3 }}
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
                                                height: 24,
                                                fontSize: "0.75rem",
                                                fontWeight: 600,
                                            }}
                                        />
                                    ) : (
                                        <Chip
                                            label={t("optional")}
                                            size="small"
                                            variant="outlined"
                                            sx={{
                                                height: 24,
                                                fontSize: "0.75rem",
                                                color: "text.secondary",
                                            }}
                                        />
                                    )}
                                    {group.maxChoices > 1 ? (
                                        <Chip
                                            label={t("maxChoices", {
                                                n: group.maxChoices,
                                            })}
                                            size="small"
                                            variant="outlined"
                                            sx={{
                                                height: 24,
                                                fontSize: "0.75rem",
                                                color: "text.secondary",
                                            }}
                                        />
                                    ) : null}
                                    {!useRadio && group.maxChoices === 0 ? (
                                        <Chip
                                            label={t("unlimited")}
                                            size="small"
                                            variant="outlined"
                                            sx={{
                                                height: 24,
                                                fontSize: "0.75rem",
                                                color: "text.secondary",
                                            }}
                                        />
                                    ) : null}
                                </Stack>

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
            </Box>

            {/* Sticky footer */}
            <Box
                sx={{
                    flexShrink: 0,
                    position: "sticky",
                    bottom: 0,
                    bgcolor: "background.paper",
                    borderTop: 1,
                    borderColor: "divider",
                    px: { xs: 2, md: 3 },
                    py: 2,
                    pb: {
                        xs: "calc(16px + env(safe-area-inset-bottom))",
                        md: 2,
                    },
                    boxShadow: (t) =>
                        `0 -8px 24px ${alpha(t.palette.common.black, 0.06)}`,
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
                            sx={{ lineHeight: 1.2, textTransform: "uppercase" }}
                        >
                            {t("total")}
                        </Typography>
                        <Typography
                            variant={isMobile ? "h5" : "h6"}
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
                    <AppButton
                        variant="contained"
                        color="primary"
                        disabled={!canSubmit}
                        onClick={handleConfirm}
                        size="large"
                        sx={{
                            flexShrink: 0,
                            minWidth: { xs: 148, sm: 200 },
                            minHeight: 48,
                            px: 3,
                            borderRadius: 2.5,
                            textTransform: "none",
                            fontWeight: 800,
                            fontSize: "1rem",
                        }}
                    >
                        {t("addToCart")}
                    </AppButton>
                </Stack>
            </Box>
        </Box>
    );

    if (isMobile) {
        return (
            <Dialog
                open={open}
                onClose={onClose}
                fullScreen
                sx={{
                    "& .MuiDialog-paper": {
                        bgcolor: "background.paper",
                    },
                }}
            >
                {dialogBody}
            </Dialog>
        );
    }

    return (
        <Dialog
            open={open}
            onClose={onClose}
            fullWidth
            maxWidth="sm"
            slotProps={{
                paper: {
                    sx: {
                        borderRadius: 3,
                        overflow: "hidden",
                        maxHeight: "calc(100% - 64px)",
                    },
                },
            }}
        >
            <MotionBox
                initial={{ opacity: 0, scale: 0.96, y: 14 }}
                animate={
                    open
                        ? { opacity: 1, scale: 1, y: 0 }
                        : { opacity: 0, scale: 0.96, y: 14 }
                }
                transition={desktopPaperTransition}
                sx={{
                    display: "flex",
                    flexDirection: "column",
                    height: "100%",
                    maxHeight: "min(720px, calc(100vh - 64px))",
                }}
            >
                {dialogBody}
            </MotionBox>
        </Dialog>
    );
}
