import type { DiscountType, PromoCode } from "@prisma/client";

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
>;

/**
 * Сумма позиций (без доставки) для проверки minOrderAmount и расчёта PERCENTAGE.
 * `grandTotalBeforeDiscount` = позиции + доставка, для FIXED и ограничения скидки сверху.
 */
export function getPromoRejectionReason(
    promo: PromoForEvaluation | null,
    opts: {
        /** Сумма товарных позиций (после сверки с БД) */
        cartSubtotal: number;
        grandTotalBeforeDiscount: number;
        now?: Date;
    },
): string | null {
    const now = opts.now ?? new Date();

    if (!promo) {
        return "Промокод не найден";
    }

    if (!promo.isActive) {
        return "Промокод неактивен";
    }

    if (promo.expiresAt && promo.expiresAt.getTime() < now.getTime()) {
        return "Срок действия промокода истёк";
    }

    if (promo.maxUsages != null && promo.timesUsed >= promo.maxUsages) {
        return "Промокод больше нельзя применить";
    }

    if (
        promo.minOrderAmount != null &&
        opts.cartSubtotal < promo.minOrderAmount
    ) {
        return `Заказ от ${promo.minOrderAmount.toLocaleString("ru-RU")} ֏ для этого промокода`;
    }

    const discountType = promo.discountType as DiscountType;
    if (
        discountType === "PERCENTAGE" &&
        (promo.discountValue < 0 || promo.discountValue > 100)
    ) {
        return "Промокод настроен некорректно";
    }

    if (discountType === "FIXED" && promo.discountValue < 0) {
        return "Промокод настроен некорректно";
    }

    if (
        computePromoDiscountAmount(
            promo,
            opts.cartSubtotal,
            opts.grandTotalBeforeDiscount,
        ) <= 0
    ) {
        return "Промокод не даёт скидку для этой суммы";
    }

    return null;
}

export function computePromoDiscountAmount(
    promo: PromoForEvaluation,
    cartSubtotal: number,
    grandTotalBeforeDiscount: number,
): number {
    if (cartSubtotal <= 0 || grandTotalBeforeDiscount <= 0) return 0;

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

    /** Не уводим итог в минус. */
    return Math.min(raw, grandTotalBeforeDiscount);
}
