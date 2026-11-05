import { SITE_URL } from "@/lib/site-config";

/** Хосты, разрешённые в next.config.ts → images.remotePatterns */
const ALLOWED_REMOTE_HOSTS = new Set([
    "images.unsplash.com",
    "placehold.co",
]);

const CLOUDINARY_HOST = "res.cloudinary.com";

/**
 * Cloudinary разрешён только для нашего аккаунта (как в next.config.ts → remotePatterns).
 * Иначе URL чужого аккаунта проходил бы проверку здесь, а /_next/image отвечал бы 400
 * и вместо плейсхолдера пользователь видел бы битую картинку.
 */
function isOwnCloudinaryUrl(url: URL): boolean {
    const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME?.trim();
    return (
        url.hostname === CLOUDINARY_HOST &&
        !!cloudName &&
        url.pathname.startsWith(`/${cloudName}/`)
    );
}

function siteHostname(): string | null {
    if (!SITE_URL) return null;
    try {
        return new URL(SITE_URL).hostname;
    } catch {
        return null;
    }
}

/**
 * Можно ли передать URL в next/image (локальные пути и разрешённые remote).
 * Блокирует домены вне allowlist - защита от Runtime Error в next/image.
 */
export function isAllowedProductImageSrc(src: string | null | undefined): boolean {
    const trimmed = src?.trim();
    if (!trimmed) return false;

    if (/^https?:\/\//i.test(trimmed)) {
        try {
            const url = new URL(trimmed);
            const ownHost = siteHostname();
            if (ownHost && url.hostname === ownHost) return true;
            if (url.hostname === CLOUDINARY_HOST) return isOwnCloudinaryUrl(url);
            return ALLOWED_REMOTE_HOSTS.has(url.hostname);
        } catch {
            return false;
        }
    }

    if (trimmed.startsWith("/") && !trimmed.startsWith("//")) {
        return true;
    }

    return false;
}

/** Безопасный src для <Image> или null → плейсхолдер. */
export function sanitizeProductImageSrc(src: string | null | undefined): string | null {
    const trimmed = src?.trim();
    if (!trimmed || !isAllowedProductImageSrc(trimmed)) return null;
    return trimmed;
}

/** Нормализует поле `images` (JSON-массив URL) из БД. */
export function getProductImageUrls(images: unknown): string[] {
    if (!Array.isArray(images)) return [];
    return images
        .filter((x): x is string => typeof x === "string" && x.trim().length > 0)
        .map((x) => sanitizeProductImageSrc(x))
        .filter((x): x is string => x !== null);
}

/** URL обложки: mainImage из списка или первое разрешённое фото. */
export function getProductCoverUrl(product: {
    images?: unknown;
    mainImage?: string | null;
}): string | null {
    const urls = getProductImageUrls(product.images);
    const main = sanitizeProductImageSrc(product.mainImage);
    if (main && urls.includes(main)) return main;
    if (main && urls.length === 0) return main;
    return urls[0] ?? null;
}
