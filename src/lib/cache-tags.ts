/** Cache tags for Next.js `unstable_cache` / `revalidateTag`. */
export const CACHE_TAGS = {
    categories: "categories",
    products: "products",
    banners: "banners",
    deliveryZones: "delivery-zones",
    menu: "menu",
} as const;

export type CacheTag = (typeof CACHE_TAGS)[keyof typeof CACHE_TAGS];
