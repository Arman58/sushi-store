"use client";

import {
    createContext,
    type ReactNode,
    useContext,
    useMemo,
    useState,
} from "react";

import {
    type LocalizedJson,
    STORE_LOCALES,
    type StoreLocale,
} from "@/lib/i18n-utils";

export type AdminLocalizationContextValue = {
    activeLocale: StoreLocale;
    setActiveLocale: (locale: StoreLocale) => void;
    /** Инкремент после успешного AI-перевода — форсирует перерисовку полей. */
    translationRevision: number;
    notifyTranslationApplied: () => void;
};

const AdminLocalizationContext =
    createContext<AdminLocalizationContextValue | null>(null);

export function useAdminLocalization(): AdminLocalizationContextValue | null {
    return useContext(AdminLocalizationContext);
}

type AdminLocalizationProviderProps = {
    children: ReactNode;
    defaultLocale?: StoreLocale;
};

export function AdminLocalizationProvider({
    children,
    defaultLocale = "ru",
}: AdminLocalizationProviderProps) {
    const [activeLocale, setActiveLocale] =
        useState<StoreLocale>(defaultLocale);
    const [translationRevision, setTranslationRevision] = useState(0);

    const notifyTranslationApplied = () => {
        setTranslationRevision((n) => n + 1);
        setActiveLocale("hy");
    };

    const value = useMemo(
        () => ({
            activeLocale,
            setActiveLocale,
            translationRevision,
            notifyTranslationApplied,
        }),
        [activeLocale, translationRevision],
    );

    return (
        <AdminLocalizationContext.Provider value={value}>
            {children}
        </AdminLocalizationContext.Provider>
    );
}

/** Сколько полей с непустым русским текстом готовы к переводу. */
export function countRussianSourceFields(
    values: Array<LocalizedJson | undefined | null>,
): number {
    return values.filter((value) => Boolean(value?.ru?.trim())).length;
}

/** Заполнен ли хотя бы один локаль во всех переданных полях. */
export function localeFillStatus(
    values: Array<LocalizedJson | undefined | null>,
    locale: StoreLocale,
): boolean {
    return values.some((value) => Boolean(value?.[locale]?.trim()));
}

export { STORE_LOCALES };
