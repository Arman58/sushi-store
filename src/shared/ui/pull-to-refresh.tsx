"use client";

/**
 * Pull-to-refresh отключён: глобальные touchmove-слушатели с passive:false
 * блокировали тапы и перегружали main thread на мобильных.
 * Обновление страницы — через router.refresh() в конкретных экранах или жест браузера.
 */
export function PullToRefresh() {
    return null;
}
