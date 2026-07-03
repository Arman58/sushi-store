"use client";

import "swiper/css";

import AddIcon from "@mui/icons-material/Add";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import IconButton from "@mui/material/IconButton";
import Typography from "@mui/material/Typography";
import dynamic from "next/dynamic";
import { useLocale } from "next-intl";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Swiper, SwiperSlide } from "swiper/react";

import type { MenuModifierGroup } from "@/entities/product/model/modifiers";
import { useCartStore } from "@/features/cart";
import type { CartItem } from "@/features/cart/model/types";
import type { StorefrontProduct } from "@/lib/i18n-utils";
import { formatStorePrice } from "@/shared/lib/format-price";
import { getProductCoverUrl } from "@/shared/lib/product-cover";
import { ProductCoverImage } from "@/shared/ui/product-cover-image";
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
    cartItems: CartItem[];
};

function hasRequiredModifiers(groups: MenuModifierGroup[] | undefined): boolean {
    return (groups ?? []).some((group) => group.required);
}

export function UpsellCarousel({ cartItems }: Props) {
    const locale = useLocale();
    const addItem = useCartStore((s) => s.addItem);

    const [products, setProducts] = useState<UpsellProduct[]>([]);
    const [loading, setLoading] = useState(true);
    const [modifierProduct, setModifierProduct] = useState<UpsellProduct | null>(null);

    const excludeKey = useMemo(
        () =>
            [...new Set(cartItems.map((item) => item.productId))]
                .sort((a, b) => a - b)
                .join(","),
        [cartItems],
    );

    useEffect(() => {
        const controller = new AbortController();

        async function load() {
            setLoading(true);
            try {
                const params = new URLSearchParams({ locale });
                if (excludeKey) {
                    params.set("exclude", excludeKey);
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
    }, [excludeKey, locale]);

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
            <Box
                sx={{
                    mx: { xs: -0.5, sm: 0 },
                    "& .swiper-slide": { width: "auto" },
                }}
            >
                <Swiper slidesPerView="auto" spaceBetween={12}>
                    {products.map((product) => {
                        const coverUrl = getProductCoverUrl(product);

                        return (
                            <SwiperSlide key={product.id}>
                                <Card
                                    variant="outlined"
                                    sx={{
                                        width: 140,
                                        borderRadius: 2,
                                        display: "flex",
                                        flexDirection: "column",
                                    }}
                                >
                                    <Box
                                        sx={{
                                            position: "relative",
                                            height: 80,
                                            overflow: "hidden",
                                            borderTopLeftRadius: 8,
                                            borderTopRightRadius: 8,
                                        }}
                                    >
                                        <ProductCoverImage
                                            src={coverUrl}
                                            alt={product.name}
                                            sizes="140px"
                                        />
                                    </Box>

                                    <CardContent
                                        sx={{
                                            p: 1,
                                            flex: 1,
                                            display: "flex",
                                            flexDirection: "column",
                                            gap: 0.5,
                                            "&:last-child": { pb: 1 },
                                        }}
                                    >
                                        <Typography
                                            variant="body2"
                                            fontWeight={600}
                                            sx={{
                                                lineHeight: 1.25,
                                                display: "-webkit-box",
                                                WebkitLineClamp: 1,
                                                WebkitBoxOrient: "vertical",
                                                overflow: "hidden",
                                            }}
                                        >
                                            {product.name}
                                        </Typography>

                                        <Box
                                            sx={{
                                                display: "flex",
                                                alignItems: "center",
                                                justifyContent: "space-between",
                                                gap: 0.5,
                                                mt: "auto",
                                            }}
                                        >
                                            <Typography
                                                variant="subtitle2"
                                                color="primary.main"
                                                sx={{
                                                    fontVariantNumeric: "tabular-nums",
                                                    minWidth: 0,
                                                    overflow: "hidden",
                                                    textOverflow: "ellipsis",
                                                    whiteSpace: "nowrap",
                                                }}
                                            >
                                                {formatStorePrice(product.price)} ֏
                                            </Typography>

                                            <IconButton
                                                size="small"
                                                aria-label={product.name}
                                                onClick={() => handleQuickAdd(product)}
                                                sx={{
                                                    width: 28,
                                                    height: 28,
                                                    bgcolor: tokens.brandDim,
                                                    color: tokens.brand,
                                                    flexShrink: 0,
                                                    "&:hover": {
                                                        bgcolor: tokens.brandGlow,
                                                    },
                                                }}
                                            >
                                                <AddIcon sx={{ fontSize: 18 }} />
                                            </IconButton>
                                        </Box>
                                    </CardContent>
                                </Card>
                            </SwiperSlide>
                        );
                    })}
                </Swiper>
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
