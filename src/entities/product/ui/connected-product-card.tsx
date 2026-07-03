"use client";

import useMediaQuery from "@mui/material/useMediaQuery";
import { memo, useCallback, useState } from "react";

import type { MenuModifierGroup } from "@/entities/product/model/modifiers";
import type { ProductBadge } from "@/entities/product/ui/product-card";
import { ProductCard } from "@/entities/product/ui/product-card";
import { ProductQuickView } from "@/entities/product/ui/product-quick-view";
import { buildCartItemId, useCartStore } from "@/features/cart";
import { getProductCoverUrl } from "@/shared/lib/product-cover";

export type ConnectableProduct = {
    id: number;
    slug: string;
    name: string;
    description?: string | null;
    composition?: string | null;
    price: number;
    weight?: number | null;
    images?: unknown;
    mainImage?: string | null;
    category?: { name: string; slug?: string } | null;
    modifierGroups?: MenuModifierGroup[];
    ratingAvg?: number;
    ratingCount?: number;
    isAvailable?: boolean;
    minQty?: number;
    maxQty?: number | null;
};

type ConnectedProductCardProps = {
    product: ConnectableProduct;
    index?: number;
    imagePriority?: boolean;
    badges?: ProductBadge[];
    onOpenModifiers: (product: ConnectableProduct) => void;
};

export const ConnectedProductCard = memo(function ConnectedProductCard({
    product,
    index,
    imagePriority = false,
    badges,
    onOpenModifiers,
}: ConnectedProductCardProps) {
    const quantity = useCartStore(
        useCallback(
            (state) =>
                state.items.reduce(
                    (sum, item) =>
                        item.productId === product.id
                            ? sum + item.quantity
                            : sum,
                    0,
                ),
            [product.id],
        ),
    );
    const setItemQuantity = useCartStore((s) => s.setItemQuantity);
    const addItem = useCartStore((s) => s.addItem);
    const decrementFirstLineForProduct = useCartStore(
        (s) => s.decrementFirstLineForProduct,
    );

    const hasModifiers = (product.modifierGroups?.length ?? 0) > 0;

    const handleAddToCart = useCallback(() => {
        if (hasModifiers) {
            onOpenModifiers(product);
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
        // Минимальная партия: первое добавление кладёт minQty штук
        const minQty = product.minQty ?? 1;
        if (minQty > 1 && quantity === 0) {
            setItemQuantity(buildCartItemId(product.id, []), minQty);
        }
    }, [addItem, hasModifiers, onOpenModifiers, product, quantity, setItemQuantity]);

    const maxQty = product.maxQty ?? null;
    const maxReached = maxQty !== null && quantity >= maxQty;

    const handleIncrease = useCallback(() => {
        if (maxReached) return;
        if (hasModifiers) {
            onOpenModifiers(product);
            return;
        }
        const cartItemId = buildCartItemId(product.id, []);
        setItemQuantity(cartItemId, quantity + 1);
    }, [
        hasModifiers,
        maxReached,
        onOpenModifiers,
        product,
        quantity,
        setItemQuantity,
    ]);

    const handleDecrease = useCallback(() => {
        decrementFirstLineForProduct(product.id);
    }, [decrementFirstLineForProduct, product.id]);

    const productHref = `/menu/${product.slug}`;

    // Mobile-first: на телефоне карточка открывает bottom-sheet (паттерн Wolt),
    // на десктопе - обычная ссылка на страницу товара (SEO/привычный UX).
    const isMobile = useMediaQuery("(max-width:600px)");
    const [quickViewOpen, setQuickViewOpen] = useState(false);
    const openQuickView = useCallback(() => setQuickViewOpen(true), []);
    const closeQuickView = useCallback(() => setQuickViewOpen(false), []);

    return (
        <>
        <ProductCard
            productId={product.id}
            index={index}
            imagePriority={imagePriority}
            name={product.name}
            description={product.description}
            categoryName={product.category?.name}
            composition={product.composition ?? product.description ?? undefined}
            price={product.price}
            weight={product.weight ?? undefined}
            images={product.images}
            mainImage={product.mainImage}
            badges={badges}
            quantity={quantity}
            ratingAvg={product.ratingAvg}
            ratingCount={product.ratingCount}
            isAvailable={product.isAvailable !== false}
            maxQtyReached={maxReached}
            productHref={isMobile ? undefined : productHref}
            onOpenDetails={isMobile ? openQuickView : undefined}
            onAddToCart={handleAddToCart}
            onIncrease={handleIncrease}
            onDecrease={handleDecrease}
        />
        {isMobile && (
            <ProductQuickView
                open={quickViewOpen}
                onClose={closeQuickView}
                product={product}
                onAdd={handleAddToCart}
            />
        )}
        </>
    );
});
