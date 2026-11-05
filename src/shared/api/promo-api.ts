/**
 * Promo validation - POST /api/validate-promo
 */

import { apiPost } from "./client";

export type ValidatePromoRequest = {
    code: string;
    cartAmount: number;
    deliveryAmount?: number;
    /**
     * false - стоимость доставки ещё неизвестна (корзина). Тогда промокод "бесплатная доставка"
     * не отклоняется за нулевую скидку; чекаут проверяет строго (по умолчанию true).
     */
    deliveryKnown?: boolean;
    items?: Array<{ productId: number; quantity: number; price: number }>;
};

export type ValidatePromoResponse = {
    ok: true;
    discountAmount: number;
    promoCodeId: number;
};

export function validatePromo(body: ValidatePromoRequest): Promise<ValidatePromoResponse> {
    return apiPost<ValidatePromoRequest, ValidatePromoResponse>("/api/validate-promo", body);
}
