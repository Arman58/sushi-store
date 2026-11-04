import { revalidateTag } from "next/cache";

import { CACHE_TAGS, type CacheTag } from "@/lib/cache-tags";

/**
 * Next.js 16 requires a cacheLife profile as the second argument.
 *
 * `"max"` даёт stale-while-revalidate: первый заход после сохранения в админке
 * получал СТАРЫЕ данные (старое фото категории, цену), свежие - только со второго.
 * Все вызовы идут из Route Handlers админки (updateTag там недоступен), а админ
 * ждёт, что правка видна сразу, поэтому истекаем кэш немедленно: `{ expire: 0 }`.
 */
const REVALIDATE_PROFILE = { expire: 0 } as const;

export function invalidateCacheTags(...tags: CacheTag[]): void {
    for (const tag of tags) {
        revalidateTag(tag, REVALIDATE_PROFILE);
    }
}

export function invalidateCatalogCache(): void {
    invalidateCacheTags(CACHE_TAGS.categories, CACHE_TAGS.products, CACHE_TAGS.menu);
}

export function invalidateBannersCache(): void {
    invalidateCacheTags(CACHE_TAGS.banners);
}

export function invalidateDeliveryZonesCache(): void {
    invalidateCacheTags(CACHE_TAGS.deliveryZones);
}
