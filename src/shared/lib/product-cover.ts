/** Нормализует поле `images` (JSON-массив URL) из БД. */

export function getProductImageUrls(images: unknown): string[] {
    if (!Array.isArray(images)) return [];
    return images.filter(
        (x): x is string => typeof x === "string" && x.trim().length > 0,
    );
}

/** URL обложки: явный `mainImage`, если он есть в списке фото, иначе первое из `images`. */

export function getProductCoverUrl(product: {
    images?: unknown;
    mainImage?: string | null;
}): string | null {
    const urls = getProductImageUrls(product.images);
    if (urls.length === 0) return null;
    const m = product.mainImage?.trim();
    if (m && urls.includes(m)) return m;
    return urls[0] ?? null;
}
