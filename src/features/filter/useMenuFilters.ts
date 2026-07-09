"use client";

import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

import { usePathname } from "@/i18n/server";
import {
    categorySlugFromPathname,
    menuCategoryPath,
} from "@/lib/menu-paths";

import {
    DEFAULT_CATEGORY_SLUG,
    type PriceRange,
} from "./types";

const MENU_FILTERS_URL_EVENT = "menu-filters-url-change";

function parseCategory(
    value: string | null,
    validSlugs: string[],
): string {
    if (value && validSlugs.includes(value)) return value;
    return DEFAULT_CATEGORY_SLUG;
}

function clampPrice(value: number, min: number, max: number): number {
    return Math.min(max, Math.max(min, value));
}

function parsePriceRange(
    searchParams: URLSearchParams,
    minPrice: number,
    maxPrice: number,
): PriceRange {
    const minParam = searchParams.get("priceMin");
    const maxParam = searchParams.get("priceMax");

    if (minParam !== null || maxParam !== null) {
        const min = clampPrice(
            Number.parseInt(minParam ?? String(minPrice), 10) || minPrice,
            minPrice,
            maxPrice,
        );
        const max = clampPrice(
            Number.parseInt(maxParam ?? String(maxPrice), 10) || maxPrice,
            minPrice,
            maxPrice,
        );
        return min <= max ? [min, max] : [max, min];
    }

    const legacyPrice = searchParams.get("price");
    if (legacyPrice === "lt3") return [minPrice, Math.min(3000, maxPrice)];
    if (legacyPrice === "lt5") return [minPrice, Math.min(5000, maxPrice)];
    if (legacyPrice === "gt5") return [Math.min(5000, maxPrice), maxPrice];

    return [minPrice, maxPrice];
}

function isDefaultPriceRange(
    range: PriceRange,
    minPrice: number,
    maxPrice: number,
): boolean {
    return range[0] === minPrice && range[1] === maxPrice;
}

function readWindowSearchParams(): URLSearchParams {
    if (typeof window === "undefined") {
        return new URLSearchParams();
    }
    return new URLSearchParams(window.location.search);
}

/** next-intl pathname is locale-stripped; restore prefix for history.pushState. */
function withLocalePrefix(pathWithoutLocale: string): string {
    if (typeof window === "undefined") return pathWithoutLocale;
    const match = window.location.pathname.match(/^\/(en|ru)(?=\/|$)/);
    if (!match) return pathWithoutLocale;
    return pathWithoutLocale === "/"
        ? match[0]
        : `${match[0]}${pathWithoutLocale}`;
}

function stripLocalePrefix(pathname: string): string {
    return pathname.replace(/^\/(en|ru)(?=\/|$)/, "") || "/";
}

function applyMenuFilterParams(pathname: string, params: URLSearchParams) {
    const qs = params.toString();
    const localized = withLocalePrefix(pathname);
    const href = qs ? `${localized}?${qs}` : localized;
    window.history.pushState(window.history.state, "", href);
    window.dispatchEvent(new Event(MENU_FILTERS_URL_EVENT));
}

type PriceFilterable = { price: number };
type CategoryFilterable = { category?: { slug: string } | null };

type UseMenuFiltersOptions = {
    validCategorySlugs?: string[];
    minPrice: number;
    maxPrice: number;
};

export function useMenuFilters(options: UseMenuFiltersOptions) {
    const routerSearchParams = useSearchParams();
    const pathname = usePathname();

    const validCategorySlugs = useMemo(
        () => options.validCategorySlugs ?? [DEFAULT_CATEGORY_SLUG],
        [options.validCategorySlugs],
    );

    const minPrice = options.minPrice;
    const maxPrice = options.maxPrice;

    const routerParamsString = routerSearchParams.toString();

    const [localParamsString, setLocalParamsString] = useState(routerParamsString);
    const [localPathname, setLocalPathname] = useState(pathname);
    const [prevRouterParamsString, setPrevRouterParamsString] =
        useState(routerParamsString);
    const [prevPathname, setPrevPathname] = useState(pathname);

    if (prevRouterParamsString !== routerParamsString) {
        setPrevRouterParamsString(routerParamsString);
        setLocalParamsString(routerParamsString);
    }
    if (prevPathname !== pathname) {
        setPrevPathname(pathname);
        setLocalPathname(pathname);
    }

    const localParams = useMemo(
        () => new URLSearchParams(localParamsString),
        [localParamsString],
    );

    useEffect(() => {
        const syncFromWindow = () => {
            setLocalParamsString(readWindowSearchParams().toString());
            setLocalPathname(stripLocalePrefix(window.location.pathname));
        };

        window.addEventListener("popstate", syncFromWindow);
        window.addEventListener(MENU_FILTERS_URL_EVENT, syncFromWindow);
        return () => {
            window.removeEventListener("popstate", syncFromWindow);
            window.removeEventListener(MENU_FILTERS_URL_EVENT, syncFromWindow);
        };
    }, []);

    const pathCategory = categorySlugFromPathname(localPathname);
    const categorySlug = parseCategory(
        pathCategory ?? localParams.get("category"),
        validCategorySlugs,
    );
    const priceRange = parsePriceRange(localParams, minPrice, maxPrice);

    const pushParams = useCallback(
        (next: {
            category?: string;
            priceRange?: PriceRange;
        }) => {
            const params = new URLSearchParams(localParams.toString());

            const newCategory = next.category ?? categorySlug;
            const newRange = next.priceRange ?? priceRange;
            const nextPath = menuCategoryPath(newCategory);

            params.delete("sort");
            params.delete("category");
            params.delete("price");

            if (isDefaultPriceRange(newRange, minPrice, maxPrice)) {
                params.delete("priceMin");
                params.delete("priceMax");
            } else {
                params.set("priceMin", String(newRange[0]));
                params.set("priceMax", String(newRange[1]));
            }

            const nextParams = new URLSearchParams(params.toString());
            applyMenuFilterParams(nextPath, nextParams);
            setLocalParamsString(nextParams.toString());
            setLocalPathname(nextPath);
        },
        [
            categorySlug,
            localParams,
            maxPrice,
            minPrice,
            priceRange,
        ],
    );

    const setCategorySlug = useCallback(
        (value: string) => pushParams({ category: value }),
        [pushParams],
    );

    const setPriceRange = useCallback(
        (value: PriceRange) => pushParams({ priceRange: value }),
        [pushParams],
    );

    const resetFilters = useCallback(() => {
        pushParams({ priceRange: [minPrice, maxPrice] });
    }, [maxPrice, minPrice, pushParams]);

    const hasActiveFilters = useMemo(
        () => !isDefaultPriceRange(priceRange, minPrice, maxPrice),
        [maxPrice, minPrice, priceRange],
    );

    const filterByCategory = useCallback(
        <T extends CategoryFilterable>(items: T[], slug: string): T[] => {
            if (slug === DEFAULT_CATEGORY_SLUG) return items;
            return items.filter((p) => p.category?.slug === slug);
        },
        [],
    );

    const filterByPriceRange = useCallback(
        <T extends PriceFilterable>(items: T[], range: PriceRange): T[] =>
            items.filter(
                (p) => p.price >= range[0] && p.price <= range[1],
            ),
        [],
    );

    return {
        categorySlug,
        priceRange,
        minPrice,
        maxPrice,
        setCategorySlug,
        setPriceRange,
        resetFilters,
        hasActiveFilters,
        filterByCategory,
        filterByPriceRange,
    };
}
