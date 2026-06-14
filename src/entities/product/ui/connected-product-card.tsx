"use client";

import { memo, startTransition, useCallback } from "react";

import type { MenuModifierGroup } from "@/entities/product/model/modifiers";
import type { ProductBadge } from "@/entities/product/ui/product-card";
import { ProductCard } from "@/entities/product/ui/product-card";
import { buildCartItemId, useCartStore } from "@/features/cart";
import { getProductCoverUrl } from "@/shared/lib/product-cover";

export type ConnectableProduct = {
    id: number;
    name: string;
    description?: string | null;
    composition?: string | null;
    price: number;
    weight?: number | null;
    images?: unknown;
    mainImage?: string | null;
    category?: { name: string } | null;
    modifierGroups?: MenuModifierGroup[];
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
    const addItem = useCartStore((s) => s.addItem);
    const setItemQuantity = useCartStore((s) => s.setItemQuantity);
    const decrementFirstLineForProduct = useCartStore(
        (s) => s.decrementFirstLineForProduct,
    );

    const hasModifiers = (product.modifierGroups?.length ?? 0) > 0;

    const handleAddToCart = useCallback(() => {
        if (hasModifiers) {
            onOpenModifiers(product);
            return;
        }
        startTransition(() => {
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
                    }) || "",
            });
        });
    }, [addItem, hasModifiers, onOpenModifiers, product]);

    const handleIncrease = useCallback(() => {
        if (hasModifiers) {
            onOpenModifiers(product);
            return;
        }
        startTransition(() => {
            const cartItemId = buildCartItemId(product.id, []);
            setItemQuantity(cartItemId, quantity + 1);
        });
    }, [
        hasModifiers,
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

    return (
        <ProductCard
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
            onAddToCart={handleAddToCart}
            onIncrease={handleIncrease}
            onDecrease={handleDecrease}
        />
    );
});
