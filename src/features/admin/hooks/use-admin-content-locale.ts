"use client";

import { useLocale } from "next-intl";
import { useCallback } from "react";

import {
    getLocalizedField,
    STORE_LOCALES,
    type StoreLocale,
} from "@/lib/i18n-utils";

export function useAdminContentLocale(): StoreLocale {
    const locale = useLocale();
    if ((STORE_LOCALES as readonly string[]).includes(locale)) {
        return locale as StoreLocale;
    }
    return "hy";
}

export function useLocalizedFieldFn() {
    const locale = useAdminContentLocale();
    return useCallback(
        (jsonField: unknown) => getLocalizedField(jsonField, locale),
        [locale],
    );
}

export function useLocalizedField(jsonField: unknown): string {
    const locale = useAdminContentLocale();
    return getLocalizedField(jsonField, locale);
}
