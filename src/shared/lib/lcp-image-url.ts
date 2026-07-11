/**
 * Предрасчёт URL для LCP-картинок (hero, above-the-fold).
 * Обходит next/image loader на сервере — функции не сериализуются в RSC.
 */
export function buildLcpImageUrl(
    src: string,
    width: number,
    quality = 75,
): string {
    if (
        src.startsWith("https://res.cloudinary.com/") &&
        src.includes("/upload/")
    ) {
        const params = `f_auto,q_auto,w_${width},c_limit`;
        return src.replace("/upload/", `/upload/${params}/`);
    }

    if (src.startsWith("https://images.unsplash.com/")) {
        const base = src.split("?")[0] ?? src;
        return `${base}?auto=format&fit=crop&w=${width}&q=${quality}`;
    }

    return src;
}

export function buildLcpSrcSet(
    src: string,
    widths: readonly number[],
    quality = 75,
): string {
    return widths
        .map((w) => `${buildLcpImageUrl(src, w, quality)} ${w}w`)
        .join(", ");
}
