"use client";

import { useSyncExternalStore } from "react";

/**
 * Насколько «визуальный» viewport короче layout viewport снизу (px).
 * На iOS/Android при открытой клавиатуре > 0 — sticky CTA можно поднять над ней.
 * Desktop / без Visual Viewport API → 0.
 */
function readBottomInset(): number {
    if (typeof window === "undefined") return 0;
    const vv = window.visualViewport;
    if (!vv) return 0;
    // Клавиатура / browser chrome, перекрывающие низ страницы
    const inset = Math.max(
        0,
        Math.round(window.innerHeight - vv.height - vv.offsetTop),
    );
    // Игнор мелких колебаний (адресная строка)
    return inset < 48 ? 0 : inset;
}

function subscribe(onStoreChange: () => void): () => void {
    if (typeof window === "undefined") return () => {};
    const vv = window.visualViewport;
    if (!vv) return () => {};

    vv.addEventListener("resize", onStoreChange);
    vv.addEventListener("scroll", onStoreChange);
    window.addEventListener("resize", onStoreChange);
    return () => {
        vv.removeEventListener("resize", onStoreChange);
        vv.removeEventListener("scroll", onStoreChange);
        window.removeEventListener("resize", onStoreChange);
    };
}

/** Mobile keyboard / chrome overlap under the layout viewport (px). */
export function useVisualViewportBottomInset(): number {
    return useSyncExternalStore(subscribe, readBottomInset, () => 0);
}
