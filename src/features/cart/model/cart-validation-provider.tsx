"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import {
    createContext,
    type ReactNode,
    useContext,
    useEffect,
    useMemo,
    useState,
} from "react";

import { useCartStore } from "./store";
import type { CartItem } from "./types";
import type { CartLineIssue, CartLineIssueReason } from "./use-cart-line-validation";

const VALIDATION_DEBOUNCE_MS = 650;
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

function buildPayloadKey(items: CartItem[]): string {
    if (items.length === 0) return "[]";
    const payload = items.map((item) => ({
        cartItemId: item.cartItemId,
        productId: item.productId,
        price: item.calculatedItemPrice,
        quantity: item.quantity,
        selectedModifierIds: item.selectedModifiers.map((m) => m.id),
    }));
    return JSON.stringify(payload);
}

function isValidationBusinessError(status: number): boolean {
    return status === 422 || status === 409;
}

export type CartValidationContextValue = {
    cartLineIssues: Record<string, CartLineIssue>;
    cartValidatePending: boolean;
    validationUnavailable: boolean;
    hasCartLineProblems: boolean;
    hasPriceMismatchIssues: boolean;
    problematicCartItemIds: string[];
    validSubtotal: number;
    serverItems: ValidateResponse["items"];
};

const CartValidationContext = createContext<CartValidationContextValue | null>(
    null,
);

export function CartValidationProvider({ children }: { children: ReactNode }) {
    const items = useCartStore((s) => s.items);
    const markPriceMismatch = useCartStore((s) => s.markPriceMismatch);
    const hasPriceMismatch = useCartStore((s) => s.hasPriceMismatch);

    const payloadKey = useMemo(() => buildPayloadKey(items), [items]);
    const [debouncedKey, setDebouncedKey] = useState(payloadKey);

    useEffect(() => {
        if (payloadKey === debouncedKey) return;
        const timer = window.setTimeout(() => {
            setDebouncedKey(payloadKey);
        }, VALIDATION_DEBOUNCE_MS);
        return () => window.clearTimeout(timer);
    }, [payloadKey, debouncedKey]);

    const query = useQuery<ValidateResponse, Error>({
        queryKey: ["validate-cart", debouncedKey],
        enabled: debouncedKey !== "[]",
        staleTime: VALIDATION_STALE_MS,
        retry: false,
        refetchOnWindowFocus: false,
        placeholderData: keepPreviousData,
        queryFn: async ({ signal }) => {
            const payload = JSON.parse(debouncedKey) as ValidatePayloadLine[];
            const res = await fetch("/api/validate-cart", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ items: payload }),
                signal,
            });

            if (!res.ok && !isValidationBusinessError(res.status)) {
                throw new Error("Unavailable");
            }
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
        if (hasPriceMismatchIssues && !hasPriceMismatch) {
            markPriceMismatch();
        }
    }, [hasPriceMismatchIssues, hasPriceMismatch, markPriceMismatch]);

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

    const value = useMemo<CartValidationContextValue>(
        () => ({
            cartLineIssues,
            cartValidatePending: items.length > 0 && query.isFetching,
            validationUnavailable: items.length > 0 && query.isError,
            hasCartLineProblems,
            hasPriceMismatchIssues,
            problematicCartItemIds,
            validSubtotal,
            serverItems: query.data?.items ?? [],
        }),
        [
            cartLineIssues,
            hasCartLineProblems,
            hasPriceMismatchIssues,
            items.length,
            problematicCartItemIds,
            query.data?.items,
            query.isError,
            query.isFetching,
            validSubtotal,
        ],
    );

    return (
        <CartValidationContext.Provider value={value}>
            {children}
        </CartValidationContext.Provider>
    );
}

export function useCartValidationContext(): CartValidationContextValue {
    const ctx = useContext(CartValidationContext);
    if (!ctx) {
        throw new Error(
            "useCartLineValidation must be used within CartValidationProvider",
        );
    }
    return ctx;
}
