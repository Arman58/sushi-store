"use client";

import { useEffect } from "react";

import {
    subscribeFavoritesAcrossTabs,
    useFavoritesStore,
} from "./store";

/**
 * SSR-safe избранное: до гидратации всегда пустой список,
 * после маунта - данные из localStorage + live-обновления.
 */
export function useFavorites() {
    const ids = useFavoritesStore((s) => s.ids);
    const hydrated = useFavoritesStore((s) => s.hydrated);
    const hydrate = useFavoritesStore((s) => s.hydrate);
    const toggle = useFavoritesStore((s) => s.toggle);

    useEffect(() => {
        hydrate();
        return subscribeFavoritesAcrossTabs();
    }, [hydrate]);

    return { ids, hydrated, toggle };
}

/** Точечная подписка для карточки товара. */
export function useIsFavorite(productId: number | undefined) {
    const isFavorite = useFavoritesStore((s) =>
        productId === undefined ? false : s.ids.includes(productId),
    );
    const hydrate = useFavoritesStore((s) => s.hydrate);
    const toggle = useFavoritesStore((s) => s.toggle);

    useEffect(() => {
        hydrate();
    }, [hydrate]);

    return {
        isFavorite,
        toggle: () => {
            if (productId !== undefined) toggle(productId);
        },
    };
}
