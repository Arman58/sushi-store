import type { ImageLoaderProps } from "next/image";

/**
 * next/image loader: ресайз и сжатие на CDN Cloudinary вместо
 * Vercel-оптимизатора. f_auto отдаёт AVIF/WebP по Accept-заголовку,
 * q_auto подбирает качество, c_limit не апскейлит маленькие оригиналы.
 * Для не-Cloudinary источников возвращает URL без изменений.
 */
export function cloudinaryImageLoader({
    src,
    width,
    quality,
}: ImageLoaderProps): string {
    if (
        src.startsWith("https://res.cloudinary.com/") &&
        src.includes("/upload/")
    ) {
        const params = `f_auto,q_${quality ?? "auto"},w_${width},c_limit`;
        return src.replace("/upload/", `/upload/${params}/`);
    }

    if (src.startsWith("https://images.unsplash.com/")) {
        const sep = src.includes("?") ? "&" : "?";
        return `${src}${sep}auto=format&fit=max&w=${width}&q=${quality ?? 75}`;
    }

    return src;
}
