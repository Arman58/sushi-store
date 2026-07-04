export type ProductBadge = "hit" | "new" | "spicy" | "discount";

export type ProductCardProps = {
    name: string;
    description?: string | null;
    categoryName?: string;
    composition?: string;
    price: number;
    originalPrice?: number | null;
    weight?: number | null;
    images?: unknown;
    mainImage?: string | null;
    badges?: ProductBadge[];
    /** SEO-страница товара; фото и название ведут на неё. */
    productHref?: string;
    onAddToCart: () => void;
    onOpenDetails?: () => void;
    quantity?: number;
    onIncrease?: () => void;
    onDecrease?: () => void;
    index?: number;
    /** Prefer preloading this card image - use once per viewport for LCP (e.g. first tile on home). */
    imagePriority?: boolean;
    /** Product ID – used for localStorage-based favorites. */
    productId?: number;
    /** Реальный средний рейтинг из отзывов (0 - отзывов нет). */
    ratingAvg?: number;
    /** Кол-во отзывов. */
    ratingCount?: number;
    /** Стоп-лист: false - «закончилось», добавление заблокировано. */
    isAvailable?: boolean;
    /** Достигнут максимум на заказ - «+» неактивен. */
    maxQtyReached?: boolean;
};

export type BadgeEntry = {
    key: string;
    label: string;
    bg: string;
    color: string;
};

export const BADGE_STYLE: Record<ProductBadge, { bg: string; color: string }> = {
    hit:      { bg: "#2D3436", color: "#FFFFFF" },
    new:      { bg: "#27AE60", color: "#FFFFFF" },
    spicy:    { bg: "#E67E22", color: "#FFFFFF" },
    discount: { bg: "#E74C3C", color: "#FFFFFF" },
};

export const STEPPER_SIZE = 40;

export const stepperButtonSx = {
    flexShrink: 0,
    p: 0,
    width: STEPPER_SIZE,
    height: STEPPER_SIZE,
    minWidth: STEPPER_SIZE,
    minHeight: STEPPER_SIZE,
    maxWidth: STEPPER_SIZE,
    maxHeight: STEPPER_SIZE,
    borderRadius: "50%",
} as const;
