"use client";

import { useTranslations } from "next-intl";

import { useCartValidationContext } from "./cart-validation-provider";

export type CartLineIssueReason =
    | "inactive"
    | "not_found"
    | "price_mismatch"
    | "invalid_payload"
    | "rule_violation";

export type CartLineIssue = {
    reason: CartLineIssueReason;
    serverUnitPrice?: number;
};

export function cartLineIssueMessage(
    issue: CartLineIssue,
    t: (key: string, values?: Record<string, string | number>) => string,
): string {
    switch (issue.reason) {
        case "inactive":
        case "not_found":
            return t("unavailable");
        case "price_mismatch":
            return issue.serverUnitPrice != null
                ? t("priceChanged", {
                      price: issue.serverUnitPrice.toLocaleString(),
                  })
                : t("priceChangedGeneric");
        default:
            return t("modifiersChanged");
    }
}

export function useCartLineIssueMessage() {
    const t = useTranslations("cart.validation");
    return (issue: CartLineIssue) => cartLineIssueMessage(issue, t);
}

/**
 * Валидация строк корзины — читает единый контекст CartValidationProvider.
 * Аргумент `items` оставлен для совместимости вызовов, но не используется.
 */
export function useCartLineValidation(_items?: unknown) {
    return useCartValidationContext();
}
