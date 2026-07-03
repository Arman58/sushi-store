"use client";

import { useEffect } from "react";
import { create } from "zustand";

const STORAGE_KEY = "ew_recently_viewed";
const MAX_ITEMS = 12;

function readStored(): number[] {
    if (typeof window === "undefined") return [];
    try {
        const parsed: unknown = JSON.parse(
            window.localStorage.getItem(STORAGE_KEY) || "[]",
        );
        if (!Array.isArray(parsed)) return [];
        return parsed
            .filter((x): x is number => typeof x === "number" && Number.isFinite(x))
            .slice(0, MAX_ITEMS);
    } catch {
        return [];
    }
}

type RecentlyViewedState = {
    ids: number[];
    hydrated: boolean;
    hydrate: () => void;
    add: (id: number) => void;
};

export const useRecentlyViewedStore = create<RecentlyViewedState>(
    (set, get) => ({
        ids: [],
        hydrated: false,
        hydrate: () => {
            if (get().hydrated) return;
            set({ ids: readStored(), hydrated: true });
        },
        add: (id) => {
            const current = get().hydrated ? get().ids : readStored();
            const next = [id, ...current.filter((x) => x !== id)].slice(
                0,
                MAX_ITEMS,
            );
            try {
                window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
            } catch {
                /* приватный режим - живёт в памяти */
            }
            set({ ids: next, hydrated: true });
        },
    }),
);

/** SSR-safe чтение списка. */
export function useRecentlyViewed() {
    const ids = useRecentlyViewedStore((s) => s.ids);
    const hydrated = useRecentlyViewedStore((s) => s.hydrated);
    const hydrate = useRecentlyViewedStore((s) => s.hydrate);
    useEffect(() => {
        hydrate();
    }, [hydrate]);
    return { ids, hydrated };
}

/** Отметить товар просмотренным (страница товара). */
export function useTrackProductView(productId: number) {
    const add = useRecentlyViewedStore((s) => s.add);
    useEffect(() => {
        add(productId);
    }, [add, productId]);
}
