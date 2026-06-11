"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import { buildCartItemId } from "./line-id";
import type { AddToCartPayload, CartItem } from "./types";

/** Throttle rapid duplicate add-to-cart (double-clicks); 500 ms window; not persisted. */
let lastAddItemActionAt = 0;

type CartState = {
    // ── Data ────────────────────────────────────────────────────────
    items: CartItem[];
    /** Нормализованный промокод; скидка пересчитывается через /api/validate-promo при изменении корзины */
    appliedPromoCode: string | null;
    hasPriceMismatch: boolean;
    lastAddedTitle: string | null;
    lastAddedAt: number | null;

    // ── UI state (not persisted) ────────────────────────────────────
    isCartOpen: boolean;
    /** Защита от повторного сабмита заказа (не персистится). */
    isPlacingOrder: boolean;
    setPlacingOrder: (value: boolean) => void;
    /** Monotonic trigger; header toasts re-render when this changes. */
    addToast: number;
    /** Сообщение глобального тоста (авторизация, профиль и т.д.). */
    appToastMessage: string | null;
    appToastSeverity: "success" | "error" | null;
    openCart: () => void;
    closeCart: () => void;
    toggleCart: () => void;
    setAddToast: (id: number) => void;
    showAppToast: (message: string, severity?: "success" | "error") => void;

    // ── Actions ─────────────────────────────────────────────────────
    addItem: (payload: AddToCartPayload) => void;
    removeItem: (cartItemId: string) => void;
    clear: () => void;
    setItemQuantity: (cartItemId: string, quantity: number) => void;
    /** Уменьшает qty у первой строки с этим productId (для «−» на карточке при нескольких вариантах). */
    decrementFirstLineForProduct: (productId: number) => void;
    setItems: (items: CartItem[]) => void;
    markPriceMismatch: () => void;
    resetPriceMismatch: () => void;
    setAppliedPromoCode: (code: string | null) => void;
};

