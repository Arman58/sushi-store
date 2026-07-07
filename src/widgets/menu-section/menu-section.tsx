"use client";

import ClearIcon from "@mui/icons-material/Clear";
import RestaurantMenuOutlined from "@mui/icons-material/RestaurantMenuOutlined";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import { alpha, useTheme } from "@mui/material/styles";
import Typography from "@mui/material/Typography";
import { AnimatePresence, motion } from "framer-motion";
import dynamic from "next/dynamic";
import { useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import {
    startTransition,
    Suspense,
    useCallback,
    useDeferredValue,
    useEffect,
    useMemo,
    useRef,
    useState,
} from "react";

import type { MenuModifierGroup } from "@/entities/product/model/modifiers";
import { type ConnectableProduct,ConnectedProductCard } from "@/entities/product/ui/connected-product-card";
import { useCartStore } from "@/features/cart";
import { FilterTriggerButton, useMenuFilters } from "@/features/filter";
import { Link } from "@/i18n/server";
import type { StorefrontCategory } from "@/lib/i18n-utils";
import { itemListJsonLd,JsonLd } from "@/lib/seo/json-ld";
import { SITE_URL } from "@/lib/site-config";
import { formatStorePrice } from "@/shared/lib/format-price";
import { getProductCoverUrl } from "@/shared/lib/product-cover";
import { AppInput } from "@/shared/ui";
import { tokens } from "@/shared/ui/theme";
import { CategoryPillsList } from "@/widgets/category-pills";

const ProductModifiersDialog = dynamic(
    () =>
        import("@/entities/product/ui/product-modifiers-dialog").then(
            (m) => m.ProductModifiersDialog,
        ),
    { ssr: false },
);

const FilterDrawer = dynamic(
    () =>
        import("@/features/filter/FilterDrawer").then((m) => m.FilterDrawer),
    { ssr: false },
);

export type MenuCategory = {
    id: number;
    name: string;
    slug: string;
    /** Фото категории (как на главной): своё или обложка первого товара. */
    image?: string | null;
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

function MenuSectionFiltersFallback() {
    return (
        <Box
            aria-busy="true"
            sx={{ mt: 3, display: "flex", flexDirection: "column", gap: 2 }}
        >
            <Box
                sx={{
                    height: 44,
                    borderRadius: `${tokens.radiusInput}px`,
                    bgcolor: "action.hover",
                }}
            />
            <Box
                sx={{
                    height: 40,
                    borderRadius: 999,
                    bgcolor: "action.hover",
                }}
            />
        </Box>
    );
}

function MenuSectionInner({
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
    const totalCount = useCartStore((s) =>
        s.items.reduce((sum, item) => sum + item.quantity, 0),
    );
    const totalPrice = useCartStore((s) =>
        s.items.reduce(
            (sum, item) => sum + item.calculatedItemPrice * item.quantity,
            0,
        ),
    );
    const addToast = useCartStore((s) => s.addToast);
    const addItem = useCartStore((s) => s.addItem);
    const [stickyCartPulse, setStickyCartPulse] = useState(0);
    const lastAddToastRef = useRef(0);

    useEffect(() => {
        if (!addToast || addToast === lastAddToastRef.current) return;
        lastAddToastRef.current = addToast;
        queueMicrotask(() => setStickyCartPulse((n) => n + 1));
    }, [addToast]);
    const [modifierProduct, setModifierProduct] = useState<ConnectableProduct | null>(
        null,
    );
    // Инициализация из ?search= (поиск в шапке ведёт на /menu?search=…)
    const initialSearch = useSearchParams().get("search") ?? "";
    const [search, setSearch] = useState(initialSearch);
    /** Отложенное значение: ввод не блокирует рендер большого списка. */
    const deferredSearch = useDeferredValue(search);
    const stickySentinelRef = useRef<HTMLDivElement>(null);
    const [isStickyHeaderElevated, setIsStickyHeaderElevated] = useState(false);

    useEffect(() => {
        const sentinel = stickySentinelRef.current;
        if (!sentinel) return;

        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry) {
                    setIsStickyHeaderElevated(!entry.isIntersecting);
                }
            },
            { threshold: 0 },
        );

        observer.observe(sentinel);
        return () => observer.disconnect();
    }, []);

    const storefrontCategories = useMemo<StorefrontCategory[]>(
        () =>
            categories.map((category) => ({
                id: category.id,
                slug: category.slug,
                name: category.name,
                image: category.image ?? null,
            })),
        [categories],
    );

    const openFilterDrawer = useCallback(() => {
        startTransition(() => {
            setFilterDrawerOpen(true);
        });
    }, []);

    const closeFilterDrawer = useCallback(() => {
        setFilterDrawerOpen(false);
    }, []);

    const openModifiers = useCallback((product: ConnectableProduct) => {
        setModifierProduct(product);
    }, []);

    const filteredProducts = useMemo(() => {
        const base = filterByCategory(products, categorySlug);
        const byPrice = filterByPriceRange(base, priceRange);

        const query = deferredSearch.trim().toLowerCase();
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
        deferredSearch,
    ]);

    const productsInActiveCategory = useMemo(() => {
        return filterByCategory(products, categorySlug);
    }, [categorySlug, filterByCategory, products]);

    const isEmptyCategoryShelf =
        categorySlug !== "all" && productsInActiveCategory.length === 0;

    const itemListStructuredData = useMemo(() => {
        return itemListJsonLd(
            filteredProducts.map((p) => ({
                name: p.name,
                url: `${SITE_URL}/menu/${p.slug}`,
                image: getProductCoverUrl({ images: p.images, mainImage: p.mainImage }),
            }))
        );
    }, [filteredProducts]);

    return (
        <Box sx={{ mt: 3, display: "flex", flexDirection: "column", gap: 2 }}>
            <JsonLd data={itemListStructuredData} />
            {/* ══════════════════════════════════════════════════════
                FILTER HEADER (sticky search + category pills)
            ══════════════════════════════════════════════════════ */}
            <Box ref={stickySentinelRef} sx={{ height: 0 }} aria-hidden />

            <Box
                sx={{
                    position: "sticky",
                    top: 0,
                    zIndex: 1100,
                    bgcolor: "background.paper",
                    py: 1,
                    mx: { xs: -2, md: -3 },
                    px: { xs: 2, md: 3 },
                    boxShadow: isStickyHeaderElevated
                        ? `0 2px 8px ${alpha(theme.palette.common.black, 0.08)}`
                        : "none",
                    transition: "box-shadow 0.2s ease",
                }}
            >
                <Stack
                    component="search"
                    role="search"
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
                        InputProps={{
                            endAdornment: search ? (
                                <ClearIcon
                                    role="button"
                                    aria-label={t("clearSearch")}
                                    tabIndex={0}
                                    onClick={() => setSearch("")}
                                    onKeyDown={(e) => {
                                        if (e.key === "Enter") setSearch("");
                                    }}
                                    sx={{
                                        fontSize: 18,
                                        cursor: "pointer",
                                        color: tokens.textMuted,
                                        "&:hover": { color: tokens.textPrimary },
                                    }}
                                />
                            ) : undefined,
                        }}
                        sx={{
                            flex: 1,
                            minWidth: 0,
                            "& .MuiOutlinedInput-root": {
                                borderRadius: `${tokens.radiusInput}px`,
                            },
                        }}
                    />

                    <FilterTriggerButton
                        onClick={openFilterDrawer}
                        hasActiveFilters={hasActiveFilters}
                    />
                </Stack>

                {storefrontCategories.length > 0 ? (
                    <CategoryPillsList
                        categories={storefrontCategories}
                        activeSlug={categorySlug}
                        mode="interactive"
                        variant="chip"
                        onChange={setCategorySlug}
                    />
                ) : null}
            </Box>

            <FilterDrawer
                isOpen={filterDrawerOpen}
                onClose={closeFilterDrawer}
                priceRange={priceRange}
                minPrice={minPrice}
                maxPrice={maxPrice}
                resultCount={filteredProducts.length}
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
                            sx={{ fontSize: 80, color: tokens.borderHi, mb: 2 }}
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
                            sm: 12,
                            md: 2,
                        },
                        gridTemplateColumns: {
                            xs: "repeat(2, minmax(0, 1fr))",
                            sm: "repeat(3, minmax(0, 1fr))",
                            md: "repeat(4, minmax(0, 1fr))",
                        },
                    }}
                >
                    {filteredProducts.map((product, index) => (
                            <Box
                                component={motion.div}
                                // Ремоунт при смене категории/поиска - stagger-появление
                                key={`${categorySlug}-${product.id}`}
                                initial={{ opacity: 0, y: 12 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{
                                    duration: 0.25,
                                    delay: Math.min(index, 11) * 0.03,
                                    ease: "easeOut",
                                }}
                                sx={{
                                    height: "100%",
                                    minWidth: 0,
                                    display: "flex",
                                }}
                            >
                                <ConnectedProductCard
                                    product={product}
                                    index={index}
                                    onOpenModifiers={openModifiers}
                                />
                            </Box>
                        ))}
                </Box>
            )}

            {/* ══════════════════════════════════════════════════════
                FLOATING CART BAR
            ══════════════════════════════════════════════════════ */}
            <AnimatePresence>
                {totalCount > 0 && (
                    <Box
                        component={motion.div}
                        key="menu-sticky-cart"
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 16 }}
                        transition={{ duration: 0.18, ease: "easeOut" }}
                        sx={{
                            display: { xs: "flex", md: "none" },
                            position: "fixed",
                            // xs: над мобильной bottom-nav; sm: nav нет - к низу
                            bottom: {
                                xs: "calc(72px + env(safe-area-inset-bottom))",
                                sm: 0,
                            },
                            left: 0,
                            right: 0,
                            // Ниже бургер-меню (1200) и шторки корзины
                            zIndex: 1150,
                            px: 1.5,
                            pb: "calc(16px + env(safe-area-inset-bottom))",
                            bgcolor: "background.paper",
                            boxShadow: `0 -2px 10px ${alpha(theme.palette.common.black, 0.06)}`,
                        }}
                    >
                        <motion.div
                            key={stickyCartPulse}
                            style={{ width: "100%" }}
                            initial={{ scale: 1 }}
                            animate={
                                stickyCartPulse === 0
                                    ? { scale: 1 }
                                    : { scale: [1, 1.03, 1] }
                            }
                            transition={
                                stickyCartPulse === 0
                                    ? { duration: 0 }
                                    : { duration: 0.22, times: [0, 0.45, 1] }
                            }
                        >
                            <Button
                                fullWidth
                                component={Link}
                                href="/checkout"
                                sx={{
                                    height: 48,
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
                                        flexDirection: "row",
                                        alignItems: "center",
                                        gap: 1,
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
                                            minWidth: 0,
                                        }}
                                    >
                                        {t("stickyCart.label", { count: totalCount })}
                                    </Typography>
                                    <Typography
                                        component={motion.span}
                                        key={totalPrice}
                                        initial={{ opacity: 0.7 }}
                                        animate={{ opacity: 1 }}
                                        transition={{ duration: 0.12 }}
                                        sx={{
                                            fontWeight: 800,
                                            fontSize: "1rem",
                                            color: "primary.main",
                                            fontVariantNumeric: "tabular-nums",
                                            whiteSpace: "nowrap",
                                            flexShrink: 0,
                                            ml: "auto",
                                        }}
                                    >
                                        {formatStorePrice(totalPrice)} ֏
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
                        </motion.div>
                    </Box>
                )}
            </AnimatePresence>
            <ProductModifiersDialog
                open={modifierProduct !== null}
                onClose={() => setModifierProduct(null)}
                productName={modifierProduct?.name ?? ""}
                description={
                    modifierProduct?.description ??
                    modifierProduct?.composition ??
                    undefined
                }
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

export function MenuSection(props: MenuSectionProps) {
    return (
        <Suspense fallback={<MenuSectionFiltersFallback />}>
            <MenuSectionInner {...props} />
        </Suspense>
    );
}
