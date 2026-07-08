"use client";

import ClearIcon from "@mui/icons-material/Clear";
import SearchIcon from "@mui/icons-material/Search";
import {
    Box,
    Chip,
    InputAdornment,
    MenuItem,
    TextField,
    Typography,
} from "@mui/material";
import { useTranslations } from "next-intl";

import { getLocalizedField, type StoreLocale } from "@/lib/i18n-utils";

// ─── View model ───────────────────────────────────────────────────────────────

export type ProductSortBy =
    | "id"
    | "name"
    | "category"
    | "price"
    | "isActive"
    | "createdAt";

export type ProductTableView = {
    search: string;
    categoryId: number | "all";
    status: "all" | "active" | "hidden";
    priceMin: string;
    priceMax: string;
    dateFrom: string;
    dateTo: string;
    sortBy: ProductSortBy;
    sortDir: "asc" | "desc";
    page: number;
    rowsPerPage: number;
};

export const DEFAULT_PRODUCT_VIEW: ProductTableView = {
    search: "",
    categoryId: "all",
    status: "all",
    priceMin: "",
    priceMax: "",
    dateFrom: "",
    dateTo: "",
    sortBy: "id",
    sortDir: "asc",
    page: 0,
    rowsPerPage: 25,
};

type FilterableProduct = {
    id: number;
    name: unknown;
    composition: unknown;
    price: number;
    isActive: boolean;
    categoryId: number | null;
    category: { name: unknown } | null;
    createdAt?: string;
};

// ─── Filtering / sorting (pure) ───────────────────────────────────────────────

function searchableText(product: FilterableProduct): string {
    const parts: string[] = [String(product.id)];
    for (const locale of ["ru", "hy", "en"]) {
        parts.push(getLocalizedField(product.name, locale));
        parts.push(getLocalizedField(product.composition, locale));
        if (product.category) {
            parts.push(getLocalizedField(product.category.name, locale));
        }
    }
    return parts.join(" ").toLowerCase();
}

export function filterAndSortProducts<T extends FilterableProduct>(
    products: readonly T[],
    view: ProductTableView,
    contentLocale: StoreLocale = "hy",
): T[] {
    const query = view.search.trim().toLowerCase();
    const priceMin = view.priceMin ? Number(view.priceMin) : null;
    const priceMax = view.priceMax ? Number(view.priceMax) : null;
    const dateFrom = view.dateFrom ? new Date(view.dateFrom).getTime() : null;
    const dateTo = view.dateTo
        ? new Date(view.dateTo).getTime() + 24 * 60 * 60 * 1000 - 1
        : null;

    const filtered = products.filter((product) => {
        if (query && !searchableText(product).includes(query)) return false;
        if (view.categoryId !== "all" && product.categoryId !== view.categoryId)
            return false;
        if (view.status === "active" && !product.isActive) return false;
        if (view.status === "hidden" && product.isActive) return false;
        if (priceMin !== null && product.price < priceMin) return false;
        if (priceMax !== null && product.price > priceMax) return false;
        if (dateFrom !== null || dateTo !== null) {
            const created = product.createdAt
                ? new Date(product.createdAt).getTime()
                : null;
            if (created === null) return false;
            if (dateFrom !== null && created < dateFrom) return false;
            if (dateTo !== null && created > dateTo) return false;
        }
        return true;
    });

    const dir = view.sortDir === "asc" ? 1 : -1;
    const nameOf = (p: FilterableProduct) => getLocalizedField(p.name, contentLocale);
    const categoryOf = (p: FilterableProduct) =>
        p.category ? getLocalizedField(p.category.name, contentLocale) : "";

    return [...filtered].sort((a, b) => {
        switch (view.sortBy) {
            case "name":
                return nameOf(a).localeCompare(nameOf(b), contentLocale) * dir;
            case "category":
                return categoryOf(a).localeCompare(categoryOf(b), contentLocale) * dir;
            case "price":
                return (a.price - b.price) * dir;
            case "isActive":
                return (Number(a.isActive) - Number(b.isActive)) * dir;
            case "createdAt": {
                const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0;
                const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0;
                return (ta - tb) * dir;
            }
            case "id":
            default:
                return (a.id - b.id) * dir;
        }
    });
}

export function countActiveFilters(view: ProductTableView): number {
    let n = 0;
    if (view.search.trim()) n++;
    if (view.categoryId !== "all") n++;
    if (view.status !== "all") n++;
    if (view.priceMin || view.priceMax) n++;
    if (view.dateFrom || view.dateTo) n++;
    return n;
}

// ─── Toolbar ──────────────────────────────────────────────────────────────────

type CategoryOption = { id: number; label: string };

type ProductsToolbarProps = {
    view: ProductTableView;
    categories: CategoryOption[];
    totalCount: number;
    filteredCount: number;
    onChange: (patch: Partial<ProductTableView>) => void;
};

