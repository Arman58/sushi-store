"use client";

import RestaurantMenuOutlined from "@mui/icons-material/RestaurantMenuOutlined";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Divider from "@mui/material/Divider";
import Stack from "@mui/material/Stack";
import { alpha, useTheme } from "@mui/material/styles";
import Typography from "@mui/material/Typography";
import dynamic from "next/dynamic";
import { useLocale, useTranslations } from "next-intl";
import { useMemo, useState } from "react";

import type { MenuModifierGroup } from "@/entities/product/model/modifiers";
import { ProductCard } from "@/entities/product/ui/product-card";
import { buildCartItemId, useCartStore } from "@/features/cart";
import {
    FilterDrawer,
    FilterTriggerButton,
    useMenuFilters,
} from "@/features/filter";
import { Link } from "@/i18n/server";
import { getProductCoverUrl } from "@/shared/lib/product-cover";
import { AppInput } from "@/shared/ui";
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
    minPrice: number;
    maxPrice: number;
};

// ─── Component ────────────────────────────────────────────────────────────────

export function MenuSection({
    categories,
    products,
    minPrice,
    maxPrice,
}: MenuSectionProps) {
    const t = useTranslations("menu");
    const locale = useLocale();
    const theme = useTheme();
    const allSlugs = useMemo(
        () => ["all", ...categories.map((c) => c.slug)],
        [categories],
    );

    const {
        categorySlug,
        priceRange,
        setCategorySlug,
        setPriceRange,
        resetFilters,
        hasActiveFilters,
        filterByCategory,
        filterByPriceRange,
    } = useMenuFilters({
        validCategorySlugs: allSlugs,
        minPrice,
        maxPrice,
    });
    const [filterDrawerOpen, setFilterDrawerOpen] = useState(false);
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

    const filteredProducts = useMemo(() => {
        const base = filterByCategory(products, categorySlug);
        const byPrice = filterByPriceRange(base, priceRange);

        const query = search.trim().toLowerCase();
        const withSearch =
            query.length === 0
                ? byPrice
                : byPrice.filter(
                      (p) =>
                          p.name.toLowerCase().includes(query) ||
                          (p.description ?? "").toLowerCase().includes(query),
                  );

        return [...withSearch].sort((a, b) =>
            a.name.localeCompare(b.name, locale, { sensitivity: "base" }),
        );
    }, [
        categorySlug,
        filterByCategory,
        filterByPriceRange,
        locale,
        priceRange,
        products,
        search,
    ]);

    const productsInActiveCategory = useMemo(() => {
        return filterByCategory(products, categorySlug);
    }, [categorySlug, filterByCategory, products]);

    /** Категория выбрана, но в ней ещё нет ни одного товара (не «ничего не нашлось» по поиску). */
    const isEmptyCategoryShelf =
        categorySlug !== "all" && productsInActiveCategory.length === 0;

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
                    overflow: "visible",
                }}
            >
                <Stack
                    direction="row"
                    gap={1.5}
                    alignItems="center"
                    sx={{ minWidth: 0 }}
                >
                    <AppInput
                        fullWidth
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder={t("search")}
                        sx={{
                            flex: 1,
                            minWidth: 0,
                            "& .MuiOutlinedInput-root": {
                                borderRadius: `${tokens.radiusInput}px`,
                            },
                        }}
                    />

                    <FilterTriggerButton
                        onClick={() => setFilterDrawerOpen(true)}
                        hasActiveFilters={hasActiveFilters}
                    />
                </Stack>
                <Divider sx={{ mt: 2 }} />
            </Box>

            <FilterDrawer
                isOpen={filterDrawerOpen}
                onClose={() => setFilterDrawerOpen(false)}
                categories={categories}
                categorySlug={categorySlug}
                priceRange={priceRange}
                minPrice={minPrice}
                maxPrice={maxPrice}
                resultCount={filteredProducts.length}
                onCategoryChange={setCategorySlug}
                onPriceRangeChange={setPriceRange}
                onReset={resetFilters}
            />

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
                            {t("emptyCategory.title")}
                        </Typography>
                        <Typography
                            variant="body2"
                            color="text.disabled"
                            sx={{ mt: 1, maxWidth: 250 }}
                        >
                            {t("emptyCategory.subtitle")}
                        </Typography>
                        <Button
                            component={Link}
                            href="/menu"
                            variant="outlined"
                            color="primary"
                            sx={{ mt: 3, borderRadius: `${tokens.radiusCardLg}px` }}
                        >
                            {t("emptyCategory.cta")}
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
                            {t("noResults.title")}
                        </Typography>
                        <Typography
                            variant="body2"
                            sx={{ color: tokens.textSecondary }}
                        >
                            {t("noResults.subtitle")}
                        </Typography>
                    </Box>
                )
            ) : (
                <Box
                    component="section"
                    aria-label={t("aria.catalog")}
                    sx={{
                        display: "grid",
                        width: "100%",
                        minWidth: 0,
                        alignItems: "stretch",
                        gap: 2,
                        pt: 2,
                        pb: {
                            xs: "calc(72px + env(safe-area-inset-bottom))",
                            sm: 2,
                        },
                        gridTemplateColumns: {
                            xs: "repeat(2, minmax(0, 1fr))",
                            sm: "repeat(3, minmax(0, 1fr))",
                            md: "repeat(4, minmax(0, 1fr))",
                        },
                    }}
                >
                    {filteredProducts.map((product, index) => {
                        const qty = qtyForProduct(product.id);
                        return (
                            <Box
                                key={product.id}
                                sx={{
                                    height: "100%",
                                    minWidth: 0,
                                    display: "flex",
                                }}
                            >
                                <ProductCard
                                    index={index}
                                    name={product.name}
                                    composition={
                                        product.composition ||
                                        product.description ||
                                        undefined
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
                            </Box>
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
                                flex: 1,
                                minWidth: 0,
                                overflow: "hidden",
                            }}
                        >
                            <Typography
                                sx={{
                                    fontWeight: 600,
                                    fontSize: "0.9rem",
                                    whiteSpace: "nowrap",
                                    overflow: "hidden",
                                    textOverflow: "ellipsis",
                                    width: "100%",
                                }}
                            >
                                {t("stickyCart.label", { count: totalCount })}
                            </Typography>
                            <Typography
                                sx={{
                                    fontWeight: 800,
                                    fontSize: "1rem",
                                    color: "primary.main",
                                    fontVariantNumeric: "tabular-nums",
                                    whiteSpace: "nowrap",
                                    overflow: "hidden",
                                    textOverflow: "ellipsis",
                                    width: "100%",
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
                                flexShrink: 0,
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
                description={modifierProduct?.description}
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
