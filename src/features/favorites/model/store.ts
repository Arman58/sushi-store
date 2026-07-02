"use client";

import { create } from "zustand";

/**
 * Ключ совместим с прежним форматом карточки товара:
 * plain JSON-массив id, например "[1,5,12]".
 */
const STORAGE_KEY = "ew_favorites";

function readStoredIds(): number[] {
    if (typeof window === "undefined") return [];
    try {
        const parsed: unknown = JSON.parse(
            window.localStorage.getItem(STORAGE_KEY) || "[]",
        );
        if (!Array.isArray(parsed)) return [];
        return parsed.filter(
            (x): x is number => typeof x === "number" && Number.isFinite(x),
        );
    } catch {
        return [];
    }
}

function writeStoredIds(ids: number[]) {
    try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
    } catch {
        /* приватный режим / квота — избранное живёт в памяти сессии */
    }
}

type FavoritesState = {
    ids: number[];
    /** true после первого чтения localStorage (SSR-safe). */
    hydrated: boolean;
    hydrate: () => void;
    toggle: (id: number) => void;
    isFavorite: (id: number) => boolean;
};

export const useFavoritesStore = create<FavoritesState>((set, get) => ({
    ids: [],
    hydrated: false,

    hydrate: () => {
        if (get().hydrated) return;
        set({ ids: readStoredIds(), hydrated: true });
    },

    toggle: (id) => {
        const { ids } = get();
        const next = ids.includes(id)
            ? ids.filter((x) => x !== id)
            : [...ids, id];
        writeStoredIds(next);
        set({ ids: next });
    },

    isFavorite: (id) => get().ids.includes(id),
}));

/** Синхронизация между вкладками. Вызывается один раз в layout-клиенте. */
export function subscribeFavoritesAcrossTabs(): () => void {
    if (typeof window === "undefined") return () => {};
    const onStorage = (e: StorageEvent) => {
        if (e.key !== STORAGE_KEY) return;
        useFavoritesStore.setState({ ids: readStoredIds(), hydrated: true });
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
}
