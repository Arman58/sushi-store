"use client";

import ClearIcon from "@mui/icons-material/Clear";
import RestaurantMenuOutlined from "@mui/icons-material/RestaurantMenuOutlined";
import SearchOffOutlinedIcon from "@mui/icons-material/SearchOffOutlined";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import { alpha, useTheme } from "@mui/material/styles";
import Typography from "@mui/material/Typography";
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
    useTransition,
} from "react";

import type { MenuModifierGroup } from "@/entities/product/model/modifiers";
import { useLazyProductModifiers } from "@/entities/product/model/use-lazy-product-modifiers";
import { ConnectedProductCard } from "@/entities/product/ui/connected-product-card";
import { ProductCardSkeleton } from "@/entities/product/ui/product-card-skeleton";
import { useCartStore } from "@/features/cart";
import { FilterTriggerButton, useMenuFilters } from "@/features/filter";
import { Link } from "@/i18n/server";
import type { StorefrontCategory } from "@/lib/i18n-utils";
import { itemListJsonLd, JsonLd } from "@/lib/seo/json-ld";
import { SITE_URL } from "@/lib/site-config";
import { getProductCoverUrl } from "@/shared/lib/product-cover";
import { useProgressiveRender } from "@/shared/lib/use-progressive-render";
import { AppInput } from "@/shared/ui";
import { tokens } from "@/shared/ui/theme";
import { CategoryPillsList } from "@/widgets/category-pills";

import { MenuStickyCartBar } from "./menu-sticky-cart-bar";

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
    /** Есть ли модификаторы; сами группы догружаются по требованию. */
    hasModifiers?: boolean;
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

const CATALOG_SKELETON_COUNT = 8;

function MenuProductGridSkeleton() {
    return (
        <>
            {Array.from({ length: CATALOG_SKELETON_COUNT }).map((_, i) => (
                <Box key={i} sx={{ height: "100%", minWidth: 0, display: "flex" }}>
                    <ProductCardSkeleton />
                </Box>
            ))}
        </>
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
    const [, startFilterTransition] = useTransition();
    const addItem = useCartStore((s) => s.addItem);
    const { modifierProduct, openModifiers, closeModifiers } =
        useLazyProductModifiers();
    // Инициализация из ?search= (поиск в шапке ведёт на /menu?search=…)
    const initialSearch = useSearchParams().get("search") ?? "";
    const [search, setSearch] = useState(initialSearch);
    /** Отложенное значение: ввод не блокирует рендер большого списка. */
    const deferredSearch = useDeferredValue(search);
    const isSearchPending = search !== deferredSearch;
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

    const filterResetKey = `${categorySlug}|${deferredSearch}|${priceRange[0]}-${priceRange[1]}`;
    const { visibleCount, loadMoreRef } = useProgressiveRender(
        filteredProducts.length,
        filterResetKey,
        { initialCount: 16, batchSize: 16 },
    );
    const visibleProducts = useMemo(
        () => filteredProducts.slice(0, visibleCount),
        [filteredProducts, visibleCount],
    );
    const hasMoreProducts = visibleCount < filteredProducts.length;
    const showCatalogSkeleton = isSearchPending && filteredProducts.length > 0;

    const handleCategoryChange = useCallback(
        (slug: string) => {
            startFilterTransition(() => {
                setCategorySlug(slug);
            });
        },
        [setCategorySlug],
    );

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
                        aria-busy={isSearchPending}
                        inputProps={{ enterKeyHint: "search" }}
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
                        onChange={handleCategoryChange}
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
                            py: 10,
                            textAlign: "center",
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            gap: 1.5,
                        }}
                    >
                        <SearchOffOutlinedIcon
                            sx={{ fontSize: 64, color: tokens.borderHi, mb: 0.5 }}
                        />
                        <Typography component="p" variant="body1" fontWeight={700}>
                            {t("noResults.title")}
                        </Typography>
                        <Typography
                            variant="body2"
                            sx={{ color: tokens.textSecondary, maxWidth: 280 }}
                        >
                            {t("noResults.subtitle")}
                        </Typography>
                        {hasActiveFilters ? (
                            <Button
                                variant="outlined"
                                color="primary"
                                onClick={() => {
                                    startTransition(() => {
                                        resetFilters();
                                        setSearch("");
                                    });
                                }}
                                sx={{ mt: 1.5, borderRadius: `${tokens.radiusCardLg}px` }}
                            >
                                {t("reset_all")}
                            </Button>
                        ) : null}
                    </Box>
                )
            ) : (
                <Box
                    component="section"
                    aria-label={t("aria.catalog")}
                    aria-busy={hasMoreProducts || showCatalogSkeleton}
                    aria-live="polite"
                    sx={{
                        display: "grid",
                        width: "100%",
                        minWidth: 0,
                        alignItems: "stretch",
                        gap: 2,
                        pt: 2,
                        pb: {
                            // bottom nav (~72px) + optional sticky cart (~64px) + safe-area
                            xs: "calc(148px + env(safe-area-inset-bottom))",
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
                    {showCatalogSkeleton ? (
                        <MenuProductGridSkeleton />
                    ) : (
                        <>
                            {visibleProducts.map((product, index) => (
                                    <Box
                                        key={`${categorySlug}-${product.id}`}
                                        sx={{
                                            height: "100%",
                                            minWidth: 0,
                                            display: "flex",
                                            ...(index >= 12 && {
                                                contentVisibility: "auto",
                                                containIntrinsicSize: "auto 340px",
                                            }),
                                        }}
                                    >
                                        <ConnectedProductCard
                                            product={product}
                                            index={index}
                                            imagePriority={index < 4}
                                            onOpenModifiers={openModifiers}
                                        />
                                    </Box>
                            ))}
                            {hasMoreProducts ? (
                                <Box
                                    ref={loadMoreRef}
                                    aria-hidden
                                    sx={{
                                        gridColumn: "1 / -1",
                                        height: 1,
                                        pointerEvents: "none",
                                    }}
                                />
                            ) : null}
                        </>
                    )}
                </Box>
            )}

            <MenuStickyCartBar />
            <ProductModifiersDialog
                open={modifierProduct !== null}
                onClose={closeModifiers}
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
