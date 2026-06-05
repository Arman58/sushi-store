/**
 * Promo validation — POST /api/validate-promo
 */

import { apiPost } from "./client";

export type ValidatePromoRequest = {
    code: string;
    cartAmount: number;
    deliveryAmount?: number;
};

export type ValidatePromoResponse = {
    ok: true;
    discountAmount: number;
    promoCodeId: number;
};

export function validatePromo(body: ValidatePromoRequest): Promise<ValidatePromoResponse> {
    return apiPost<ValidatePromoRequest, ValidatePromoResponse>("/api/validate-promo", body);
}
