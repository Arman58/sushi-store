"use client";

import RestaurantMenuOutlined from "@mui/icons-material/RestaurantMenuOutlined";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Divider from "@mui/material/Divider";
import FormControl from "@mui/material/FormControl";
import MenuItem from "@mui/material/MenuItem";
import type { SelectChangeEvent } from "@mui/material/Select";
import Select from "@mui/material/Select";
import Stack from "@mui/material/Stack";
import { alpha, useTheme } from "@mui/material/styles";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";

import type { MenuModifierGroup } from "@/entities/product/model/modifiers";
import { ProductCard } from "@/entities/product/ui/product-card";
import { buildCartItemId, useCartStore } from "@/features/cart";
import { getProductCoverUrl } from "@/shared/lib/product-cover";
import { tokens } from "@/shared/ui/theme";

const ProductModifiersDialog = dynamic(
    () =>
        import("@/entities/product/ui/product-modifiers-dialog").then(
            (m) => m.ProductModifiersDialog,
        ),
    { ssr: false },
);

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
    modifierGroups?: MenuModifierGroup[];
};

type MenuSectionProps = {
    categories: MenuCategory[];
    products: MenuProduct[];
};

// ─── Price filter config ──────────────────────────────────────────────────────

type PriceFilter = "all" | "lt3" | "lt5" | "gt5";

type SortBy = "name" | "price_asc";

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
    const theme = useTheme();
    const searchParams = useSearchParams();

    const filterSelectMenuProps = useMemo(
        () => ({
            PaperProps: {
                sx: {
                    borderRadius: 2,
                    mt: 0.5,
                    border: `1px solid ${theme.palette.divider}`,
                    boxShadow: `0 4px 15px ${alpha(theme.palette.common.black, 0.08)}`,
                },
            },
        }),
        [theme],
    );

    const filterMenuItemSx = useMemo(
        () =>
            ({
                color: "text.primary",
                fontSize: "0.85rem",
                py: 0.8,
                borderRadius: 1,
                mx: 0.5,
                "&:hover": { backgroundColor: "action.hover" },
            }) as const,
        [],
    );

    const filterSelectSx = useMemo(
        () =>
            ({
                borderRadius: 50,
                px: 2.5,
                py: 1.2,
                height: 40,
                fontSize: "0.85rem",
                textTransform: "none" as const,
                backgroundColor: theme.palette.action.hover,
                "& .MuiOutlinedInput-notchedOutline": { border: "none" },
                "& .MuiSvgIcon-root": { color: "text.secondary" },
                "&:hover": { backgroundColor: theme.palette.grey[100] },
                "&.Mui-focused": {
                    boxShadow: `0 0 0 2px ${tokens.brand}`,
                },
                "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
                    border: "none",
                },
            }) as const,
        [theme],
    );


    const addItem = useCartStore((s) => s.addItem);
    const setItemQuantity = useCartStore((s) => s.setItemQuantity);
    const decrementFirstLineForProduct = useCartStore(
        (s) => s.decrementFirstLineForProduct,
    );
    const cartItems = useCartStore((s) => s.items);
    const [modifierProduct, setModifierProduct] = useState<MenuProduct | null>(
        null,
    );
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
            totalPrice: cartItems.reduce(
                (s, i) =>
                    s + i.calculatedItemPrice * i.quantity,
                0,
            ),
        }),
        [cartItems],
    );

    function productHasModifiers(p: MenuProduct) {
        return (p.modifierGroups?.length ?? 0) > 0;
    }

    function qtyForProduct(productId: number) {
        return cartItems
            .filter((i) => i.productId === productId)
            .reduce((s, i) => s + i.quantity, 0);
    }

    const handleAddToCart = (p: MenuProduct) => {
        if (productHasModifiers(p)) {
            setModifierProduct(p);
            return;
        }
        addItem({
            productId: p.id,
            name: p.name,
            basePrice: p.price,
            selectedModifiers: [],
            calculatedItemPrice: p.price,
            image:
                getProductCoverUrl({
                    images: p.images,
                    mainImage: p.mainImage,
                }) || "",
        });
    };
    const handleIncrease = (p: MenuProduct) => {
        if (productHasModifiers(p)) {
            setModifierProduct(p);
            return;
        }
        const cartItemId = buildCartItemId(p.id, []);
        const q =
            cartItems.find((i) => i.cartItemId === cartItemId)?.quantity ?? 0;
        setItemQuantity(cartItemId, q + 1);
    };
    const handleDecrease = (productId: number) => {
        decrementFirstLineForProduct(productId);
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
                FILTER HEADER
            ══════════════════════════════════════════════════════ */}
            <Box
                sx={{
                    px: { xs: 2, md: 3 },
                    py: 2,
                    width: "100%",
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
                            "& .MuiOutlinedInput-root": {
                                borderRadius: `${tokens.radiusInput}px`,
                            },
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
                <Divider sx={{ mt: 2 }} />
            </Box>

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
                            component="p"
                            variant="body1"
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
                            sx={{ mt: 3, borderRadius: `${tokens.radiusCardLg}px` }}
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
                        <Typography component="p" variant="body1" fontWeight={700}>
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
                    component="section"
                    aria-label="Каталог блюд"
                    sx={{
                        display: "grid",
                        gap: { xs: 1.5, sm: 2, md: 2.5 },
                        pt: 2,
                        pb: "100px",
                        alignItems: "stretch",
                        gridAutoRows: "1fr",
                        gridTemplateColumns: {
                            xs: "repeat(2, 1fr)",
                            sm: "repeat(3, 1fr)",
                            lg: "repeat(4, 1fr)",
                        },
                    }}
                >
                    {filteredProducts.map((product, index) => {
                        const qty = qtyForProduct(product.id);
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
                                onIncrease={() => handleIncrease(product)}
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
                        bgcolor: "background.paper",
                        boxShadow: `0 -2px 10px ${alpha(theme.palette.common.black, 0.06)}`,
                    }}
                >
                    <Button
                        fullWidth
                        component={Link}
                        href="/checkout"
                        sx={{
                            height: 56,
                            borderRadius: `${tokens.radiusCardLg}px`,
                            bgcolor: "background.paper",
                            color: "text.primary",
                            justifyContent: "space-between",
                            px: 2,
                            textTransform: "none",
                            border: "1px solid",
                            borderColor: "divider",
                            "&:hover": { bgcolor: "action.hover" },
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
                                    fontVariantNumeric: "tabular-nums",
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
            <ProductModifiersDialog
                open={modifierProduct !== null}
                onClose={() => setModifierProduct(null)}
                productName={modifierProduct?.name ?? ""}
                basePrice={modifierProduct?.price ?? 0}
                modifierGroups={modifierProduct?.modifierGroups ?? []}
                onConfirm={({ selectedModifiers, calculatedItemPrice }) => {
                    if (!modifierProduct) return;
                    addItem({
                        productId: modifierProduct.id,
                        name: modifierProduct.name,
                        basePrice: modifierProduct.price,
                        selectedModifiers,
                        calculatedItemPrice,
                        image:
                            getProductCoverUrl({
                                images: modifierProduct.images,
                                mainImage: modifierProduct.mainImage,
                            }) || "",
                    });
                }}
            />
        </Box>
    );
}
