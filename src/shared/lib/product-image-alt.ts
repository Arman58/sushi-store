import type { AppLocale } from "@/i18n/routing";

const ALT_SUFFIX: Record<AppLocale, string> = {
    hy: "առաքում Երևանում - East West",
    ru: "доставка в Ереване - East West",
    en: "delivery in Yerevan - East West",
};

const FALLBACK_PRODUCT_LABEL: Record<AppLocale, string> = {
    hy: "Ուտեստ",
    ru: "Блюдо",
    en: "Food",
};

function normalizeLocale(locale: string): AppLocale {
    if (locale === "hy" || locale === "ru" || locale === "en") return locale;
    return "hy";
}

/** SEO-friendly alt for product cover images (geo-targeted). */
export function buildProductImageAlt(productName: string, locale: string): string {
    const loc = normalizeLocale(locale);
    const suffix = ALT_SUFFIX[loc];
    const trimmed = productName.trim();
    if (!trimmed) return `${FALLBACK_PRODUCT_LABEL[loc]} ${suffix}`;
    return `${trimmed} ${suffix}`;
}
