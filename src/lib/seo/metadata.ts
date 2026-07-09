import type { Metadata } from "next";

import { type AppLocale,routing } from "@/i18n/routing";
import { getPathname } from "@/i18n/server";
import { DEFAULT_OG_IMAGE, SITE_NAME } from "@/lib/site-config";

const OG_LOCALE: Record<AppLocale, string> = {
    hy: "hy_AM",
    ru: "ru_RU",
    en: "en_US",
};

type LocalizedMetadataInput = {
    locale: string;
    /** Path without locale prefix, e.g. "/", "/menu", "/menu/c/sushi" */
    href: string;
    title: string;
    description: string;
    /** Use when title already includes the brand (avoids root layout title template). */
    titleAbsolute?: boolean;
    openGraph?: {
        title?: string;
        description?: string;
        image?: string;
    };
};

function splitHref(href: string): { pathname: string; search: string | null } {
    const qIndex = href.indexOf("?");
    if (qIndex === -1) {
        return { pathname: href, search: null };
    }
    return {
        pathname: href.slice(0, qIndex),
        search: href.slice(qIndex + 1),
    };
}

function localizedHref(locale: AppLocale, href: string): string {
    const { pathname, search } = splitHref(href);
    const localized = getPathname({ locale, href: pathname });
    return search ? `${localized}?${search}` : localized;
}

export function buildLocalizedMetadata(input: LocalizedMetadataInput): Metadata {
    const locale = input.locale as AppLocale;
    const canonical = localizedHref(locale, input.href);

    const languages: Record<string, string> = Object.fromEntries(
        routing.locales.map((l) => [l, localizedHref(l, input.href)]),
    );
    languages["x-default"] = localizedHref(routing.defaultLocale, input.href);

    const ogTitle = input.openGraph?.title ?? input.title;
    const ogDescription = input.openGraph?.description ?? input.description;
    const ogImage = input.openGraph?.image ?? DEFAULT_OG_IMAGE;

    return {
        title: input.titleAbsolute ? { absolute: input.title } : input.title,
        description: input.description,
        alternates: {
            canonical,
            languages,
        },
        openGraph: {
            title: ogTitle,
            description: ogDescription,
            url: canonical,
            siteName: SITE_NAME,
            locale: OG_LOCALE[locale] ?? OG_LOCALE.hy,
            alternateLocale: routing.locales
                .filter((l) => l !== locale)
                .map((l) => OG_LOCALE[l]),
            type: "website",
            images: [
                {
                    url: ogImage,
                    width: 1200,
                    height: 630,
                    alt: ogTitle,
                },
            ],
        },
    };
}

/** Checkout, cart, orders - never index. */
export const NOINDEX_METADATA: Metadata = {
    robots: { index: false, follow: false },
};
