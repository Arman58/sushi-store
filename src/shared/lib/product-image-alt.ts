const ALT_SUFFIX = "delivery in Yerevan - East West";

/** SEO-friendly alt for product cover images (geo-targeted). */
export function buildProductImageAlt(productName: string): string {
    const trimmed = productName.trim();
    if (!trimmed) return `Food ${ALT_SUFFIX}`;
    return `${trimmed} ${ALT_SUFFIX}`;
}
