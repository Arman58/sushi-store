"use client";

import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import Box from "@mui/material/Box";
import ButtonBase from "@mui/material/ButtonBase";
import Typography from "@mui/material/Typography";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useState } from "react";

import type { MenuModifierGroup } from "@/entities/product/model/modifiers";
import type { ProductBadge } from "@/entities/product/ui/product-card";
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

// ─── Types ────────────────────────────────────────────────────────────────────

export type PopularProduct = {
    id: number;
    name: string;
    description?: string | null;
    price: number;
    weight?: number | null;
    images?: unknown;
    mainImage?: string | null;
    category?: { name: string } | null;
    composition?: string | null;
    modifierGroups?: MenuModifierGroup[];
};

type Props = {
    products: PopularProduct[];
    title?: string;
    badge?: ProductBadge;
    seeAllHref?: string;
    /** First product tile image optimized for LCP (home hero row). */
    prioritizeFirstImage?: boolean;
};

// ─── Cinematic section header ─────────────────────────────────────────────────

function SectionHeader({
    title,
    seeAllHref,
}: {
    title: string;
    seeAllHref?: string;
}) {
    return (
        <Box
            sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                mb: { xs: 2.5, sm: 3 },
                minWidth: 0,
                gap: 1,
            }}
        >
            <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, minWidth: 0, flex: 1, overflow: "hidden" }}>
                {/* Brand accent bar */}
                <Box
                    sx={{
                        width: 4,
                        height: { xs: 22, sm: 28 },
                        borderRadius: 999,
                        background: `linear-gradient(180deg, ${tokens.brand} 0%, #008C33 100%)`,
                        boxShadow: `0 2px 12px ${tokens.brandGlow}`,
                        flexShrink: 0,
                    }}
                />
                <Typography
                    component="h2"
                    variant="h5"
                    fontWeight={900}
                    sx={{
                        letterSpacing: -0.5,
                        fontSize: { xs: "1.2rem", sm: "1.4rem" },
                        lineHeight: 1.1,
                        color: tokens.textPrimary,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                    }}
                >
                    {title}
                </Typography>
            </Box>

            {seeAllHref && (
                <ButtonBase
                    component={Link}
                    href={seeAllHref}
                    sx={{
                        display: "flex",
                        alignItems: "center",
                        gap: 0.5,
                        px: 1.5,
                        py: 0.75,
                        borderRadius: "10px",
                        border: `1px solid ${tokens.border}`,
                        bgcolor: "transparent",
                        color: "primary.dark",
                        flexShrink: 0,
                        transition: "all 0.18s ease",
                        "&:hover": {
                            bgcolor: tokens.brandDim,
                            borderColor: tokens.brand + "44",
                            gap: 0.9,
                        },
                        "&:active": { transform: "scale(0.95)" },
                    }}
                >
                    <Typography
                        variant="caption"
                        fontWeight={700}
                        sx={{
                            color: "inherit",
                            fontSize: 12,
                            letterSpacing: 0.2,
                        }}
                    >
                        Все
                    </Typography>
                    <ArrowForwardIcon sx={{ fontSize: 13, color: "inherit" }} />
                </ButtonBase>
            )}
        </Box>
    );
}

// ─── Component ────────────────────────────────────────────────────────────────

export function PopularSection({
    products,
    title = "Популярное",
    badge,
    seeAllHref = "/menu",
    prioritizeFirstImage = false,
}: Props) {
    const addItem = useCartStore((s) => s.addItem);
    const setItemQty = useCartStore((s) => s.setItemQuantity);
    const decrementFirstLineForProduct = useCartStore(
        (s) => s.decrementFirstLineForProduct,
    );
    const cartItems = useCartStore((s) => s.items);
    const [modifierProduct, setModifierProduct] = useState<PopularProduct | null>(
        null,
    );

    function productHasModifiers(p: PopularProduct) {
        return (p.modifierGroups?.length ?? 0) > 0;
    }

    function qtyForProduct(productId: number) {
        return cartItems
            .filter((i) => i.productId === productId)
            .reduce((s, i) => s + i.quantity, 0);
    }

    const handleAdd = (p: PopularProduct) => {
        if (productHasModifiers(p)) {
            setModifierProduct(p);
            return;
        }
        const thumb = getProductCoverUrl({
            images: p.images,
            mainImage: p.mainImage,
        });
        addItem({
            productId: p.id,
            name: p.name,
            basePrice: p.price,
            selectedModifiers: [],
            calculatedItemPrice: p.price,
            image: thumb,
        });
    };

    const handleIncrease = (p: PopularProduct) => {
        if (productHasModifiers(p)) {
            setModifierProduct(p);
            return;
        }
        const cartItemId = buildCartItemId(p.id, []);
        const q =
            cartItems.find((i) => i.cartItemId === cartItemId)?.quantity ?? 0;
        setItemQty(cartItemId, q + 1);
    };

    if (products.length === 0) return null;

    return (
        <Box component="section">
            <SectionHeader title={title} seeAllHref={seeAllHref} />

            <Box
                sx={{
                    display: "grid",
                    gap: { xs: 1.5, sm: 2, md: 2.5 },
                    minWidth: 0,
                    alignItems: "stretch",
                    gridTemplateColumns: {
                        xs: "repeat(2, minmax(0, 1fr))",
                        sm: "repeat(3, minmax(0, 1fr))",
                        md: "repeat(4, minmax(0, 1fr))",
                    },
                }}
            >
                {products.map((product, index) => {
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
                            imagePriority={prioritizeFirstImage && index === 0}
                            name={product.name}
                            description={product.description}
                            categoryName={product.category?.name}
                            composition={product.composition ?? undefined}
                            price={product.price}
                            weight={product.weight}
                            images={product.images}
                            mainImage={product.mainImage}
                            badges={badge ? [badge] : []}
                            quantity={qty}
                            onAddToCart={() => handleAdd(product)}
                            onIncrease={() => handleIncrease(product)}
                            onDecrease={() =>
                                decrementFirstLineForProduct(product.id)
                            }
                        />
                        </Box>
                    );
                })}
            </Box>

            <ProductModifiersDialog
                open={modifierProduct !== null}
                onClose={() => setModifierProduct(null)}
                productName={modifierProduct?.name ?? ""}
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
                        image: thumb,
                    });
                }}
            />
        </Box>
    );
}
