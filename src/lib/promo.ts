import { type DiscountType, Prisma, type PromoCode } from "@prisma/client";

/** Единое правило: код без пробелов, верхний регистр для хранения и поиска. */
export function normalizePromoCode(raw: string): string {
    return raw.trim().replace(/\s+/g, "").toUpperCase();
}

export type PromoForEvaluation = Pick<
    PromoCode,
    | "discountType"
    | "discountValue"
    | "minOrderAmount"
    | "maxUsages"
    | "timesUsed"
    | "expiresAt"
    | "isActive"
    | "conditions"
    | "actions"
>;

export type PromoRejection =
    | { code: "notFound" }
    | { code: "inactive" }
    | { code: "expired" }
    | { code: "usedUp" }
    | { code: "belowMin"; minOrderAmount: number }
    | { code: "misconfigured" }
    | { code: "noDiscount" }
    | { code: "conditionsNotMet" };

export type PromoEvaluationContext = {
    cartSubtotal: number;
    grandTotalBeforeDiscount: number;
    deliveryAmount?: number;
    items?: Array<{ productId: number; quantity: number; price: number; categoryId?: number | null }>;
    now?: Date;
};

type PromoCondition = {
    type?: string;
    categoryId?: number;
};

type PromoAction = {
    type?: string;
    categoryId?: number;
    value?: number;
    discountType?: "PERCENTAGE" | "FIXED" | string;
};

function parseRules(json: Prisma.JsonValue): unknown[] {
    if (!json || typeof json !== "object") return [];
    if (Array.isArray(json)) return json;
    return [];
}

/**
 * Проверка условий (conditions). Если массив conditions пуст, то подходит всем.
 * Если задано несколько условий, они объединяются по логическому И (AND).
 */
function evaluateConditions(promo: PromoForEvaluation, ctx: PromoEvaluationContext): boolean {
    const conditions = parseRules(promo.conditions as Prisma.JsonValue);
    if (conditions.length === 0) return true;

    for (const raw of conditions) {
        if (!raw || typeof raw !== "object") continue;
        const cond = raw as PromoCondition;

        if (cond.type === "CATEGORY_INCLUDES") {
            const catId = cond.categoryId;
            if (!ctx.items) return false;
            const hasCat = ctx.items.some((i) => i.categoryId === catId);
            if (!hasCat) return false;
        }
    }

    return true;
}

export function getPromoRejectionCode(
    promo: PromoForEvaluation | null,
    opts: PromoEvaluationContext,
): PromoRejection | null {
    const now = opts.now ?? new Date();

    if (!promo) return { code: "notFound" };
    if (!promo.isActive) return { code: "inactive" };
    if (promo.expiresAt && promo.expiresAt.getTime() < now.getTime()) {
        return { code: "expired" };
    }
    if (promo.maxUsages != null && promo.timesUsed >= promo.maxUsages) {
        return { code: "usedUp" };
    }
    if (
        promo.minOrderAmount != null &&
        opts.cartSubtotal < promo.minOrderAmount
    ) {
        return { code: "belowMin", minOrderAmount: promo.minOrderAmount };
    }

    if (!evaluateConditions(promo, opts)) {
        return { code: "conditionsNotMet" };
    }

    const discountType = promo.discountType as DiscountType;
    if (
        discountType === "PERCENTAGE" &&
        (promo.discountValue < 0 || promo.discountValue > 100)
    ) {
        return { code: "misconfigured" };
    }
    if (discountType === "FIXED" && promo.discountValue < 0) {
        return { code: "misconfigured" };
    }
    if (
        computePromoDiscountAmount(
            promo,
            opts.cartSubtotal,
            opts.grandTotalBeforeDiscount,
            opts.deliveryAmount,
            opts.items
        ) <= 0
    ) {
        return { code: "noDiscount" };
    }

    return null;
}

/**
 * Human-readable RU fallback for server logs / Telegram.
 * Prefer `getPromoRejectionCode` + i18n on the client.
 * @deprecated Use getPromoRejectionCode + message catalogs.
 */
export function getPromoRejectionReason(
    promo: PromoForEvaluation | null,
    opts: PromoEvaluationContext,
): string | null {
    const code = getPromoRejectionCode(promo, opts);
    if (!code) return null;

    switch (code.code) {
        case "notFound": return "Промокод не найден";
        case "inactive": return "Промокод неактивен";
        case "expired": return "Срок действия промокода истёк";
        case "usedUp": return "Промокод больше нельзя применить";
        case "belowMin": return `Заказ от ${code.minOrderAmount.toLocaleString("ru-RU")} ֏ для этого промокода`;
        case "misconfigured": return "Промокод настроен некорректно";
        case "noDiscount": return "Промокод не даёт скидку для этой суммы";
        case "conditionsNotMet": return "Условия применения промокода не выполнены";
    }
}

export function computePromoDiscountAmount(
    promo: PromoForEvaluation,
    cartSubtotal: number,
    grandTotalBeforeDiscount: number,
    deliveryAmount: number = 0,
    items?: Array<{ productId: number; quantity: number; price: number; categoryId?: number | null }>
): number {
    if (cartSubtotal <= 0 || grandTotalBeforeDiscount <= 0) return 0;

    const actions = parseRules(promo.actions as Prisma.JsonValue);

    // Если actions заданы, они переопределяют классическое поведение discountType/discountValue
    if (actions.length > 0) {
        let totalDiscount = 0;
        for (const raw of actions) {
            if (!raw || typeof raw !== "object") continue;
            const action = raw as PromoAction;

            if (action.type === "FREE_DELIVERY") {
                totalDiscount += deliveryAmount;
            } else if (action.type === "DISCOUNT_ON_CATEGORY") {
                const catId = action.categoryId;
                const value = action.value || 0;
                const dtype = action.discountType;

                if (items) {
                    const categoryItems = items.filter((i) => i.categoryId === catId);
                    const categoryTotal = categoryItems.reduce(
                        (sum, item) => sum + item.price * item.quantity,
                        0,
                    );

                    if (dtype === "PERCENTAGE") {
                        totalDiscount += Math.floor((categoryTotal * value) / 100);
                    } else if (dtype === "FIXED") {
                        totalDiscount += Math.min(value, categoryTotal);
                    }
                }
            }
        }
        return Math.min(totalDiscount, grandTotalBeforeDiscount);
    }

    // Классическая логика, если actions пустые
    let raw: number;
    switch (promo.discountType) {
        case "PERCENTAGE":
            raw = Math.floor((cartSubtotal * promo.discountValue) / 100);
            break;
        case "FIXED":
            raw = promo.discountValue;
            break;
        default:
            return 0;
    }

    if (raw <= 0) return 0;
    return Math.min(raw, grandTotalBeforeDiscount);
}