export function ProductsToolbar({
    view,
    categories,
    totalCount,
    filteredCount,
    onChange,
    contentLocale,
}: ProductsToolbarProps & { contentLocale: StoreLocale }) {
    const t = useTranslations("admin.products");
    const tCommon = useTranslations("admin.common");
    const tAi = useTranslations("admin.aiTranslate");
    const activeFilters = countActiveFilters(view);

    return (
        <Box sx={{ mb: 2 }}>
            <Box
                sx={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: 1.5,
                    alignItems: "center",
                }}
            >
                {/* Search */}
                <TextField
                    size="small"
                    value={view.search}
                    onChange={(e) =>
                        onChange({ search: e.target.value, page: 0 })
                    }
                    placeholder={t("searchPlaceholder")}
                    aria-label={t("searchAria")}
                    sx={{ flex: "1 1 240px", minWidth: 200, maxWidth: 380 }}
                    InputProps={{
                        startAdornment: (
                            <InputAdornment position="start">
                                <SearchIcon sx={{ fontSize: 18 }} />
                            </InputAdornment>
                        ),
                        endAdornment: view.search ? (
                            <InputAdornment position="end">
                                <ClearIcon
                                    sx={{ fontSize: 16, cursor: "pointer" }}
                                    onClick={() =>
                                        onChange({ search: "", page: 0 })
                                    }
                                    aria-label={t("clearSearch")}
                                />
                            </InputAdornment>
                        ) : undefined,
                    }}
                />

                {/* Category */}
                <TextField
                    select
                    size="small"
                    value={view.categoryId}
                    onChange={(e) =>
                        onChange({
                            categoryId:
                                e.target.value === "all"
                                    ? "all"
                                    : Number(e.target.value),
                            page: 0,
                        })
                    }
                    label={tCommon("category")}
                    sx={{ minWidth: 160 }}
                >
                    <MenuItem value="all">{t("allCategories")}</MenuItem>
                    {categories.map((c) => (
                        <MenuItem key={c.id} value={c.id}>
                            {c.label}
                        </MenuItem>
                    ))}
                </TextField>

                {/* Status */}
                <TextField
                    select
                    size="small"
                    value={view.status}
                    onChange={(e) =>
                        onChange({
                            status: e.target
                                .value as ProductTableView["status"],
                            page: 0,
                        })
                    }
                    label={tCommon("status")}
                    sx={{ minWidth: 140 }}
                >
                    <MenuItem value="all">{tCommon("all")}</MenuItem>
                    <MenuItem value="active">{tCommon("onShelf")}</MenuItem>
                    <MenuItem value="hidden">{t("statusHidden")}</MenuItem>
                </TextField>

                {/* Price range */}
                <TextField
                    size="small"
                    type="number"
                    value={view.priceMin}
                    onChange={(e) =>
                        onChange({ priceMin: e.target.value, page: 0 })
                    }
                    label={t("priceFrom")}
                    inputProps={{ min: 0, "aria-label": t("minPriceAria") }}
                    sx={{ width: 110 }}
                />
                <TextField
                    size="small"
                    type="number"
                    value={view.priceMax}
                    onChange={(e) =>
                        onChange({ priceMax: e.target.value, page: 0 })
                    }
                    label={t("priceTo")}
                    inputProps={{ min: 0, "aria-label": t("maxPriceAria") }}
                    sx={{ width: 110 }}
                />

                {/* Date range */}
                <TextField
                    size="small"
                    type="date"
                    value={view.dateFrom}
                    onChange={(e) =>
                        onChange({ dateFrom: e.target.value, page: 0 })
                    }
                    label={t("createdFrom")}
                    InputLabelProps={{ shrink: true }}
                    sx={{ width: 160 }}
                />
                <TextField
                    size="small"
                    type="date"
                    value={view.dateTo}
                    onChange={(e) =>
                        onChange({ dateTo: e.target.value, page: 0 })
                    }
                    label={t("createdTo")}
                    InputLabelProps={{ shrink: true }}
                    sx={{ width: 160 }}
                />
            </Box>

            {/* Summary row */}
            <Box
                sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 1,
                    mt: 1,
                    minHeight: 28,
                }}
            >
                <Typography variant="caption" color="text.secondary">
                    {activeFilters > 0
                        ? t("shownOfTotal", {
                              filtered: filteredCount,
                              total: totalCount,
                          })
                        : t("totalProducts", { total: totalCount })}
                </Typography>
                <Chip
                    label={tAi("contentLanguageChip", {
                        locale: contentLocale.toUpperCase(),
                    })}
                    size="small"
                    variant="outlined"
                    sx={{ fontWeight: 700, fontSize: "0.68rem" }}
                />
                {activeFilters > 0 && (
                    <Chip
                        label={t("resetFiltersChip", { count: activeFilters })}
                        size="small"
                        onDelete={() =>
                            onChange({
                                ...DEFAULT_PRODUCT_VIEW,
                                sortBy: view.sortBy,
                                sortDir: view.sortDir,
                                rowsPerPage: view.rowsPerPage,
                            })
                        }
                        onClick={() =>
                            onChange({
                                ...DEFAULT_PRODUCT_VIEW,
                                sortBy: view.sortBy,
                                sortDir: view.sortDir,
                                rowsPerPage: view.rowsPerPage,
                            })
                        }
                        sx={{ fontWeight: 600 }}
                    />
                )}
            </Box>
        </Box>
    );
}
