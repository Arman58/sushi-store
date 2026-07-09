"use client";

import {
    startTransition,
    useCallback,
    useEffect,
    useRef,
    useState,
} from "react";

type UseProgressiveRenderOptions = {
    /** Сколько элементов показать сразу (above-the-fold). */
    initialCount?: number;
    /** Сколько добавлять за один шаг. */
    batchSize?: number;
    /** Подгружать следующий батч, когда sentinel попадает в viewport. */
    rootMargin?: string;
};

type UseProgressiveRenderResult = {
    visibleCount: number;
    /** Привязать к sentinel-элементу в конце списка для scroll-triggered load. */
    loadMoreRef: (node: Element | null) => void;
};

/**
 * Постепенный рендер длинных списков: первый батч сразу,
 * остальное — в idle и при скролле к sentinel, без блокировки main thread.
 */
export function useProgressiveRender(
    totalCount: number,
    resetKey: string,
    {
        initialCount = 12,
        batchSize = 12,
        rootMargin = "240px 0px",
    }: UseProgressiveRenderOptions = {},
): UseProgressiveRenderResult {
    const initialVisible = Math.min(initialCount, totalCount);
    const [progress, setProgress] = useState({
        resetKey,
        visibleCount: initialVisible,
    });
    const observerRef = useRef<IntersectionObserver | null>(null);

    if (
        progress.resetKey !== resetKey ||
        progress.visibleCount > totalCount
    ) {
        const nextVisible = Math.min(initialCount, totalCount);
        if (
            progress.resetKey !== resetKey ||
            progress.visibleCount !== nextVisible
        ) {
            setProgress({ resetKey, visibleCount: nextVisible });
        }
    }

    const visibleCount = progress.visibleCount;

    const bump = useCallback(() => {
        startTransition(() => {
            setProgress((prev) => ({
                ...prev,
                visibleCount: Math.min(prev.visibleCount + batchSize, totalCount),
            }));
        });
    }, [batchSize, totalCount]);

    useEffect(() => {
        if (visibleCount >= totalCount) return;

        const schedule =
            typeof requestIdleCallback !== "undefined"
                ? requestIdleCallback
                : (cb: () => void) => window.setTimeout(cb, 16);

        const cancel =
            typeof cancelIdleCallback !== "undefined"
                ? cancelIdleCallback
                : clearTimeout;

        const id = schedule(bump);

        return () => cancel(id as number);
    }, [visibleCount, totalCount, bump]);

    const loadMoreRef = useCallback(
        (node: Element | null) => {
            if (observerRef.current) {
                observerRef.current.disconnect();
                observerRef.current = null;
            }

            if (!node || visibleCount >= totalCount) return;

            observerRef.current = new IntersectionObserver(
                ([entry]) => {
                    if (entry?.isIntersecting) bump();
                },
                { rootMargin, threshold: 0 },
            );
            observerRef.current.observe(node);
        },
        [bump, rootMargin, totalCount, visibleCount],
    );

    useEffect(
        () => () => {
            observerRef.current?.disconnect();
        },
        [],
    );

    return { visibleCount, loadMoreRef };
}
