import { DEFAULT_OG_IMAGE, SITE_URL } from "@/lib/site-config";

/** Абсолютный URL изображения для Open Graph и JSON-LD. */
export function absoluteProductImageUrl(src: string | null | undefined): string {
    const trimmed = src?.trim();
    if (!trimmed) {
        return `${SITE_URL}${DEFAULT_OG_IMAGE}`;
    }
    if (/^https?:\/\//i.test(trimmed)) {
        return trimmed;
    }
    return `${SITE_URL}${trimmed.startsWith("/") ? trimmed : `/${trimmed}`}`;
}
