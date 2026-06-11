"use client";

import { useSearchParams } from "next/navigation";
import { useCallback, useMemo } from "react";

import { usePathname, useRouter } from "@/i18n/server";

import {
    DEFAULT_CATEGORY_SLUG,
    type PriceRange,
} from "./types";

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

type PriceFilterable = { price: number };
type CategoryFilterable = { category?: { slug: string } | null };

type UseMenuFiltersOptions = {
    validCategorySlugs?: string[];
    minPrice: number;
    maxPrice: number;
};

export function useMenuFilters(options: UseMenuFiltersOptions) {
    const searchParams = useSearchParams();
    const pathname = usePathname();
    const router = useRouter();

    const validCategorySlugs = useMemo(
        () => options.validCategorySlugs ?? [DEFAULT_CATEGORY_SLUG],
        [options.validCategorySlugs],
    );

    const minPrice = options.minPrice;
    const maxPrice = options.maxPrice;

    const categorySlug = parseCategory(
        searchParams.get("category"),
        validCategorySlugs,
    );
    const priceRange = parsePriceRange(searchParams, minPrice, maxPrice);

    const pushParams = useCallback(
        (next: {
            category?: string;
            priceRange?: PriceRange;
        }) => {
            const params = new URLSearchParams(searchParams.toString());

            const newCategory = next.category ?? categorySlug;
            const newRange = next.priceRange ?? priceRange;

            params.delete("sort");

            if (newCategory === DEFAULT_CATEGORY_SLUG) params.delete("category");
            else params.set("category", newCategory);

            params.delete("price");

            if (isDefaultPriceRange(newRange, minPrice, maxPrice)) {
                params.delete("priceMin");
                params.delete("priceMax");
            } else {
                params.set("priceMin", String(newRange[0]));
                params.set("priceMax", String(newRange[1]));
            }

            const qs = params.toString();
            router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
        },
        [
            categorySlug,
            maxPrice,
            minPrice,
            pathname,
            priceRange,
            router,
            searchParams,
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
        const params = new URLSearchParams(searchParams.toString());
        params.delete("sort");
        params.delete("category");
        params.delete("price");
        params.delete("priceMin");
        params.delete("priceMax");
        const qs = params.toString();
        router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    }, [pathname, router, searchParams]);

    const hasActiveFilters = useMemo(
        () =>
            categorySlug !== DEFAULT_CATEGORY_SLUG ||
            !isDefaultPriceRange(priceRange, minPrice, maxPrice),
        [categorySlug, maxPrice, minPrice, priceRange],
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
