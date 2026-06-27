import { getLocale } from "next-intl/server";

import type { StorefrontCategory } from "@/lib/i18n-utils";
import { fetchStorefrontCategories } from "@/widgets/category-pills/lib/fetch-storefront-categories";

import {
    CategoryPillsList,
    type CategoryPillsMode,
} from "./CategoryPillsList";

export type CategoryPillsProps = {
    categories?: StorefrontCategory[];
    activeSlug?: string;
    mode?: CategoryPillsMode;
};

export async function CategoryPills({
    categories: categoriesProp,
    activeSlug,
    mode = "link",
}: CategoryPillsProps) {
    const locale = await getLocale();
    const categories =
        categoriesProp ?? (await fetchStorefrontCategories(locale));

    if (categories.length === 0) {
        return null;
    }

    return (
        <CategoryPillsList
            categories={categories}
            activeSlug={activeSlug}
            mode={mode}
        />
    );
}
