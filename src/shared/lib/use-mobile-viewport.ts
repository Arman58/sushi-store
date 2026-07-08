"use client";

import { useSyncExternalStore } from "react";

const MOBILE_QUERY = "(max-width:600px)";

type MediaQueryListener = () => void;

let mediaQuery: MediaQueryList | null = null;
const listeners = new Set<MediaQueryListener>();

function ensureMediaQuery(): MediaQueryList | null {
    if (typeof window === "undefined") return null;
    if (!mediaQuery) {
        mediaQuery = window.matchMedia(MOBILE_QUERY);
        mediaQuery.addEventListener("change", () => {
            for (const listener of listeners) {
                listener();
            }
        });
    }
    return mediaQuery;
}

function subscribe(listener: MediaQueryListener): () => void {
    ensureMediaQuery();
    listeners.add(listener);
    return () => listeners.delete(listener);
}

function getSnapshot(): boolean {
    return ensureMediaQuery()?.matches ?? false;
}

/** Один matchMedia на все карточки вместо useMediaQuery в каждой. */
export function useMobileViewport(): boolean {
    return useSyncExternalStore(subscribe, getSnapshot, () => false);
}
