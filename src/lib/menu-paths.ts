/**
 * Canonical storefront URLs for menu categories.
 * Uses `/menu/c/[slug]` so it never collides with product pages at `/menu/[slug]`.
 */

export function menuCategoryPath(slug: string): string {
    if (!slug || slug === "all") return "/menu";
    return `/menu/c/${encodeURIComponent(slug)}`;
}

/** Extract category slug from `/menu/c/:slug` (with optional locale prefix). */
export function categorySlugFromPathname(pathname: string): string | null {
    const match = pathname.match(/(?:^|\/)menu\/c\/([^/?#]+)/);
    if (!match?.[1]) return null;
    try {
        return decodeURIComponent(match[1]);
    } catch {
        return match[1];
    }
}

export function isMenuCategoryPath(pathname: string): boolean {
    return /(?:^|\/)menu\/c\/[^/?#]+/.test(pathname);
}
