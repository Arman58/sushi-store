"use client";

import AddRoundedIcon from "@mui/icons-material/AddRounded";
import Avatar from "@mui/material/Avatar";
import Box from "@mui/material/Box";
import ButtonBase from "@mui/material/ButtonBase";
import Typography from "@mui/material/Typography";
import dynamic from "next/dynamic";
import { useLocale } from "next-intl";
import { useCallback, useEffect, useMemo, useState } from "react";

import type { MenuModifierGroup } from "@/entities/product/model/modifiers";
import { useCartStore } from "@/features/cart";
import type { CartItem } from "@/features/cart/model/types";
import type { StorefrontProduct } from "@/lib/i18n-utils";
import { formatStorePrice } from "@/shared/lib/format-price";
import { getProductCoverUrl } from "@/shared/lib/product-cover";
import { tokens } from "@/shared/ui/theme";

const ProductModifiersDialog = dynamic(
    () =>
        import("@/entities/product/ui/product-modifiers-dialog").then(
            (m) => m.ProductModifiersDialog,
        ),
    { ssr: false },
);

type UpsellProduct = Pick<
    StorefrontProduct,
    "id" | "name" | "price" | "images" | "mainImage" | "description" | "composition"
> & {
    modifierGroups?: MenuModifierGroup[];
};

type Props = {
    /** Товары корзины — их id уходят в exclude (и как якорь «с этим берут»). */
    cartItems?: CartItem[];
    /** Явный список id для exclude (напр. [productId] на странице товара). */
    excludeIds?: number[];
    /** Заголовок над каруселью; рендерится только когда есть что показать. */
    title?: string;
    /** Слаги категорий, которые не предлагать (напр. sauces — их показывает SauceStrip). */
    excludeCategorySlugs?: string[];
};

function hasRequiredModifiers(groups: MenuModifierGroup[] | undefined): boolean {
    return (groups ?? []).some((group) => group.required);
}

/**
 * Компактные предложения «с этим часто заказывают»: маленькие чипы
 * с фото, ценой и быстрым добавлением — единый стиль с SauceStrip,
 * ненавязчиво и mobile-first (горизонтальный скролл).
 */
