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

import { getLocalizedField } from "@/lib/i18n-utils";

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
    const nameOf = (p: FilterableProduct) =>
        getLocalizedField(p.name, "ru") || getLocalizedField(p.name, "hy");
    const categoryOf = (p: FilterableProduct) =>
        p.category ? getLocalizedField(p.category.name, "ru") : "";

    return [...filtered].sort((a, b) => {
        switch (view.sortBy) {
            case "name":
                return nameOf(a).localeCompare(nameOf(b), "ru") * dir;
            case "category":
                return categoryOf(a).localeCompare(categoryOf(b), "ru") * dir;
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
}: ProductsToolbarProps) {
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
                    placeholder="Поиск: название, состав, ID…"
                    aria-label="Поиск товаров"
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
                                    aria-label="Очистить поиск"
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
                    label="Категория"
                    sx={{ minWidth: 160 }}
                >
                    <MenuItem value="all">Все категории</MenuItem>
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
                    label="Статус"
                    sx={{ minWidth: 140 }}
                >
                    <MenuItem value="all">Все</MenuItem>
                    <MenuItem value="active">На витрине</MenuItem>
                    <MenuItem value="hidden">Скрытые</MenuItem>
                </TextField>

                {/* Price range */}
                <TextField
                    size="small"
                    type="number"
                    value={view.priceMin}
                    onChange={(e) =>
                        onChange({ priceMin: e.target.value, page: 0 })
                    }
                    label="Цена от"
                    inputProps={{ min: 0, "aria-label": "Минимальная цена" }}
                    sx={{ width: 110 }}
                />
                <TextField
                    size="small"
                    type="number"
                    value={view.priceMax}
                    onChange={(e) =>
                        onChange({ priceMax: e.target.value, page: 0 })
                    }
                    label="до"
                    inputProps={{ min: 0, "aria-label": "Максимальная цена" }}
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
                    label="Создан с"
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
                    label="по"
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
                        ? `Показано ${filteredCount} из ${totalCount}`
                        : `Всего товаров: ${totalCount}`}
                </Typography>
                {activeFilters > 0 && (
                    <Chip
                        label={`Сбросить фильтры (${activeFilters})`}
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
