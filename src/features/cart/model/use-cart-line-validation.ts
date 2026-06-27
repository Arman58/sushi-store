"use client";

import { useTranslations } from "next-intl";
import { useEffect, useMemo, useRef, useState } from "react";

import type { CartItem } from "./types";

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

function isAbortError(e: unknown): boolean {
    return (
        (e instanceof DOMException && e.name === "AbortError") ||
        (e instanceof Error && e.name === "AbortError")
    );
}

/** 422/409 на validate-cart — бизнес-ответ, не сбой транспорта. */
function isValidationBusinessError(status: number): boolean {
    return status === 422 || status === 409;
}

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
                ? t("priceChanged", { price: issue.serverUnitPrice.toLocaleString() })
                : t("priceChangedGeneric");
        default:
            return t("modifiersChanged");
    }
}

export function useCartLineIssueMessage() {
    const t = useTranslations("cart.validation");
    return (issue: CartLineIssue) => cartLineIssueMessage(issue, t);
}

/** Задержка фоновой проверки после optimistic-обновления корзины. */
const VALIDATION_DEBOUNCE_MS = 650;

export function useCartLineValidation(items: CartItem[]) {
    const [cartLineIssues, setCartLineIssues] = useState<
        Record<string, CartLineIssue>
    >({});
    const [cartValidatePending, setCartValidatePending] = useState(false);
    const [validationUnavailable, setValidationUnavailable] = useState(false);
    const cartValidateGenRef = useRef(0);

    useEffect(() => {
        if (items.length === 0) {
            setCartLineIssues({});
            setCartValidatePending(false);
            setValidationUnavailable(false);
            return;
        }

        const ac = new AbortController();
        const gen = ++cartValidateGenRef.current;

        const timer = window.setTimeout(() => {
            void (async () => {
                if (cartValidateGenRef.current !== gen) return;
                setCartValidatePending(true);
                try {
                    const res = await fetch("/api/validate-cart", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            items: items.map((item) => ({
                                cartItemId: item.cartItemId,
                                productId: item.productId,
                                price: item.calculatedItemPrice,
                                quantity: item.quantity,
                                selectedModifierIds: item.selectedModifiers.map(
                                    (m) => m.id,
                                ),
                            })),
                        }),
                        signal: ac.signal,
                    });
                    if (cartValidateGenRef.current !== gen) return;

                    if (!res.ok) {
                        if (!isValidationBusinessError(res.status)) {
                            setValidationUnavailable(true);
                        }
                        return;
                    }

                    const data = (await res.json()) as {
                        items: Array<{
                            cartItemId: string;
                            ok: boolean;
                            reason?: CartLineIssueReason;
                            serverUnitPrice?: number;
                        }>;
                    };
                    if (cartValidateGenRef.current !== gen) return;

                    const next: Record<string, CartLineIssue> = {};
                    for (const row of data.items) {
                        if (!row.ok && row.reason) {
                            next[row.cartItemId] = {
                                reason: row.reason,
                                serverUnitPrice: row.serverUnitPrice,
                            };
                        }
                    }
                    setCartLineIssues(next);
                    setValidationUnavailable(false);
                } catch (e) {
                    if (!isAbortError(e) && cartValidateGenRef.current === gen) {
                        setValidationUnavailable(true);
                    }
                } finally {
                    if (cartValidateGenRef.current === gen) {
                        setCartValidatePending(false);
                    }
                }
            })();
        }, VALIDATION_DEBOUNCE_MS);

        return () => {
            window.clearTimeout(timer);
            ac.abort();
        };
    }, [items]);

    const hasCartLineProblems = useMemo(
        () => items.some((item) => Boolean(cartLineIssues[item.cartItemId])),
        [items, cartLineIssues],
    );

    const hasPriceMismatchIssues = useMemo(
        () =>
            items.some(
                (item) =>
                    cartLineIssues[item.cartItemId]?.reason === "price_mismatch",
            ),
        [items, cartLineIssues],
    );

    const problematicCartItemIds = useMemo(
        () =>
            items
                .filter((item) => Boolean(cartLineIssues[item.cartItemId]))
                .map((item) => item.cartItemId),
        [items, cartLineIssues],
    );

    const validSubtotal = useMemo(
        () =>
            items.reduce((sum, item) => {
                if (cartLineIssues[item.cartItemId]) return sum;
                return sum + item.calculatedItemPrice * item.quantity;
            }, 0),
        [items, cartLineIssues],
    );

    return {
        cartLineIssues,
        cartValidatePending,
        validationUnavailable,
        hasCartLineProblems,
        hasPriceMismatchIssues,
        problematicCartItemIds,
        validSubtotal,
    };
}
