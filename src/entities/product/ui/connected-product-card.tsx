"use client";

import { memo, startTransition, useCallback, useState } from "react";
import { useShallow } from "zustand/react/shallow";

import type { MenuModifierGroup } from "@/entities/product/model/modifiers";
import type { ProductBadge } from "@/entities/product/ui/product-card";
import { ProductCard } from "@/entities/product/ui/product-card";
import { ProductQuickView } from "@/entities/product/ui/product-quick-view";
import { buildCartItemId, useCartStore } from "@/features/cart";
import { getProductCoverUrl } from "@/shared/lib/product-cover";
import { useMobileViewport } from "@/shared/lib/use-mobile-viewport";

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
    /** Есть ли модификаторы (сами группы могут догружаться по требованию). */
    hasModifiers?: boolean;
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
        (state) => state.qtyByProductId[product.id] ?? 0,
    );
    const { setItemQuantity, addItem, decrementFirstLineForProduct } = useCartStore(
        useShallow((s) => ({
            setItemQuantity: s.setItemQuantity,
            addItem: s.addItem,
            decrementFirstLineForProduct: s.decrementFirstLineForProduct,
        })),
    );

    const hasModifiers =
        product.hasModifiers ?? (product.modifierGroups?.length ?? 0) > 0;

    const handleAddToCart = useCallback(() => {
        if (hasModifiers) {
            onOpenModifiers(product);
            return;
        }
        const minQty = product.minQty ?? 1;
        addItem({
            productId: product.id,
            name: product.name,
            basePrice: product.price,
            selectedModifiers: [],
            calculatedItemPrice: product.price,
            initialQuantity: minQty > 1 ? minQty : undefined,
            image:
                getProductCoverUrl({
                    images: product.images,
                    mainImage: product.mainImage,
                }) ?? undefined,
        });
    }, [addItem, hasModifiers, onOpenModifiers, product]);

    const maxQty = product.maxQty ?? null;
    const maxReached = maxQty !== null && quantity >= maxQty;

    const handleIncrease = useCallback(() => {
        if (maxReached) return;
        if (hasModifiers) {
            onOpenModifiers(product);
            return;
        }
        const cartItemId = buildCartItemId(product.id, []);
        startTransition(() => {
            setItemQuantity(cartItemId, quantity + 1);
        });
    }, [
        hasModifiers,
        maxReached,
        onOpenModifiers,
        product,
        quantity,
        setItemQuantity,
    ]);

    const handleDecrease = useCallback(() => {
        startTransition(() => {
            decrementFirstLineForProduct(product.id);
        });
    }, [decrementFirstLineForProduct, product.id]);

    const productHref = `/menu/${product.slug}`;

    // Mobile-first: на телефоне карточка открывает bottom-sheet (паттерн Wolt),
    // на десктопе - обычная ссылка на страницу товара (SEO/привычный UX).
    const isMobile = useMobileViewport();
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