export const useCartStore = create<CartState>()(
    persist(
        (set) => ({
            // ── Initial data state ──────────────────────────────────
            items: [],
            appliedPromoCode: null,
            hasPriceMismatch: false,
            lastAddedTitle: null,
            lastAddedAt: null,

            // ── Initial UI state ────────────────────────────────────
            isCartOpen: false,
            isPlacingOrder: false,
            setPlacingOrder: (value) => set({ isPlacingOrder: value }),
            addToast: 0,
            appToastMessage: null,
            appToastSeverity: null,
            setAddToast: (id) =>
                set(
                    id === 0
                        ? {
                              addToast: 0,
                              appToastMessage: null,
                              appToastSeverity: null,
                          }
                        : { addToast: id },
                ),
            showAppToast: (message, severity = "success") =>
                set({
                    appToastMessage: message,
                    appToastSeverity: severity,
                    addToast: Date.now(),
                }),
            openCart: () => set({ isCartOpen: true }),
            closeCart: () => set({ isCartOpen: false }),
            toggleCart: () => set((s) => ({ isCartOpen: !s.isCartOpen })),

            // ── Actions ─────────────────────────────────────────────
            addItem: (payload) => {
                const now = Date.now();
                if (now - lastAddItemActionAt < 500) return;
                lastAddItemActionAt = now;

                const cartItemId = buildCartItemId(
                    payload.productId,
                    payload.selectedModifiers,
                );

                set((state) => {
                    const existing = state.items.find(
                        (item) => item.cartItemId === cartItemId,
                    );

                    const toastId = Date.now();

                    if (existing) {
                        return {
                            items: state.items.map((item) =>
                                item.cartItemId === cartItemId
                                    ? {
                                          ...item,
                                          quantity: item.quantity + 1,
                                      }
                                    : item,
                            ),
                            lastAddedTitle: payload.name,
                            lastAddedAt: toastId,
                            hasPriceMismatch: false,
                            addToast: toastId,
                            appToastMessage: null,
                            appToastSeverity: null,
                        };
                    }

                    return {
                        items: [
                            ...state.items,
                            {
                                cartItemId,
                                productId: payload.productId,
                                name: payload.name,
                                basePrice: payload.basePrice,
                                calculatedItemPrice:
                                    payload.calculatedItemPrice,
                                selectedModifiers: payload.selectedModifiers,
                                quantity: 1,
                                image: payload.image,
                            } satisfies CartItem,
                        ],
                        hasPriceMismatch: false,
                        lastAddedTitle: payload.name,
                        lastAddedAt: toastId,
                        addToast: toastId,
                        appToastMessage: null,
                        appToastSeverity: null,
                    };
                });
            },

            removeItem: (cartItemId) =>
                set((state) => ({
                    items: state.items.filter(
                        (item) => item.cartItemId !== cartItemId,
                    ),
                })),

            clear: () =>
                set({
                    items: [],
                    appliedPromoCode: null,
                    hasPriceMismatch: false,
                }),

            setItemQuantity: (cartItemId, quantity) =>
                set((state) => {
                    if (quantity <= 0) {
                        return {
                            items: state.items.filter(
                                (item) => item.cartItemId !== cartItemId,
                            ),
                        };
                    }
                    return {
                        items: state.items.map((item) =>
                            item.cartItemId === cartItemId
                                ? { ...item, quantity }
                                : item,
                        ),
                    };
                }),

            decrementFirstLineForProduct: (productId) =>
                set((state) => {
                    const idx = state.items.findIndex(
                        (i) => i.productId === productId,
                    );
                    if (idx === -1) return state;
                    const item = state.items[idx];
                    if (item.quantity > 1) {
                        const items = [...state.items];
                        items[idx] = {
                            ...item,
                            quantity: item.quantity - 1,
                        };
                        return { items };
                    }
                    return {
                        items: state.items.filter((_, i) => i !== idx),
                    };
                }),

            setItems: (items) => set({ items, hasPriceMismatch: false }),

            markPriceMismatch: () => set({ hasPriceMismatch: true }),

            resetPriceMismatch: () => set({ hasPriceMismatch: false }),

            setAppliedPromoCode: (code) => set({ appliedPromoCode: code }),
        }),
        {
            name: "sushi-cart-v2",
            storage: createJSONStorage(() => localStorage),
            version: 5,
            migrate: (persistedState, fromVersion) => {
                const state = persistedState as {
                    items?: unknown[];
                    hasPriceMismatch?: boolean;
                    appliedPromoCode?: string | null;
                };
                if (fromVersion < 3) {
                    state.appliedPromoCode ??= null;
                }
                if (fromVersion < 4) {
                    type LegacyItem = {
                        productId: number;
                        name: string;
                        price?: number;
                        calculatedPrice?: number;
                        quantity: number;
                        image?: string | null;
                        selectedModifiers?: CartItem["selectedModifiers"];
                        lineId?: string;
                    };
                    state.items = (state.items ?? []).map((raw) => {
                        const item = raw as LegacyItem;
                        const mods = item.selectedModifiers ?? [];
                        const calculatedPrice =
                            item.calculatedPrice ?? item.price ?? 0;
                        const lineId =
                            item.lineId ??
                            (() => {
                                const ids = [...mods.map((m) => m.id)].sort(
                                    (a, b) => a - b,
                                );
                                return ids.length === 0
                                    ? `${item.productId}`
                                    : `${item.productId}:${ids.join(",")}`;
                            })();
                        return {
                            lineId,
                            productId: item.productId,
                            name: item.name,
                            quantity: item.quantity,
                            selectedModifiers: mods,
                            calculatedPrice,
                            image: item.image,
                        };
                    });
                }
                if (fromVersion < 5) {
                    type V4Like = {
                        lineId?: string;
                        cartItemId?: string;
                        productId: number;
                        name: string;
                        quantity: number;
                        selectedModifiers?: CartItem["selectedModifiers"];
                        calculatedPrice?: number;
                        calculatedItemPrice?: number;
                        basePrice?: number;
                        price?: number;
                        image?: string | null;
                    };
                    state.items = (state.items ?? []).map((raw) => {
                        const item = raw as V4Like;
                        const mods = item.selectedModifiers ?? [];
                        const calculatedItemPrice =
                            item.calculatedItemPrice ??
                            item.calculatedPrice ??
                            item.price ??
                            0;
                        const modSum = mods.reduce(
                            (s, m) => s + m.priceDelta,
                            0,
                        );
                        const basePrice =
                            item.basePrice ?? calculatedItemPrice - modSum;
                        const cartItemId = buildCartItemId(
                            item.productId,
                            mods,
                        );
                        return {
                            cartItemId,
                            productId: item.productId,
                            name: item.name,
                            basePrice,
                            quantity: item.quantity,
                            selectedModifiers: mods,
                            calculatedItemPrice,
                            image: item.image,
                        } satisfies CartItem;
                    });
                }
                return state;
            },
            // Only persist data - never persist UI state like isCartOpen
            partialize: (state) => ({
                items: state.items,
                hasPriceMismatch: state.hasPriceMismatch,
                appliedPromoCode: state.appliedPromoCode,
            }),
        },
    ),
);
