"use client";

import { useMutation } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { useEffect, useMemo, useRef, useState } from "react";

import { useCartStore } from "./store";
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

/** 422/409 на validate-cart - бизнес-ответ, не сбой транспорта. */
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

const VALIDATION_DEBOUNCE_MS = 650;

type ValidateResponse = {
    valid: boolean;
    items: Array<{
        cartItemId: string;
        ok: boolean;
        reason?: CartLineIssueReason;
        serverUnitPrice?: number;
    }>;
};

export function useCartLineValidation(items: CartItem[]) {
    const [cartLineIssues, setCartLineIssues] = useState<Record<string, CartLineIssue>>({});
    const [validationUnavailable, setValidationUnavailable] = useState(false);
    const markPriceMismatch = useCartStore((s) => s.markPriceMismatch);
    
    // We use a ref to only update state for the latest requested validation
    const cartValidateGenRef = useRef(0);

    const mutation = useMutation<ValidateResponse, Error, CartItem[]>({
        mutationFn: async (payloadItems) => {
            const res = await fetch("/api/validate-cart", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    items: payloadItems.map((item) => ({
                        cartItemId: item.cartItemId,
                        productId: item.productId,
                        price: item.calculatedItemPrice,
                        quantity: item.quantity,
                        selectedModifierIds: item.selectedModifiers.map((m) => m.id),
                    })),
                }),
            });

            if (!res.ok) {
                if (!isValidationBusinessError(res.status)) {
                    throw new Error("Unavailable");
                }
                // Even on 409, the server returns the { valid: false, items: [...] } payload
                return res.json() as Promise<ValidateResponse>;
            }

            return res.json() as Promise<ValidateResponse>;
        },
    });

    const mutate = mutation.mutate;

    useEffect(() => {
        if (items.length === 0) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setCartLineIssues({});
             
            setValidationUnavailable(false);
            return;
        }

        const gen = ++cartValidateGenRef.current;
        const timer = window.setTimeout(() => {
            mutate(items, {
                onSuccess: (data) => {
                    if (cartValidateGenRef.current !== gen) return;
                    
                    const next: Record<string, CartLineIssue> = {};
                    let hasPriceMismatch = false;
                    
                    for (const row of data.items) {
                        if (!row.ok && row.reason) {
                            next[row.cartItemId] = {
                                reason: row.reason,
                                serverUnitPrice: row.serverUnitPrice,
                            };
                            if (row.reason === "price_mismatch") {
                                hasPriceMismatch = true;
                            }
                        }
                    }
                    
                    setCartLineIssues(next);
                    setValidationUnavailable(false);
                    
                    if (hasPriceMismatch) {
                        markPriceMismatch();
                    }
                },
                onError: (e) => {
                    if (cartValidateGenRef.current !== gen) return;
                    if (!isAbortError(e)) {
                        setValidationUnavailable(true);
                    }
                }
            });
        }, VALIDATION_DEBOUNCE_MS);

        return () => {
            window.clearTimeout(timer);
        };
    }, [items, markPriceMismatch, mutate]);

    const hasCartLineProblems = useMemo(
        () => items.some((item) => Boolean(cartLineIssues[item.cartItemId])),
        [items, cartLineIssues],
    );

    const hasPriceMismatchIssues = useMemo(
        () => items.some((item) => cartLineIssues[item.cartItemId]?.reason === "price_mismatch"),
        [items, cartLineIssues],
    );

    const problematicCartItemIds = useMemo(
        () => items.filter((item) => Boolean(cartLineIssues[item.cartItemId])).map((item) => item.cartItemId),
        [items, cartLineIssues],
    );

    const validSubtotal = useMemo(
        () => items.reduce((sum, item) => {
            if (cartLineIssues[item.cartItemId]) return sum;
            return sum + item.calculatedItemPrice * item.quantity;
        }, 0),
        [items, cartLineIssues],
    );

    return {
        cartLineIssues,
        cartValidatePending: mutation.isPending,
        validationUnavailable,
        hasCartLineProblems,
        hasPriceMismatchIssues,
        problematicCartItemIds,
        validSubtotal,
        serverItems: mutation.data?.items ?? [],
    };
}
