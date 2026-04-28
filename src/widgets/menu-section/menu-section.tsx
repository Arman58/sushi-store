// src/widgets/menu-section/menu-section.tsx
"use client";

import RestaurantMenuOutlined from "@mui/icons-material/RestaurantMenuOutlined";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import FormControl from "@mui/material/FormControl";
import MenuItem from "@mui/material/MenuItem";
import Paper from "@mui/material/Paper";
import type { SelectChangeEvent } from "@mui/material/Select";
import Select from "@mui/material/Select";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";

import { ProductCard } from "@/entities/product/ui/product-card";
import { useCartStore } from "@/features/cart";
import { getProductCoverUrl } from "@/shared/lib/product-cover";
import { tokens } from "@/shared/ui/theme";

export type MenuCategory = {
    id: number;
    name: string;
    slug: string;
};

export type MenuProduct = {
    id: number;
    name: string;
    slug: string;
    description?: string | null;
    composition?: string | null;
    price: number;
    weight?: number | null;
    images?: unknown;
    mainImage?: string | null;
    category?: MenuCategory | null;
};

type MenuSectionProps = {
    categories: MenuCategory[];
    products: MenuProduct[];
};

// ─── Price filter config ──────────────────────────────────────────────────────

type PriceFilter = "all" | "lt3" | "lt5" | "gt5";

type SortBy = "name" | "price_asc";

const filterSelectMenuProps = {
    PaperProps: {
        sx: {
            borderRadius: 2,
            boxShadow: "0 4px 15px rgba(0,0,0,0.08)",
            mt: 0.5,
            border: "1px solid rgba(0,0,0,0.05)",
        },
    },
} as const;

const filterMenuItemSx = {
    color: "text.primary",
    fontSize: "0.85rem",
    py: 0.8,
    borderRadius: 1,
    mx: 0.5,
    "&:hover": { backgroundColor: "#f5f5f5" },
} as const;

const filterSelectSx = {
    borderRadius: 50,
    px: 2.5,
    py: 1.2,
    height: 40,
    fontSize: "0.85rem",
    textTransform: "none" as const,
    backgroundColor: "#f7f7f8",
    "& .MuiOutlinedInput-notchedOutline": { border: "none" },
    "& .MuiSvgIcon-root": { color: "text.secondary" },
    "&:hover": { backgroundColor: "#efefef" },
    "&.Mui-focused": {
        boxShadow: "0 0 0 2px rgba(0,0,0,0.1)",
    },
    "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
        border: "none",
    },
} as const;

const SORT_LABELS: Record<SortBy, string> = {
    name: "По алфавиту",
    price_asc: "Цена ↑",
};

const PRICE_LABELS: Record<PriceFilter, string> = {
    all: "Все цены",
    lt3: "< 3000֏",
    lt5: "< 5000֏",
    gt5: "> 5000֏",
};

// ─── Component ────────────────────────────────────────────────────────────────

