"use client";

import {
    startTransition,
    useEffect,
    useState,
} from "react";

type UseProgressiveRenderOptions = {
    /** Сколько элементов показать сразу (above-the-fold). */
    initialCount?: number;
    /** Сколько добавлять за один idle-шаг. */
    batchSize?: number;
};

/**
 * Постепенный рендер длинных списков: первый батч сразу,
 * остальное — в idle, без блокировки main thread.
 */
export function useProgressiveRender(
    totalCount: number,
    resetKey: string,
    {
        initialCount = 12,
        batchSize = 12,
    }: UseProgressiveRenderOptions = {},
): number {
    const [visibleCount, setVisibleCount] = useState(() =>
        Math.min(initialCount, totalCount),
    );

    useEffect(() => {
        setVisibleCount(Math.min(initialCount, totalCount));
    }, [resetKey, totalCount, initialCount]);

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

        const id = schedule(() => {
            startTransition(() => {
                setVisibleCount((prev) =>
                    Math.min(prev + batchSize, totalCount),
                );
            });
        });

        return () => cancel(id as number);
    }, [visibleCount, totalCount, batchSize]);

    return visibleCount;
}
