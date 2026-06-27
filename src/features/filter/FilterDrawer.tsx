"use client";

import CloseIcon from "@mui/icons-material/Close";
import Box from "@mui/material/Box";
import Drawer from "@mui/material/Drawer";
import IconButton from "@mui/material/IconButton";
import Slider from "@mui/material/Slider";
import { alpha, useTheme } from "@mui/material/styles";
import Typography from "@mui/material/Typography";
import { useTranslations } from "next-intl";
import { startTransition } from "react";

import { AppButton } from "@/shared/ui";
import { tokens } from "@/shared/ui/theme";

import type { PriceRange } from "./types";

type FilterDrawerProps = {
    isOpen: boolean;
    onClose: () => void;
    priceRange: PriceRange;
    minPrice: number;
    maxPrice: number;
    resultCount: number;
    onPriceRangeChange: (range: PriceRange) => void;
    onReset: () => void;
};

const sectionTitleSx = {
    fontWeight: 600,
    color: "text.primary",
    mb: 1.5,
    letterSpacing: 0.02,
} as const;

function formatPriceLabel(value: number): string {
    return `${value.toLocaleString("ru-RU")} ֏`;
}

function sliderStep(minPrice: number, maxPrice: number): number {
    const span = maxPrice - minPrice;
    if (span <= 0) return 1;
    if (span <= 1000) return 50;
    if (span <= 5000) return 100;
    return 250;
}

export function FilterDrawer({
    isOpen,
    onClose,
    priceRange,
    minPrice,
    maxPrice,
    resultCount,
    onPriceRangeChange,
    onReset,
}: FilterDrawerProps) {
    const t = useTranslations("menu");
    const tCommon = useTranslations("common.aria");
    const theme = useTheme();

    const handleSliderChange = (_: Event, value: number | number[]) => {
        if (!Array.isArray(value)) return;
        startTransition(() => {
            onPriceRangeChange([value[0], value[1]]);
        });
    };

    const showResultsLabel =
        resultCount > 0
            ? t("show_results_count", { count: resultCount })
            : t("show_results");

    const priceSliderDisabled = minPrice >= maxPrice;

    return (
        <Drawer
            anchor="right"
            open={isOpen}
            onClose={onClose}
            slotProps={{
                backdrop: { sx: { bgcolor: alpha(theme.palette.common.black, 0.35) } },
            }}
            PaperProps={{
                sx: {
                    width: { xs: "100%", sm: 400 },
                    maxWidth: "100%",
                    display: "flex",
                    flexDirection: "column",
                    borderLeft: `1px solid ${tokens.border}`,
                },
            }}
        >
            {/* Header */}
            <Box
                sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 1,
                    px: 2,
                    py: 1.5,
                    borderBottom: `1px solid ${tokens.border}`,
                    flexShrink: 0,
                }}
            >
                <Box sx={{ width: 44, flexShrink: 0 }} />

                <Typography
                    component="h2"
                    variant="h6"
                    sx={{
                        fontWeight: 700,
                        textAlign: "center",
                        flex: 1,
                        px: 1,
                    }}
                >
                    {t("filters_title")}
                </Typography>

                <IconButton
                    onClick={onClose}
                    aria-label={tCommon("close")}
                    edge="end"
                    sx={{ flexShrink: 0 }}
                >
                    <CloseIcon fontSize="small" />
                </IconButton>
            </Box>

            {/* Scrollable content */}
            <Box
                sx={{
                    flex: 1,
                    overflowY: "auto",
                    WebkitOverflowScrolling: "touch",
                    px: 2.5,
                    py: 2.5,
                }}
            >
                <Typography variant="subtitle2" sx={sectionTitleSx}>
                    {t("price_range")}
                </Typography>

                <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ mb: 2, fontWeight: 500 }}
                >
                    {t("price_from")} {formatPriceLabel(priceRange[0])} —{" "}
                    {t("price_to")} {formatPriceLabel(priceRange[1])}
                </Typography>

                <Box sx={{ px: 1, pb: 1 }}>
                    <Slider
                        value={priceRange}
                        onChange={handleSliderChange}
                        min={minPrice}
                        max={maxPrice}
                        step={sliderStep(minPrice, maxPrice)}
                        valueLabelDisplay="auto"
                        valueLabelFormat={formatPriceLabel}
                        disabled={priceSliderDisabled}
                        sx={{
                            color: tokens.brand,
                            "& .MuiSlider-thumb": {
                                width: 20,
                                height: 20,
                                boxShadow: `0 2px 8px ${alpha(tokens.brand, 0.35)}`,
                            },
                            "& .MuiSlider-rail": {
                                opacity: 0.25,
                            },
                        }}
                    />
                </Box>
            </Box>

            {/* Sticky footer */}
            <Box
                sx={{
                    flexShrink: 0,
                    px: 2.5,
                    py: 2,
                    borderTop: `1px solid ${tokens.border}`,
                    bgcolor: "background.paper",
                    pb: "calc(16px + env(safe-area-inset-bottom))",
                    display: "flex",
                    flexDirection: "column",
                    gap: 1,
                }}
            >
                <AppButton
                    variant="text"
                    color="inherit"
                    onClick={onReset}
                    sx={{
                        alignSelf: "center",
                        color: "text.secondary",
                        fontWeight: 600,
                        fontSize: "0.875rem",
                        minHeight: 40,
                    }}
                >
                    {t("reset_all")}
                </AppButton>

                <AppButton
                    fullWidth
                    variant="contained"
                    onClick={onClose}
                    sx={{ py: 1.5, fontSize: "0.9375rem" }}
                >
                    {showResultsLabel}
                </AppButton>
            </Box>
        </Drawer>
    );
}