export function MenuSection({ categories, products }: MenuSectionProps) {
    const searchParams = useSearchParams();

    const addItem = useCartStore((s) => s.addItem);
    const setItemQuantity = useCartStore((s) => s.setItemQuantity);
    const cartItems = useCartStore((s) => s.items);
    const [search, setSearch] = useState("");
    const [sort, setSort] = useState<SortBy>("name");
    const [priceFilter, setPriceFilter] = useState<PriceFilter>("all");

    const allSlugs = useMemo(
        () => ["all", ...categories.map((c) => c.slug)],
        [categories],
    );
    const categoryFromUrl = searchParams.get("category") ?? undefined;
    const activeSlug =
        categoryFromUrl && allSlugs.includes(categoryFromUrl)
            ? categoryFromUrl
            : "all";

    const filteredProducts = useMemo(() => {
        const base =
            activeSlug === "all"
                ? products
                : products.filter((p) => p.category?.slug === activeSlug);

        const byPrice = base.filter((p) => {
            if (priceFilter === "lt3") return p.price < 3000;
            if (priceFilter === "lt5") return p.price < 5000;
            if (priceFilter === "gt5") return p.price >= 5000;
            return true;
        });

        const query = search.trim().toLowerCase();
        const withSearch =
            query.length === 0
                ? byPrice
                : byPrice.filter(
                      (p) =>
                          p.name.toLowerCase().includes(query) ||
                          (p.description ?? "").toLowerCase().includes(query),
                  );

        return [...withSearch].sort((a, b) => {
            if (sort === "price_asc") return a.price - b.price;
            return a.name.localeCompare(b.name, "ru");
        });
    }, [activeSlug, priceFilter, products, search, sort]);

    const productsInActiveCategory = useMemo(() => {
        if (activeSlug === "all") return products;
        return products.filter((p) => p.category?.slug === activeSlug);
    }, [activeSlug, products]);

    /** Категория выбрана, но в ней ещё нет ни одного товара (не «ничего не нашлось» по поиску). */
    const isEmptyCategoryShelf =
        activeSlug !== "all" && productsInActiveCategory.length === 0;

    const { totalCount, totalPrice } = useMemo(
        () => ({
            totalCount: cartItems.reduce((s, i) => s + i.quantity, 0),
            totalPrice: cartItems.reduce((s, i) => s + i.price * i.quantity, 0),
        }),
        [cartItems],
    );

    const handleAddToCart = (p: MenuProduct) => {
        addItem({
            productId: p.id,
            name: p.name,
            price: p.price,
            image: getProductCoverUrl({ images: p.images, mainImage: p.mainImage }) || "",
        });
    };
    const handleIncrease = (productId: number) => {
        const qty =
            (cartItems.find((i) => i.productId === productId)?.quantity ?? 0) +
            1;
        setItemQuantity(productId, qty);
    };
    const handleDecrease = (productId: number) => {
        const qty =
            (cartItems.find((i) => i.productId === productId)?.quantity ?? 0) -
            1;
        setItemQuantity(productId, qty);
    };

    const selectedPrice = priceFilter;

    const handleSortChange = (e: SelectChangeEvent<SortBy>) => {
        setSort(e.target.value as SortBy);
    };

    const handlePriceFilterChange = (e: SelectChangeEvent<PriceFilter>) => {
        setPriceFilter(e.target.value as PriceFilter);
    };

    return (
        <Box sx={{ mt: 3, display: "flex", flexDirection: "column", gap: 2 }}>
            {/* ══════════════════════════════════════════════════════
                STICKY FILTER HEADER
            ══════════════════════════════════════════════════════ */}
            <Paper
                elevation={0}
                sx={{
                    position: "sticky",
                    top: { xs: 56, sm: 64 },
                    zIndex: 10,
                    px: { xs: 2, md: 3 },
                    py: 2,
                    mb: 2,
                    bgcolor: "#ffffff",
                    borderBottom: "1px solid #e0e0e0",
                }}
            >
                <Stack
                    direction={{ xs: "column", sm: "row" }}
                    spacing={{ xs: 1.5, sm: 2 }}
                    alignItems="center"
                    justifyContent="space-between"
                >
                    <TextField
                        fullWidth
                        variant="outlined"
                        size="small"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Поиск..."
                        sx={{
                            flex: { xs: 1, sm: "unset" },
                            minWidth: { sm: 220 },
                            "& .MuiOutlinedInput-root": { borderRadius: 2 },
                        }}
                    />

                    <Stack
                        direction={{ xs: "column", sm: "row" }}
                        spacing={{ xs: 1.5, sm: 2 }}
                        alignItems="stretch"
                        sx={{ width: { xs: "100%", sm: "auto" } }}
                    >
                        <FormControl
                            size="small"
                            sx={{ minWidth: 150 }}
                            variant="outlined"
                        >
                            <Select<SortBy>
                                displayEmpty
                                value={sort}
                                onChange={handleSortChange}
                                variant="outlined"
                                inputProps={{
                                    "aria-label": "Сортировка",
                                }}
                                renderValue={(value) =>
                                    (value &&
                                        SORT_LABELS[value as SortBy]) ||
                                    "Сортировка"
                                }
                                MenuProps={filterSelectMenuProps}
                                sx={filterSelectSx}
                            >
                                <MenuItem value="name" sx={filterMenuItemSx}>
                                    По алфавиту
                                </MenuItem>
                                <MenuItem value="price_asc" sx={filterMenuItemSx}>
                                    Цена ↑
                                </MenuItem>
                            </Select>
                        </FormControl>

                        <FormControl
                            size="small"
                            sx={{ minWidth: 150 }}
                            variant="outlined"
                        >
                            <Select<PriceFilter>
                                displayEmpty
                                value={selectedPrice}
                                onChange={handlePriceFilterChange}
                                variant="outlined"
                                inputProps={{
                                    "aria-label": "Цена",
                                }}
                                renderValue={(value) =>
                                    (value &&
                                        PRICE_LABELS[value as PriceFilter]) ||
                                    "Цена"
                                }
                                MenuProps={filterSelectMenuProps}
                                sx={filterSelectSx}
                            >
                                <MenuItem value="all" sx={filterMenuItemSx}>
                                    Все цены
                                </MenuItem>
                                <MenuItem value="lt3" sx={filterMenuItemSx}>
                                    &lt; 3000֏
                                </MenuItem>
                                <MenuItem value="lt5" sx={filterMenuItemSx}>
                                    &lt; 5000֏
                                </MenuItem>
                                <MenuItem value="gt5" sx={filterMenuItemSx}>
                                    &gt; 5000֏
                                </MenuItem>
                            </Select>
                        </FormControl>
                    </Stack>
                </Stack>
            </Paper>

            {/* ══════════════════════════════════════════════════════
                PRODUCT GRID
            ══════════════════════════════════════════════════════ */}
            {filteredProducts.length === 0 ? (
                isEmptyCategoryShelf ? (
                    <Box
                        sx={{
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            justifyContent: "center",
                            py: 10,
                            textAlign: "center",
                        }}
                    >
                        <RestaurantMenuOutlined
                            sx={{ fontSize: 80, color: "grey.300", mb: 2 }}
                        />
                        <Typography
                            variant="h6"
                            color="text.secondary"
                            fontWeight={600}
                        >
                            Здесь пока пусто
                        </Typography>
                        <Typography
                            variant="body2"
                            color="text.disabled"
                            sx={{ mt: 1, maxWidth: 250 }}
                        >
                            Мы уже готовим блюда для этой категории. Скоро они
                            появятся!
                        </Typography>
                        <Button
                            component={Link}
                            href="/menu"
                            variant="outlined"
                            color="primary"
                            sx={{ mt: 3, borderRadius: 3 }}
                        >
                            Посмотреть другие блюда
                        </Button>
                    </Box>
                ) : (
                    <Box
                        sx={{
                            py: 12,
                            textAlign: "center",
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            gap: 1.5,
                        }}
                    >
                        <Typography sx={{ fontSize: 52, lineHeight: 1 }}>
                            🍽
                        </Typography>
                        <Typography variant="h6" fontWeight={700}>
                            Ничего не нашлось
                        </Typography>
                        <Typography
                            variant="body2"
                            sx={{ color: tokens.textSecondary }}
                        >
                            Попробуйте другой запрос или сбросьте фильтры
                        </Typography>
                    </Box>
                )
            ) : (
                <Box
                    sx={{
                        display: "grid",
                        gap: { xs: 1.5, sm: 2, md: 2.5 },
                        pt: 2,
                        pb: "100px",
                        gridTemplateColumns: {
                            xs: "repeat(2, 1fr)",
                            sm: "repeat(3, 1fr)",
                            lg: "repeat(4, 1fr)",
                        },
                    }}
                >
                    {filteredProducts.map((product, index) => {
                        const qty =
                            cartItems.find((i) => i.productId === product.id)
                                ?.quantity ?? 0;
                        return (
                            <ProductCard
                                key={product.id}
                                index={index}
                                name={product.name}
                                composition={
                                    product.composition ||
                                    product.description ||
                                    ""
                                }
                                price={product.price}
                                weight={product.weight ?? undefined}
                                images={product.images}
                                mainImage={product.mainImage}
                                onAddToCart={() => handleAddToCart(product)}
                                quantity={qty}
                                onIncrease={() => handleIncrease(product.id)}
                                onDecrease={() => handleDecrease(product.id)}
                            />
                        );
                    })}
                </Box>
            )}

            {/* ══════════════════════════════════════════════════════
                FLOATING CART BAR
            ══════════════════════════════════════════════════════ */}
            {totalCount > 0 && (
                <Box
                    sx={{
                        display: { xs: "flex", md: "none" },
                        position: "fixed",
                        bottom: 0,
                        left: 0,
                        right: 0,
                        zIndex: 1100,
                        px: 1.5,
                        pb: "calc(16px + env(safe-area-inset-bottom))",
                        bgcolor: "#ffffff",
                        boxShadow: "0 -2px 10px rgba(0,0,0,0.05)",
                    }}
                >
                    <Button
                        fullWidth
                        component={Link}
                        href="/checkout"
                        sx={{
                            height: 56,
                            borderRadius: 3,
                            bgcolor: "#fff",
                            color: "text.primary",
                            justifyContent: "space-between",
                            px: 2,
                            textTransform: "none",
                            "&:hover": { bgcolor: "#fafafa" },
                        }}
                    >
                        <Box
                            sx={{
                                display: "flex",
                                flexDirection: "column",
                                alignItems: "flex-start",
                                gap: 0.25,
                            }}
                        >
                            <Typography
                                sx={{ fontWeight: 600, fontSize: "0.9rem" }}
                            >
                                Корзина: {totalCount} шт
                            </Typography>
                            <Typography
                                sx={{
                                    fontWeight: 800,
                                    fontSize: "1rem",
                                    color: "primary.main",
                                }}
                            >
                                {totalPrice.toLocaleString("ru-RU")} ֏
                            </Typography>
                        </Box>
                        <Typography
                            sx={{
                                color: "primary.main",
                                fontWeight: 800,
                                fontSize: "1.2rem",
                            }}
                        >
                            →
                        </Typography>
                    </Button>
                </Box>
            )}
        </Box>
    );
}
