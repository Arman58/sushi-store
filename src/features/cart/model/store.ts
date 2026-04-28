"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import type { AddToCartPayload, CartItem } from "./types";

/** Throttle rapid duplicate add-to-cart (double-clicks); 500 ms window; not persisted. */
let lastAddItemActionAt = 0;

type CartState = {
    // ── Data ────────────────────────────────────────────────────────
    items: CartItem[];
    hasPriceMismatch: boolean;
    lastAddedTitle: string | null;
    lastAddedAt: number | null;

    // ── UI state (not persisted) ────────────────────────────────────
    isCartOpen: boolean;
    /** Monotonic trigger; header toasts re-render when this changes. */
    addToast: number;
    openCart: () => void;
    closeCart: () => void;
    toggleCart: () => void;
    setAddToast: (id: number) => void;

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
            addToast: 0,
            setAddToast: (id) => set({ addToast: id }),
            openCart:   () => set({ isCartOpen: true }),
            closeCart:  () => set({ isCartOpen: false }),
            toggleCart: () => set((s) => ({ isCartOpen: !s.isCartOpen })),

            // ── Actions ─────────────────────────────────────────────
            addItem: (payload) => {
                const now = Date.now();
                if (now - lastAddItemActionAt < 500) return;
                lastAddItemActionAt = now;

                set((state) => {
                    const existing = state.items.find(
                        (item) => item.productId === payload.productId,
                    );

                    const toastId = Date.now();

                    if (existing) {
                        return {
                            items: state.items.map((item) =>
                                item.productId === payload.productId
                                    ? { ...item, quantity: item.quantity + 1 }
                                    : item,
                            ),
                            lastAddedTitle: payload.name,
                            lastAddedAt: toastId,
                            hasPriceMismatch: false,
                            addToast: toastId,
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
                        lastAddedAt: toastId,
                        addToast: toastId,
                    };
                });
            },

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
