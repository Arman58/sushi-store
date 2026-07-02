"use client";

import FavoriteBorderOutlinedIcon from "@mui/icons-material/FavoriteBorderOutlined";
import RestaurantMenuRoundedIcon from "@mui/icons-material/RestaurantMenuRounded";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import dynamic from "next/dynamic";
import { useLocale, useTranslations } from "next-intl";
import { useCallback, useEffect, useRef, useState } from "react";

import type { ConnectableProduct } from "@/entities/product/ui/connected-product-card";
import { ConnectedProductCard } from "@/entities/product/ui/connected-product-card";
import { ProductCardSkeleton } from "@/entities/product/ui/product-card";
import { useCartStore } from "@/features/cart";
import { useFavorites } from "@/features/favorites";
import { Link } from "@/i18n/server";
import { getProductCoverUrl } from "@/shared/lib/product-cover";
import { fadeInSx } from "@/shared/ui/skeleton-styles";
import { tokens } from "@/shared/ui/theme";

const ProductModifiersDialog = dynamic(
    () =>
        import("@/entities/product/ui/product-modifiers-dialog").then(
            (m) => m.ProductModifiersDialog,
        ),
    { ssr: false },
);

type FavoriteProduct = ConnectableProduct & {
    description?: string | null;
};

const gridSx = {
    display: "grid",
    gap: { xs: 1.5, sm: 2, md: 2.5 },
    minWidth: 0,
    alignItems: "stretch",
    gridTemplateColumns: {
        xs: "repeat(2, minmax(0, 1fr))",
        sm: "repeat(3, minmax(0, 1fr))",
        md: "repeat(4, minmax(0, 1fr))",
    },
} as const;

function EmptyState() {
    const t = useTranslations("favorites");

    return (
        <Box
            sx={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                textAlign: "center",
                py: { xs: 6, sm: 10 },
                px: 2,
            }}
        >
            <Box
                sx={{
                    width: 88,
                    height: 88,
                    borderRadius: "50%",
                    bgcolor: tokens.brandDim,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    mb: 3,
                }}
            >
                <FavoriteBorderOutlinedIcon
                    sx={{ fontSize: 40, color: tokens.brand }}
                />
            </Box>

            <Typography
                component="h2"
                sx={{
                    fontWeight: 800,
                    fontSize: { xs: "1.15rem", sm: "1.35rem" },
                    letterSpacing: -0.4,
                    mb: 1,
                }}
            >
                {t("empty_title")}
            </Typography>

            <Typography
                variant="body2"
                sx={{ color: tokens.textMuted, maxWidth: 340, mb: 3.5 }}
            >
                {t("empty_hint")}
            </Typography>

            <Button
                component={Link}
                href="/menu"
                variant="contained"
                size="large"
                startIcon={<RestaurantMenuRoundedIcon />}
                sx={{ borderRadius: "12px", fontWeight: 800 }}
            >
                {t("go_to_menu")}
            </Button>
        </Box>
    );
}

export function FavoritesSection() {
    const t = useTranslations("favorites");
    const locale = useLocale();
    const { ids, hydrated } = useFavorites();
    const addItem = useCartStore((s) => s.addItem);

    const [products, setProducts] = useState<FavoriteProduct[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState(false);
    const [retryKey, setRetryKey] = useState(0);
    const [modifierProduct, setModifierProduct] =
        useState<ConnectableProduct | null>(null);

    const loadedIdsRef = useRef<Set<number>>(new Set());

    const idsKey = [...ids].sort((a, b) => a - b).join(",");

    useEffect(() => {
        if (!hydrated) return;

        if (ids.length === 0) {
            setLoading(false);
            setLoadError(false);
            return;
        }

        const missing = ids.filter((id) => !loadedIdsRef.current.has(id));
        if (missing.length === 0) {
            setLoading(false);
            return;
        }

        const controller = new AbortController();

        async function load() {
            setLoading(true);
            setLoadError(false);
            try {
                const params = new URLSearchParams({
                    locale,
                    ids: idsKey,
                });
                const res = await fetch(
                    `/api/products/by-ids?${params.toString()}`,
                    { signal: controller.signal },
                );
                if (!res.ok) {
                    setLoadError(true);
                    return;
                }
                const data = (await res.json()) as FavoriteProduct[];
                if (Array.isArray(data)) {
                    loadedIdsRef.current = new Set(data.map((p) => p.id));
                    setProducts(data);
                } else {
                    setLoadError(true);
                }
            } catch (error) {
                if (
                    error instanceof DOMException &&
                    error.name === "AbortError"
                ) {
                    return;
                }
                setLoadError(true);
            } finally {
                if (!controller.signal.aborted) {
                    setLoading(false);
                }
            }
        }

        void load();
        return () => controller.abort();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [hydrated, idsKey, locale, retryKey]);

    const openModifiers = useCallback((product: ConnectableProduct) => {
        setModifierProduct(product);
    }, []);

    // Live-удаление: сняли сердечко — карточка исчезает сразу
    const visibleProducts = products.filter((p) => ids.includes(p.id));

    // ── Loading ──
    if (!hydrated || (loading && visibleProducts.length === 0 && ids.length > 0)) {
        return (
            <Box sx={gridSx}>
                {Array.from({
                    length: Math.min(Math.max(ids.length, 4), 8),
                }).map((_, i) => (
                    <ProductCardSkeleton key={i} />
                ))}
            </Box>
        );
    }

    // ── Error ──
    if (loadError && visibleProducts.length === 0 && ids.length > 0) {
        return (
            <Box
                sx={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    textAlign: "center",
                    py: { xs: 6, sm: 10 },
                    px: 2,
                    gap: 2,
                }}
            >
                <Typography variant="body1" sx={{ color: tokens.textMuted }}>
                    {t("load_error")}
                </Typography>
                <Button
                    variant="outlined"
                    onClick={() => {
                        loadedIdsRef.current = new Set();
                        setRetryKey((n) => n + 1);
                    }}
                    sx={{ borderRadius: "12px", fontWeight: 700 }}
                >
                    {t("retry")}
                </Button>
            </Box>
        );
    }

    // ── Empty ──
    if (visibleProducts.length === 0) {
        return <EmptyState />;
    }

    return (
        <>
            <Box sx={gridSx}>
                {visibleProducts.map((product, index) => (
                    <Box
                        key={product.id}
                        sx={{
                            height: "100%",
                            minWidth: 0,
                            display: "flex",
                            ...fadeInSx,
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
                    const thumb = getProductCoverUrl({
                        images: modifierProduct.images,
                        mainImage: modifierProduct.mainImage,
                    });
                    addItem({
                        productId: modifierProduct.id,
                        name: modifierProduct.name,
                        basePrice: modifierProduct.price,
                        selectedModifiers,
                        calculatedItemPrice,
                        image: thumb ?? undefined,
                    });
                }}
            />
        </>
    );
}
