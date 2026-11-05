/**
 * Типы акций промокода и правила их валидации.
 *
 * Движок скидок (lib/promo.ts) умеет больше, чем просто "процент/фикс": поле `actions`
 * (бесплатная доставка, скидка на категорию) и `conditions` (в корзине должен быть товар
 * категории). Раньше их можно было задать только прямо в БД. Здесь - единое описание для
 * схем API, админки и витрины.
 */

export type PromoDiscountType = "PERCENTAGE" | "FIXED";

export type PromoCondition = { type: "CATEGORY_INCLUDES"; categoryId: number };

export type PromoAction =
    | { type: "FREE_DELIVERY" }
    | {
          type: "DISCOUNT_ON_CATEGORY";
          categoryId: number;
          discountType: PromoDiscountType;
          value: number;
      };

/** standard - скидка на заказ; free_delivery - доставка бесплатно; category - скидка на категорию. */
export type PromoKind = "standard" | "free_delivery" | "category";

const isRecord = (v: unknown): v is Record<string, unknown> =>
    typeof v === "object" && v !== null && !Array.isArray(v);

const isPositiveInt = (v: unknown): v is number =>
    typeof v === "number" && Number.isInteger(v) && v > 0;

/** Разбирает JSON из БД, отбрасывая всё, что не соответствует известным действиям. */
export function parsePromoActions(raw: unknown): PromoAction[] {
    if (!Array.isArray(raw)) return [];
    const result: PromoAction[] = [];
    for (const item of raw) {
        if (!isRecord(item)) continue;
        if (item.type === "FREE_DELIVERY") {
            result.push({ type: "FREE_DELIVERY" });
        } else if (
            item.type === "DISCOUNT_ON_CATEGORY" &&
            isPositiveInt(item.categoryId) &&
            (item.discountType === "PERCENTAGE" || item.discountType === "FIXED") &&
            isPositiveInt(item.value)
        ) {
            result.push({
                type: "DISCOUNT_ON_CATEGORY",
                categoryId: item.categoryId,
                discountType: item.discountType,
                value: item.value,
            });
        }
    }
    return result;
}

export function parsePromoConditions(raw: unknown): PromoCondition[] {
    if (!Array.isArray(raw)) return [];
    const result: PromoCondition[] = [];
    for (const item of raw) {
        if (isRecord(item) && item.type === "CATEGORY_INCLUDES" && isPositiveInt(item.categoryId)) {
            result.push({ type: "CATEGORY_INCLUDES", categoryId: item.categoryId });
        }
    }
    return result;
}

export function getPromoKind(promo: { actions?: unknown }): PromoKind {
    const actions = parsePromoActions(promo.actions);
    if (actions.some((a) => a.type === "DISCOUNT_ON_CATEGORY")) return "category";
    if (actions.some((a) => a.type === "FREE_DELIVERY")) return "free_delivery";
    return "standard";
}

export function promoHasFreeDelivery(promo: { actions?: unknown }): boolean {
    return parsePromoActions(promo.actions).some((a) => a.type === "FREE_DELIVERY");
}

/** Все категории, на которые ссылается промокод (для проверки, что они существуют). */
export function promoCategoryIds(promo: { actions?: unknown; conditions?: unknown }): number[] {
    const ids = new Set<number>();
    for (const a of parsePromoActions(promo.actions)) {
        if (a.type === "DISCOUNT_ON_CATEGORY") ids.add(a.categoryId);
    }
    for (const c of parsePromoConditions(promo.conditions)) ids.add(c.categoryId);
    return [...ids];
}

/**
 * Проверка размера скидки. Возвращает код ошибки или null.
 *
 * Процент больше 100 раньше принимался админкой и API, а на чекауте такой промокод тихо
 * отклонялся как "настроен некорректно" - владелец не понимал почему.
 */
export function validatePromoDiscount(
    discountType: PromoDiscountType,
    value: number,
    options: { hasActions: boolean },
): "percentOutOfRange" | "valueRequired" | null {
    if (discountType === "PERCENTAGE" && value > 100) return "percentOutOfRange";
    // Для акций с actions (бесплатная доставка, скидка на категорию) размер задают сами
    // actions, а discountValue остаётся 0; для обычной скидки он обязан быть > 0.
    if (!options.hasActions && value < 1) return "valueRequired";
    return null;
}

export function validatePromoActionValues(actions: readonly PromoAction[]): "percentOutOfRange" | null {
    for (const action of actions) {
        if (
            action.type === "DISCOUNT_ON_CATEGORY" &&
            action.discountType === "PERCENTAGE" &&
            action.value > 100
        ) {
            return "percentOutOfRange";
        }
    }
    return null;
}

/**
 * Бесплатная доставка в корзине: стоимость доставки там ещё неизвестна (зона выбирается
 * на чекауте), поэтому скидка от неё равна 0 и промокод был бы отклонён как "не даёт
 * скидку". На этапе корзины такое отклонение пропускаем; чекаут проверит с реальной ценой.
 */
export function shouldDeferNoDiscountRejection(params: {
    deliveryKnown: boolean;
    rejectionCode: string;
    promo: { actions?: unknown } | null;
}): boolean {
    return (
        !params.deliveryKnown &&
        params.rejectionCode === "noDiscount" &&
        params.promo !== null &&
        promoHasFreeDelivery(params.promo)
    );
}
