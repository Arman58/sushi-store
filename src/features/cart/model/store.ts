"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import type { AddToCartPayload, CartItem } from "./types";

type CartState = {
    // ── Data ────────────────────────────────────────────────────────
    items: CartItem[];
    hasPriceMismatch: boolean;
    lastAddedTitle: string | null;
    lastAddedAt: number | null;

    // ── UI state (not persisted) ────────────────────────────────────
    isCartOpen: boolean;
    openCart: () => void;
    closeCart: () => void;
    toggleCart: () => void;

    // ── Actions ─────────────────────────────────────────────────────
    addItem: (payload: AddToCartPayload) => void;
    removeItem: (productId: number) => void;
    clear: () => void;
    setItemQuantity: (productId: number, quantity: number) => void;
    setItems: (items: CartItem[]) => void;
    markPriceMismatch: () => void;
    resetPriceMismatch: () => void;
};

export const useCartStore = create<CartState>()(
    persist(
        (set) => ({
            // ── Initial data state ──────────────────────────────────
            items: [],
            hasPriceMismatch: false,
            lastAddedTitle: null,
            lastAddedAt: null,

            // ── Initial UI state ────────────────────────────────────
            isCartOpen: false,
            openCart:   () => set({ isCartOpen: true }),
            closeCart:  () => set({ isCartOpen: false }),
            toggleCart: () => set((s) => ({ isCartOpen: !s.isCartOpen })),

            // ── Actions ─────────────────────────────────────────────
            addItem: (payload) =>
                set((state) => {
                    const existing = state.items.find(
                        (item) => item.productId === payload.productId,
                    );

                    if (existing) {
                        return {
                            items: state.items.map((item) =>
                                item.productId === payload.productId
                                    ? { ...item, quantity: item.quantity + 1 }
                                    : item,
                            ),
                            lastAddedTitle: payload.name,
                            lastAddedAt: Date.now(),
                            hasPriceMismatch: false,
                        };
                    }

                    return {
                        items: [
                            ...state.items,
                            {
                                productId: payload.productId,
                                name: payload.name,
                                price: payload.price,
                                image: payload.image,
                                quantity: 1,
                            } satisfies CartItem,
                        ],
                        hasPriceMismatch: false,
                        lastAddedTitle: payload.name,
                        lastAddedAt: Date.now(),
                    };
                }),

            removeItem: (productId) =>
                set((state) => ({
                    items: state.items.filter(
                        (item) => item.productId !== productId,
                    ),
                })),

            clear: () =>
                set({ items: [], hasPriceMismatch: false }),

            setItemQuantity: (productId, quantity) =>
                set((state) => {
                    if (quantity <= 0) {
                        return {
                            items: state.items.filter(
                                (item) => item.productId !== productId,
                            ),
                        };
                    }
                    return {
                        items: state.items.map((item) =>
                            item.productId === productId
                                ? { ...item, quantity }
                                : item,
                        ),
                    };
                }),

            setItems: (items) =>
                set({ items, hasPriceMismatch: false }),

            markPriceMismatch: () =>
                set({ hasPriceMismatch: true }),

            resetPriceMismatch: () =>
                set({ hasPriceMismatch: false }),
        }),
        {
            name: "sushi-cart-v2",
            storage: createJSONStorage(() => localStorage),
            version: 2,
            // Only persist data — never persist UI state like isCartOpen
            partialize: (state) => ({
                items: state.items,
                hasPriceMismatch: state.hasPriceMismatch,
            }),
        },
    ),
);
