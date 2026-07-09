import type { InvalidCartPayloadReason } from "@/lib/backend-i18n";
import { getLocalizedField } from "@/lib/i18n-utils";
import { API_ERROR_CODES, type ApiErrorCode } from "@/shared/lib/api-error";

export type OrderLineModifierSnapshot = {
    id: number;
    name: string;
    priceDelta: number;
};

export type ProductForOrderPricing = {
    id: number;
    price: number;
    modifierGroups: Array<{
        id: number;
        translations: unknown;
        required: boolean;
        maxChoices: number;
        modifiers: Array<{ id: number; translations: unknown; priceDelta: number }>;
    }>;
};

/**
 * Семантика кодов:
 * - "invalid_payload" → 400. Подмена/некорректные данные: чужой модификатор,
 *   дубль в одной позиции, опции для товара без групп.
 * - "rule_violation"  → 422. Бизнес-правила групп: required без выбора,
 *   превышен maxChoices.
 */
export type OrderLinePriceError = {
    ok: false;
    code: "invalid_payload" | "rule_violation";
    apiCode: ApiErrorCode;
    params?: Record<string, string | number>;
    invalidReason?: InvalidCartPayloadReason;
};

export type OrderLinePriceOk = {
    ok: true;
    unitPrice: number;
    snapshot: OrderLineModifierSnapshot[];
};

/**
 * Проверяет выбор модификаторов по правилам групп и считает цену строки из БД (база + сумма priceDelta).
 */
export function resolveOrderLinePrice(
    product: ProductForOrderPricing,
    selectedModifierIds: number[],
    locale = "hy",
): OrderLinePriceOk | OrderLinePriceError {
    const seen = new Set<number>();
    for (const id of selectedModifierIds) {
        if (seen.has(id)) {
            return {
                ok: false,
                code: "invalid_payload",
                apiCode: API_ERROR_CODES.INVALID_CART_PAYLOAD,
                invalidReason: "duplicate_modifier",
            };
        }
        seen.add(id);
    }

    const idToModifier = new Map<
        number,
        { groupId: number; translations: unknown; priceDelta: number }
    >();

    for (const g of product.modifierGroups) {
        for (const m of g.modifiers) {
            idToModifier.set(m.id, {
                groupId: g.id,
                translations: m.translations,
                priceDelta: m.priceDelta,
            });
        }
    }

    for (const mid of selectedModifierIds) {
        if (!idToModifier.has(mid)) {
            return {
                ok: false,
                code: "invalid_payload",
                apiCode: API_ERROR_CODES.INVALID_CART_PAYLOAD,
                invalidReason: "foreign_modifier",
            };
        }
    }

    if (product.modifierGroups.length === 0 && selectedModifierIds.length > 0) {
        return {
            ok: false,
            code: "invalid_payload",
            apiCode: API_ERROR_CODES.INVALID_CART_PAYLOAD,
            invalidReason: "unexpected_modifiers",
        };
    }

    for (const g of product.modifierGroups) {
        const groupModIdSet = new Set(g.modifiers.map((m) => m.id));
        const picked = selectedModifierIds.filter((id) => groupModIdSet.has(id));
        const groupLabel = getLocalizedField(g.translations, locale, "name");

        if (g.required && picked.length === 0) {
            return {
                ok: false,
                code: "rule_violation",
                apiCode: API_ERROR_CODES.REQUIRED_MODIFIER_MISSING,
                params: { group: groupLabel },
            };
        }

        if (g.maxChoices > 0 && picked.length > g.maxChoices) {
            return {
                ok: false,
                code: "rule_violation",
                apiCode: API_ERROR_CODES.MODIFIER_LIMIT_EXCEEDED,
                params: { group: groupLabel },
            };
        }
    }

    const snapshot: OrderLineModifierSnapshot[] = [];
    let delta = 0;

    for (const g of product.modifierGroups) {
        for (const m of g.modifiers) {
            if (seen.has(m.id)) {
                snapshot.push({
                    id: m.id,
                    name: getLocalizedField(m.translations, locale, "name"),
                    priceDelta: m.priceDelta,
                });
                delta += m.priceDelta;
            }
        }
    }

    return {
        ok: true,
        unitPrice: product.price + delta,
        snapshot,
    };
}
