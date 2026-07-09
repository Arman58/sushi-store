"use client";

import { useEffect } from "react";

import {
    subscribeFavoritesAcrossTabs,
    useFavoritesStore,
} from "./store";

/**
 * SSR-safe избранное: до гидратации всегда пустой список,
 * после маунта - данные из localStorage + live-обновления.
 * Вызывать один раз в layout / nav — не в каждой карточке.
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

/**
 * Точечная подписка для карточки: ре-рендер только когда
 * статус избранного именно этого productId меняется (Object.is).
 * Гидратация — ответственность layout (useFavorites).
 */
export function useIsFavorite(productId: number | undefined) {
    const isFavorite = useFavoritesStore((s) =>
        productId === undefined ? false : s.ids.includes(productId),
    );
    const toggle = useFavoritesStore((s) => s.toggle);

    return {
        isFavorite,
        toggle: () => {
            if (productId !== undefined) toggle(productId);
        },
    };
}
