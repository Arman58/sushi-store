"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { useEffect, useMemo, useState } from "react";

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
/** Пока корзина не менялась, повторные маунты хука не бьют по API. */
const VALIDATION_STALE_MS = 30_000;

type ValidateResponse = {
    valid: boolean;
    items: Array<{
        cartItemId: string;
        ok: boolean;
        reason?: CartLineIssueReason;
        serverUnitPrice?: number;
    }>;
};

type ValidatePayloadLine = {
    cartItemId: string;
    productId: number;
    price: number;
    quantity: number;
    selectedModifierIds: number[];
};

function buildPayload(items: CartItem[]): ValidatePayloadLine[] {
    return items.map((item) => ({
        cartItemId: item.cartItemId,
        productId: item.productId,
        price: item.calculatedItemPrice,
        quantity: item.quantity,
        selectedModifierIds: item.selectedModifiers.map((m) => m.id),
    }));
}

/**
 * Валидация строк корзины.
 *
 * Один общий React Query на все компоненты (drawer, страница корзины,
 * checkout, summary): ключ - сериализованное содержимое корзины, поэтому
 * одновременные вызовы хука из разных мест дают ОДИН сетевой запрос,
 * а не по запросу на компонент.
 */
export function useCartLineValidation(items: CartItem[]) {
    const markPriceMismatch = useCartStore((s) => s.markPriceMismatch);

    const payload = useMemo(() => buildPayload(items), [items]);
    const payloadKey = useMemo(() => JSON.stringify(payload), [payload]);

    // Debounce: быстрые +/- по количеству схлопываются в один запрос.
    const [debounced, setDebounced] = useState<{
        key: string;
        payload: ValidatePayloadLine[];
    }>(() => ({ key: payloadKey, payload }));

    useEffect(() => {
        if (payloadKey === debounced.key) return;
        const timer = window.setTimeout(() => {
            setDebounced({ key: payloadKey, payload });
        }, VALIDATION_DEBOUNCE_MS);
        return () => window.clearTimeout(timer);
    }, [payloadKey, payload, debounced.key]);

    const query = useQuery<ValidateResponse, Error>({
        queryKey: ["validate-cart", debounced.key],
        enabled: debounced.payload.length > 0,
        staleTime: VALIDATION_STALE_MS,
        retry: false,
        refetchOnWindowFocus: false,
        placeholderData: keepPreviousData,
        queryFn: async ({ signal }) => {
            const res = await fetch("/api/validate-cart", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ items: debounced.payload }),
                signal,
            });

            if (!res.ok && !isValidationBusinessError(res.status)) {
                throw new Error("Unavailable");
            }
            // Даже на 409 сервер возвращает { valid: false, items: [...] }.
            return res.json() as Promise<ValidateResponse>;
        },
    });

    const cartLineIssues = useMemo(() => {
        const next: Record<string, CartLineIssue> = {};
        if (items.length === 0 || !query.data) return next;
        for (const row of query.data.items) {
            if (!row.ok && row.reason) {
                next[row.cartItemId] = {
                    reason: row.reason,
                    serverUnitPrice: row.serverUnitPrice,
                };
            }
        }
        return next;
    }, [items.length, query.data]);

    const hasPriceMismatchIssues = useMemo(
        () =>
            items.some(
                (item) =>
                    cartLineIssues[item.cartItemId]?.reason === "price_mismatch",
            ),
        [items, cartLineIssues],
    );

    useEffect(() => {
        if (hasPriceMismatchIssues) {
            markPriceMismatch();
        }
    }, [hasPriceMismatchIssues, markPriceMismatch]);

    const hasCartLineProblems = useMemo(
        () => items.some((item) => Boolean(cartLineIssues[item.cartItemId])),
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
        cartValidatePending: items.length > 0 && query.isFetching,
        validationUnavailable: items.length > 0 && query.isError,
        hasCartLineProblems,
        hasPriceMismatchIssues,
        problematicCartItemIds,
        validSubtotal,
        serverItems: query.data?.items ?? [],
    };
}
