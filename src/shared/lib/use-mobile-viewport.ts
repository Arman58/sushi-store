"use client";

import { useSyncExternalStore } from "react";

type MediaQueryListener = () => void;

const registry = new Map<
    string,
    {
        mql: MediaQueryList;
        listeners: Set<MediaQueryListener>;
    }
>();

function ensure(query: string) {
    let entry = registry.get(query);
    if (!entry) {
        const mql = window.matchMedia(query);
        const listeners = new Set<MediaQueryListener>();
        mql.addEventListener("change", () => {
            for (const listener of listeners) listener();
        });
        entry = { mql, listeners };
        registry.set(query, entry);
    }
    return entry;
}

function subscribe(query: string, listener: MediaQueryListener): () => void {
    if (typeof window === "undefined") return () => {};
    const entry = ensure(query);
    entry.listeners.add(listener);
    return () => entry.listeners.delete(listener);
}

function getSnapshot(query: string): boolean {
    if (typeof window === "undefined") return false;
    return ensure(query).mql.matches;
}

/** Shared matchMedia subscription (one listener set per query string). */
export function useMediaQueryMatch(query: string): boolean {
    return useSyncExternalStore(
        (listener) => subscribe(query, listener),
        () => getSnapshot(query),
        () => false,
    );
}

/** Mobile phone viewport (MUI `sm` down). */
export function useMobileViewport(): boolean {
    return useMediaQueryMatch("(max-width:600px)");
}

/** Tablet and below (MUI `md` down) — admin cards / fullScreen dialogs. */
export function useTabletDown(): boolean {
    return useMediaQueryMatch("(max-width:900px)");
}