export function UpsellCarousel({
    cartItems,
    excludeIds,
    title,
    excludeCategorySlugs,
}: Props) {
    const locale = useLocale();
    const addItem = useCartStore((s) => s.addItem);

    const [products, setProducts] = useState<UpsellProduct[]>([]);
    const [loading, setLoading] = useState(true);
    const [modifierProduct, setModifierProduct] = useState<UpsellProduct | null>(null);

    const excludeKey = useMemo(
        () => {
            const ids =
                excludeIds ?? cartItems?.map((item) => item.productId) ?? [];
            return [...new Set(ids)].sort((a, b) => a - b).join(",");
        },
        [excludeIds, cartItems],
    );
    const excludeCatsKey = (excludeCategorySlugs ?? []).join(",");

    useEffect(() => {
        const controller = new AbortController();

        async function load() {
            setLoading(true);
            try {
                const params = new URLSearchParams({ locale });
                if (excludeKey) {
                    params.set("exclude", excludeKey);
                }
                if (excludeCatsKey) {
                    params.set("excludeCategories", excludeCatsKey);
                }

                const res = await fetch(`/api/upsell?${params.toString()}`, {
                    signal: controller.signal,
                });

                if (!res.ok) {
                    setProducts([]);
                    return;
                }

                const data = (await res.json()) as UpsellProduct[];
                setProducts(Array.isArray(data) ? data : []);
            } catch (error) {
                if (error instanceof DOMException && error.name === "AbortError") {
                    return;
                }
                setProducts([]);
            } finally {
                if (!controller.signal.aborted) {
                    setLoading(false);
                }
            }
        }

        void load();
        return () => controller.abort();
    }, [excludeKey, excludeCatsKey, locale]);

    const handleQuickAdd = useCallback(
        (product: UpsellProduct) => {
            if (hasRequiredModifiers(product.modifierGroups)) {
                setModifierProduct(product);
                return;
            }

            addItem({
                productId: product.id,
                name: product.name,
                basePrice: product.price,
                selectedModifiers: [],
                calculatedItemPrice: product.price,
                image:
                    getProductCoverUrl({
                        images: product.images,
                        mainImage: product.mainImage,
                    }) ?? undefined,
            });
        },
        [addItem],
    );

    if (loading || products.length === 0) {
        return null;
    }

    return (
        <>
            {title ? (
                <Typography
                    variant="overline"
                    color="text.secondary"
                    sx={{ display: "block", mb: 1.25, letterSpacing: "0.08em" }}
                >
                    {title}
                </Typography>
            ) : null}
            <Box
                sx={{
                    display: "flex",
                    gap: 1,
                    overflowX: "auto",
                    pb: 0.5,
                    mx: { xs: -0.5, sm: 0 },
                    px: { xs: 0.5, sm: 0 },
                    scrollbarWidth: "none",
                    "&::-webkit-scrollbar": { display: "none" },
                }}
            >
                {products.map((product) => {
                    const coverUrl = getProductCoverUrl(product);

                    return (
                        <ButtonBase
                            key={product.id}
                            onClick={() => handleQuickAdd(product)}
                            aria-label={`${product.name} +${formatStorePrice(product.price)} ֏`}
                            sx={{
                                flexShrink: 0,
                                display: "inline-flex",
                                alignItems: "center",
                                gap: 1,
                                pl: 0.5,
                                pr: 0.75,
                                py: 0.5,
                                borderRadius: 999,
                                border: "1px solid",
                                borderColor: "divider",
                                bgcolor: tokens.surfaceHi,
                                transition:
                                    "border-color 0.15s, background-color 0.15s",
                                "&:hover": { borderColor: tokens.brand },
                                "&:active": { transform: "scale(0.97)" },
                            }}
                        >
                            <Avatar
                                src={coverUrl ?? undefined}
                                alt=""
                                sx={{
                                    width: 34,
                                    height: 34,
                                    bgcolor: tokens.surface,
                                    fontSize: 13,
                                }}
                            >
                                {product.name.slice(0, 1)}
                            </Avatar>
                            <Box
                                sx={{
                                    display: "flex",
                                    flexDirection: "column",
                                    alignItems: "flex-start",
                                    minWidth: 0,
                                }}
                            >
                                <Typography
                                    component="span"
                                    sx={{
                                        fontSize: 13,
                                        fontWeight: 600,
                                        lineHeight: 1.2,
                                        color: "text.primary",
                                        whiteSpace: "nowrap",
                                        maxWidth: 130,
                                        overflow: "hidden",
                                        textOverflow: "ellipsis",
                                    }}
                                >
                                    {product.name}
                                </Typography>
                                <Typography
                                    component="span"
                                    sx={{
                                        fontSize: 11.5,
                                        fontWeight: 700,
                                        lineHeight: 1.2,
                                        color: tokens.textMuted,
                                        whiteSpace: "nowrap",
                                        fontVariantNumeric: "tabular-nums",
                                    }}
                                >
                                    +{formatStorePrice(product.price)} ֏
                                </Typography>
                            </Box>
                            <Box
                                component="span"
                                sx={{
                                    display: "inline-flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    width: 22,
                                    height: 22,
                                    borderRadius: "50%",
                                    bgcolor: tokens.brandDim,
                                    color: tokens.brand,
                                    flexShrink: 0,
                                }}
                            >
                                <AddRoundedIcon sx={{ fontSize: 16 }} />
                            </Box>
                        </ButtonBase>
                    );
                })}
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
                            }) ?? undefined,
                    });
                    setModifierProduct(null);
                }}
            />
        </>
    );
}
