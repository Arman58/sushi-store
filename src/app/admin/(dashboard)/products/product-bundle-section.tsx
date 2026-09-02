"use client";

import AddIcon from "@mui/icons-material/Add";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import DiscountIcon from "@mui/icons-material/Discount";
import {
    Alert,
    Autocomplete,
    Avatar,
    Box,
    Button,
    Chip,
    IconButton,
    Paper,
    Stack,
    TextField,
    Typography,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";
import { type Control, type UseFormSetValue, useWatch } from "react-hook-form";

import { useLocalizedFieldFn } from "@/features/admin/hooks/use-admin-content-locale";
import { formatStorePrice } from "@/shared/lib/format-price";
import { getProductCoverUrl } from "@/shared/lib/product-cover";
import { showAppToast } from "@/shared/lib/show-app-toast";
import { tokens } from "@/shared/ui/theme";

import type { ProductDialogFormValues } from "./product-form-types";

export type BundleCandidateProduct = {
    id: number;
    name: unknown;
    price: number;
    mainImage?: string | null;
    images?: unknown;
};

type Props = {
    control: Control<ProductDialogFormValues>;
    setValue: UseFormSetValue<ProductDialogFormValues>;
    allProducts: BundleCandidateProduct[];
    currentProductId?: number;
};

export function ProductBundleSection({
    control,
    setValue,
    allProducts,
    currentProductId,
}: Props) {
    const t = useTranslations("admin.products");
    const lf = useLocalizedFieldFn();

    const rawBundleItems = useWatch({ control, name: "bundleItems" });
    const bundleItems = useMemo(() => rawBundleItems ?? [], [rawBundleItems]);
    const setPriceRaw = useWatch({ control, name: "price" }) ?? "0";
    const currentPrice = Number.parseInt(setPriceRaw, 10) || 0;

    const [selectedCandidate, setSelectedCandidate] =
        useState<BundleCandidateProduct | null>(null);
    const [candidateQty, setCandidateQty] = useState("1");

    // Кандидаты для добавления (исключаем текущий редактируемый товар)
    const availableCandidates = useMemo(() => {
        const existingIds = new Set(bundleItems.map((b) => b.productId));
        return allProducts.filter(
            (p) => p.id !== currentProductId && !existingIds.has(p.id),
        );
    }, [allProducts, bundleItems, currentProductId]);

    // Карта продуктов по id для быстрого доступа
    const productsMap = useMemo(() => {
        const map = new Map<number, BundleCandidateProduct>();
        for (const p of allProducts) {
            map.set(p.id, p);
        }
        return map;
    }, [allProducts]);

    // Суммарная цена блюд по отдельности
    const totalOriginalPrice = useMemo(() => {
        let sum = 0;
        for (const item of bundleItems) {
            const prod = productsMap.get(item.productId);
            if (prod) {
                sum += prod.price * item.quantity;
            }
        }
        return sum;
    }, [bundleItems, productsMap]);

    const handleAddItem = () => {
        if (!selectedCandidate) return;
        const qty = Math.max(1, Number.parseInt(candidateQty, 10) || 1);
        const next = [...bundleItems, { productId: selectedCandidate.id, quantity: qty }];
        setValue("bundleItems", next, { shouldDirty: true, shouldTouch: true });
        setSelectedCandidate(null);
        setCandidateQty("1");
    };

    const handleRemoveItem = (productId: number) => {
        const next = bundleItems.filter((b) => b.productId !== productId);
        setValue("bundleItems", next, { shouldDirty: true, shouldTouch: true });
    };

    const handleUpdateQuantity = (productId: number, newQty: number) => {
        const qty = Math.max(1, newQty);
        const next = bundleItems.map((b) =>
            b.productId === productId ? { ...b, quantity: qty } : b,
        );
        setValue("bundleItems", next, { shouldDirty: true, shouldTouch: true });
    };

    const handleApplyTotalAsOriginalPrice = () => {
        if (totalOriginalPrice > 0) {
            setValue("originalPrice", String(totalOriginalPrice), {
                shouldDirty: true,
                shouldTouch: true,
                shouldValidate: true,
            });
            showAppToast(
                t("bundleToastOriginalPrice", {
                    amount: formatStorePrice(totalOriginalPrice),
                }),
                "success",
            );
        }
    };

    const handleGenerateComposition = () => {
        if (bundleItems.length === 0) return;
        const resolveName = (p: BundleCandidateProduct | undefined, lang: string, fallback: string) => {
            if (!p) return fallback;
            if (p.name && typeof p.name === "object" && lang in p.name) {
                const val = (p.name as Record<string, string>)[lang];
                if (val && typeof val === "string" && val.trim()) return val.trim();
            }
            return lf(p.name) || fallback;
        };

        const textRu = bundleItems
            .map((item) => `${resolveName(productsMap.get(item.productId), "ru", `Товар #${item.productId}`)} (${item.quantity} шт.)`)
            .join(", ");
        const textHy = bundleItems
            .map((item) => `${resolveName(productsMap.get(item.productId), "hy", `Ապրանք #${item.productId}`)} (${item.quantity} հատ)`)
            .join(", ");
        const textEn = bundleItems
            .map((item) => `${resolveName(productsMap.get(item.productId), "en", `Item #${item.productId}`)} (${item.quantity} pcs)`)
            .join(", ");

        setValue(
            "composition",
            {
                ru: textRu,
                hy: textHy,
                en: textEn,
            },
            { shouldDirty: true, shouldTouch: true, shouldValidate: true },
        );
        showAppToast(t("bundleToastComposition"), "success");
    };

    const savings = totalOriginalPrice > currentPrice ? totalOriginalPrice - currentPrice : 0;
    const discountPercent =
        totalOriginalPrice > 0 && savings > 0
            ? Math.round((savings / totalOriginalPrice) * 100)
            : 0;

    return (
        <Paper
            variant="outlined"
            sx={{
                p: { xs: 2, sm: 2.5 },
                borderRadius: 3,
                bgcolor: (theme) => alpha(theme.palette.primary.main, 0.02),
                borderColor: (theme) => alpha(theme.palette.primary.main, 0.25),
            }}
        >
            <Stack spacing={2}>
                <Box>
                    <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 0.5 }}>
                        <DiscountIcon color="primary" fontSize="small" />
                        <Typography variant="subtitle1" fontWeight={800}>
                            {t("bundleSectionTitle")}
                        </Typography>
                        {bundleItems.length > 0 && (
                            <Chip
                                label={t("bundleItemsCount", { count: bundleItems.length })}
                                size="small"
                                color="primary"
                                sx={{ fontWeight: 700 }}
                            />
                        )}
                    </Stack>
                    <Typography variant="body2" color="text.secondary">
                        {t("bundleSectionSubtitle")}
                    </Typography>
                </Box>

                {/* Список добавленных позиций */}
                {bundleItems.length > 0 ? (
                    <Stack spacing={1}>
                        {bundleItems.map((item, index) => {
                            const prod = productsMap.get(item.productId);
                            const name = prod ? lf(prod.name) : `#${item.productId}`;
                            const unitPrice = prod?.price ?? 0;
                            const lineTotal = unitPrice * item.quantity;
                            const cover = prod
                                ? getProductCoverUrl({
                                      images: prod.images,
                                      mainImage: prod.mainImage,
                                  })
                                : null;

                            return (
                                <Paper
                                    key={item.productId}
                                    variant="outlined"
                                    sx={{
                                        p: { xs: 1.25, sm: 1.5 },
                                        borderRadius: 2,
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "space-between",
                                        flexWrap: "wrap",
                                        gap: 1.5,
                                        bgcolor: tokens.surface,
                                        transition: "border-color 0.2s, box-shadow 0.2s",
                                        "&:hover": {
                                            borderColor: "primary.main",
                                        },
                                    }}
                                >
                                    <Stack direction="row" alignItems="center" spacing={1.5} sx={{ minWidth: 0, flex: "1 1 200px" }}>
                                        <Chip
                                            label={index + 1}
                                            size="small"
                                            sx={{
                                                width: 24,
                                                height: 24,
                                                fontWeight: 800,
                                                fontSize: "0.75rem",
                                                bgcolor: tokens.surfaceHi,
                                                borderRadius: "50%",
                                                flexShrink: 0,
                                            }}
                                        />
                                        <Avatar
                                            src={cover ?? undefined}
                                            variant="rounded"
                                            sx={{ width: 44, height: 44, borderRadius: 1.5, flexShrink: 0 }}
                                        />
                                        <Box sx={{ minWidth: 0 }}>
                                            <Typography
                                                variant="body2"
                                                fontWeight={700}
                                                noWrap
                                                sx={{ maxWidth: { xs: 170, sm: 280 } }}
                                            >
                                                {name}
                                            </Typography>
                                            <Typography variant="caption" color="text.secondary">
                                                {t("bundlePerUnit", { price: formatStorePrice(unitPrice) })}
                                            </Typography>
                                        </Box>
                                    </Stack>

                                    <Stack direction="row" alignItems="center" spacing={1.5} sx={{ ml: "auto" }}>
                                        <TextField
                                            type="number"
                                            size="small"
                                            label={t("bundleUnitQty")}
                                            value={item.quantity}
                                            onChange={(e) =>
                                                handleUpdateQuantity(
                                                    item.productId,
                                                    Number.parseInt(e.target.value, 10) || 1,
                                                )
                                            }
                                            inputProps={{ min: 1, max: 99, style: { textAlign: "center", fontWeight: 700 } }}
                                            sx={{ width: 75 }}
                                        />
                                        <Typography
                                            variant="body2"
                                            fontWeight={800}
                                            sx={{ minWidth: 70, textAlign: "right" }}
                                        >
                                            {formatStorePrice(lineTotal)} ֏
                                        </Typography>
                                        <IconButton
                                            size="small"
                                            color="error"
                                            onClick={() => handleRemoveItem(item.productId)}
                                            title={t("bundleDeleteFromSet")}
                                        >
                                            <DeleteOutlineIcon fontSize="small" />
                                        </IconButton>
                                    </Stack>
                                </Paper>
                            );
                        })}
                    </Stack>
                ) : (
                    <Alert severity="info" sx={{ borderRadius: 2 }}>
                        {t("bundleEmpty")}
                    </Alert>
                )}

                {/* Строка добавления новой позиции */}
                <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} alignItems={{ xs: "stretch", sm: "center" }}>
                    <Autocomplete
                        options={availableCandidates}
                        value={selectedCandidate}
                        onChange={(_, val) => setSelectedCandidate(val)}
                        getOptionKey={(option) => option.id}
                        getOptionLabel={(option) =>
                            `${lf(option.name)} · ${formatStorePrice(option.price)} ֏`
                        }
                        isOptionEqualToValue={(o, v) => o.id === v.id}
                        renderOption={(props, option) => {
                            const { key, ...otherProps } = props;
                            const cover = getProductCoverUrl({
                                images: option.images,
                                mainImage: option.mainImage,
                            });
                            return (
                                <li key={key ?? option.id} {...otherProps}>
                                    <Stack direction="row" alignItems="center" spacing={1.5} sx={{ width: "100%", py: 0.5 }}>
                                        <Avatar
                                            src={cover ?? undefined}
                                            variant="rounded"
                                            sx={{ width: 34, height: 34, borderRadius: 1.5, flexShrink: 0 }}
                                        />
                                        <Box sx={{ flex: 1, minWidth: 0 }}>
                                            <Typography variant="body2" fontWeight={600} noWrap>
                                                {lf(option.name)}
                                            </Typography>
                                            <Typography variant="caption" color="text.secondary">
                                                ID: #{option.id}
                                            </Typography>
                                        </Box>
                                        <Chip
                                            label={`${formatStorePrice(option.price)} ֏`}
                                            size="small"
                                            sx={{
                                                fontWeight: 700,
                                                fontSize: "0.75rem",
                                                bgcolor: (theme) => alpha(theme.palette.primary.main, 0.08),
                                                color: "primary.main",
                                            }}
                                        />
                                    </Stack>
                                </li>
                            );
                        }}
                        renderInput={(params) => (
                            <TextField
                                {...params}
                                size="small"
                                placeholder={t("bundleSelectPlaceholder")}
                            />
                        )}
                        sx={{ flex: 1, minWidth: { xs: "100%", sm: 260 } }}
                    />

                    <Stack direction="row" spacing={1} sx={{ width: { xs: "100%", sm: "auto" } }}>
                        <TextField
                            size="small"
                            type="number"
                            label={t("bundlePieces")}
                            value={candidateQty}
                            onChange={(e) => setCandidateQty(e.target.value)}
                            inputProps={{ min: 1, max: 99, style: { textAlign: "center" } }}
                            sx={{ width: { xs: 90, sm: 80 } }}
                        />
                        <Button
                            variant="contained"
                            size="medium"
                            startIcon={<AddIcon />}
                            onClick={handleAddItem}
                            disabled={!selectedCandidate}
                            sx={{
                                borderRadius: 2,
                                fontWeight: 700,
                                flex: 1,
                                minWidth: { sm: 120 },
                                whiteSpace: "nowrap",
                            }}
                        >
                            {t("bundleAddToSet")}
                        </Button>
                    </Stack>
                </Stack>

                {/* Калькулятор выгоды и автогенерация */}
                {bundleItems.length > 0 && (
                    <Paper
                        variant="outlined"
                        sx={{
                            p: 2,
                            borderRadius: 2.5,
                            bgcolor: (theme) =>
                                savings > 0
                                    ? alpha(theme.palette.success.main, 0.08)
                                    : alpha(theme.palette.info.main, 0.06),
                            borderColor: (theme) =>
                                savings > 0
                                    ? alpha(theme.palette.success.main, 0.3)
                                    : alpha(theme.palette.info.main, 0.2),
                        }}
                    >
                        <Stack spacing={1.5}>
                            <Stack
                                direction={{ xs: "column", sm: "row" }}
                                justifyContent="space-between"
                                alignItems={{ xs: "flex-start", sm: "center" }}
                                spacing={1}
                            >
                                <Box>
                                    <Typography variant="body2" color="text.secondary">
                                        {t("bundleSumSeparate")}{" "}
                                        <b>{formatStorePrice(totalOriginalPrice)} ֏</b>
                                    </Typography>
                                    {savings > 0 ? (
                                        <Typography variant="body2" color="success.main" fontWeight={700}>
                                            {t("bundleSavings", {
                                                amount: formatStorePrice(savings),
                                                percent: discountPercent,
                                            })}
                                        </Typography>
                                    ) : (
                                        <Typography variant="caption" color="text.secondary">
                                            {t("bundlePriceTip")}
                                        </Typography>
                                    )}
                                </Box>

                                <Stack direction="row" spacing={1}>
                                    <Button
                                        type="button"
                                        size="small"
                                        variant="outlined"
                                        color="primary"
                                        onClick={handleApplyTotalAsOriginalPrice}
                                        sx={{ textTransform: "none", fontWeight: 700, borderRadius: 2 }}
                                    >
                                        {t("bundleBtnOriginalPrice")}
                                    </Button>
                                    <Button
                                        type="button"
                                        size="small"
                                        variant="outlined"
                                        startIcon={<AutoAwesomeIcon sx={{ fontSize: 16 }} />}
                                        onClick={handleGenerateComposition}
                                        sx={{ textTransform: "none", fontWeight: 700, borderRadius: 2 }}
                                    >
                                        {t("bundleBtnComposition")}
                                    </Button>
                                </Stack>
                            </Stack>
                        </Stack>
                    </Paper>
                )}
            </Stack>
        </Paper>
    );
}
