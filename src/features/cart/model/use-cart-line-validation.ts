"use client";

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

export function cartLineIssueMessage(issue: CartLineIssue): string {
    switch (issue.reason) {
        case "inactive":
        case "not_found":
            return "Товар больше недоступен. Удалите позицию из корзины.";
        case "price_mismatch":
            return issue.serverUnitPrice != null
                ? `Цена изменилась. Сейчас ${issue.serverUnitPrice.toLocaleString("ru-RU")} ֏ за единицу.`
                : "Цена изменилась. Удалите строку или пересоберите заказ.";
        default:
            return "Опции товара изменились. Удалите позицию и добавьте её заново.";
    }
}

export function useCartLineValidation(items: CartItem[]) {
    const [cartLineIssues, setCartLineIssues] = useState<
        Record<string, CartLineIssue>
    >({});
    const [cartValidatePending, setCartValidatePending] = useState(false);
    const cartValidateGenRef = useRef(0);

    useEffect(() => {
        if (items.length === 0) {
            setCartLineIssues({});
            setCartValidatePending(false);
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
                    if (!res.ok) return;
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
                } catch (e) {
                    if (!isAbortError(e) && cartValidateGenRef.current === gen) {
                        setCartLineIssues({});
                    }
                } finally {
                    if (cartValidateGenRef.current === gen) {
                        setCartValidatePending(false);
                    }
                }
            })();
        }, 350);

        return () => {
            window.clearTimeout(timer);
            ac.abort();
        };
    }, [items]);

    const hasCartLineProblems = useMemo(
        () => items.some((item) => Boolean(cartLineIssues[item.cartItemId])),
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
        hasCartLineProblems,
        validSubtotal,
    };
}
