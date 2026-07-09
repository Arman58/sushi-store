import { revalidateTag } from "next/cache";

import { CACHE_TAGS, type CacheTag } from "@/lib/cache-tags";

/** Next.js 16 requires a cacheLife profile as the second argument. */
const REVALIDATE_PROFILE = "max";

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
