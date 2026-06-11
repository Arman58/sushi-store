export type PriceRange = [number, number];

export const DEFAULT_CATEGORY_SLUG = "all";

export type MenuCategoryOption = {
    slug: string;
    name: string;
};

export type MenuPriceBounds = {
    minPrice: number;
    maxPrice: number;
};
