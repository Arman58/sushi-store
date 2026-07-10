"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import { buildCartItemId } from "./line-id";
import type { AddToCartPayload, CartItem } from "./types";

/** Throttle rapid duplicate add on the same line (double-clicks); per-line, not global. */
const lastAddByLineAt = new Map<string, number>();
const ADD_LINE_THROTTLE_MS = 150;

function withQty(items: CartItem[]) {
    const qtyByProductId: Record<number, number> = {};
    let cartTotalCount = 0;
    let cartTotalPrice = 0;
    for (const item of items) {
        qtyByProductId[item.productId] =
            (qtyByProductId[item.productId] ?? 0) + item.quantity;
        cartTotalCount += item.quantity;
        cartTotalPrice += item.calculatedItemPrice * item.quantity;
    }
    return { items, qtyByProductId, cartTotalCount, cartTotalPrice };
}

/** Defer persist writes so localStorage I/O is not on the click stack (INP). */
function createDeferredLocalStorage(): Storage {
    let timer: ReturnType<typeof setTimeout> | null = null;
    let pendingKey: string | null = null;
    let pendingValue: string | null = null;

    const flush = () => {
        timer = null;
        if (pendingKey != null && pendingValue != null) {
            try {
                localStorage.setItem(pendingKey, pendingValue);
            } catch {
                /* private mode */
            }
            pendingKey = null;
            pendingValue = null;
        }
    };

    return {
        get length() {
            return localStorage.length;
        },
        clear: () => localStorage.clear(),
        getItem: (key) => localStorage.getItem(key),
        key: (index) => localStorage.key(index),
        removeItem: (key) => {
            if (pendingKey === key) {
                pendingKey = null;
                pendingValue = null;
            }
            localStorage.removeItem(key);
        },
        setItem: (key, value) => {
            pendingKey = key;
            pendingValue = value;
            if (timer != null) clearTimeout(timer);
            timer = setTimeout(flush, 0);
        },
    };
}

type CartState = {
    items: CartItem[];
    /** O(1) quantity lookup for product cards (derived, not persisted). */
    qtyByProductId: Record<number, number>;
    /** Precomputed totals so header/nav/menu don't reduce(items) on every add. */
    cartTotalCount: number;
    cartTotalPrice: number;
    appliedPromoCode: string | null;
    hasPriceMismatch: boolean;
    lastAddedTitle: string | null;
    lastAddedAt: number | null;
    isCartOpen: boolean;
    isPlacingOrder: boolean;
    setPlacingOrder: (value: boolean) => void;
    addToast: number;
    appToastMessage: string | null;
    /**
     * i18n-ключ (namespace "common") вместо готовой строки — стор не знает
     * локаль, переводит LayoutToastSnackbar. Приоритетнее appToastMessage.
     */
    appToastMessageKey: string | null;
    appToastSeverity: "success" | "error" | null;
    openCart: () => void;
    closeCart: () => void;
    toggleCart: () => void;
    setAddToast: (id: number) => void;
    showAppToast: (message: string, severity?: "success" | "error") => void;
    addItem: (payload: AddToCartPayload) => void;
    removeItem: (cartItemId: string) => void;
    clear: () => void;
    setItemQuantity: (cartItemId: string, quantity: number) => void;
    decrementFirstLineForProduct: (productId: number) => void;
    setItems: (items: CartItem[]) => void;
    markPriceMismatch: () => void;
    resetPriceMismatch: () => void;
    setAppliedPromoCode: (code: string | null) => void;
    syncPricesWithServer: (
        serverItems: Array<{
            cartItemId: string;
            serverUnitPrice?: number;
            serverBasePrice?: number;
            serverModifiers?: Array<{
                id: number;
                name: string;
                priceDelta: number;
            }>;
        }>,
    ) => void;
};

export const useCartStore = create<CartState>()(
    persist(
        (set) => ({
            items: [],
            qtyByProductId: {},
            cartTotalCount: 0,
            cartTotalPrice: 0,
            appliedPromoCode: null,
            hasPriceMismatch: false,
            lastAddedTitle: null,
            lastAddedAt: null,
            isCartOpen: false,
            isPlacingOrder: false,
            setPlacingOrder: (value) => set({ isPlacingOrder: value }),
            addToast: 0,
            appToastMessage: null,
            appToastMessageKey: null,
            appToastSeverity: null,
            setAddToast: (id) =>
                set(
                    id === 0
                        ? {
                              addToast: 0,
                              appToastMessage: null,
                              appToastMessageKey: null,
                              appToastSeverity: null,
                          }
                        : { addToast: id },
                ),
            showAppToast: (message, severity = "success") =>
                set({
                    appToastMessage: message,
                    appToastMessageKey: null,
                    appToastSeverity: severity,
                    addToast: Date.now(),
                }),
            openCart: () => set({ isCartOpen: true }),
            closeCart: () => set({ isCartOpen: false }),
            toggleCart: () => set((s) => ({ isCartOpen: !s.isCartOpen })),

            addItem: (payload) => {
                const cartItemId = buildCartItemId(
                    payload.productId,
                    payload.selectedModifiers,
                );

                const now = Date.now();
                const lastAt = lastAddByLineAt.get(cartItemId) ?? 0;
                if (now - lastAt < ADD_LINE_THROTTLE_MS) return;
                lastAddByLineAt.set(cartItemId, now);

                set((state) => {
                    const existing = state.items.find(
                        (item) => item.cartItemId === cartItemId,
                    );
                    const toastId = Date.now();

                    if (existing) {
                        const items = state.items.map((item) =>
                            item.cartItemId === cartItemId
                                ? { ...item, quantity: item.quantity + 1 }
                                : item,
                        );
                        return {
                            ...withQty(items),
                            lastAddedTitle: payload.name,
                            lastAddedAt: toastId,
                            hasPriceMismatch: false,
                            addToast: toastId,
                            appToastMessage: null,
                            appToastMessageKey: null,
                            appToastSeverity: null,
                        };
                    }

                    const items = [
                        ...state.items,
                        {
                            cartItemId,
                            productId: payload.productId,
                            name: payload.name,
                            basePrice: payload.basePrice,
                            calculatedItemPrice: payload.calculatedItemPrice,
                            selectedModifiers: payload.selectedModifiers,
                            quantity: 1,
                            image: payload.image,
                        } satisfies CartItem,
                    ];

                    return {
                        ...withQty(items),
                        hasPriceMismatch: false,
                        lastAddedTitle: payload.name,
                        lastAddedAt: toastId,
                        addToast: toastId,
                        appToastMessage: null,
                        appToastMessageKey: null,
                        appToastSeverity: null,
                    };
                });
            },

            removeItem: (cartItemId) =>
                set((state) =>
                    withQty(
                        state.items.filter(
                            (item) => item.cartItemId !== cartItemId,
                        ),
                    ),
                ),

            clear: () =>
                set({
                    items: [],
                    qtyByProductId: {},
                    cartTotalCount: 0,
                    cartTotalPrice: 0,
                    appliedPromoCode: null,
                    hasPriceMismatch: false,
                }),

            setItemQuantity: (cartItemId, quantity) =>
                set((state) => {
                    const existing = state.items.find(
                        (item) => item.cartItemId === cartItemId,
                    );

                    if (quantity <= 0) {
                        lastAddByLineAt.delete(cartItemId);
                        return withQty(
                            state.items.filter(
                                (item) => item.cartItemId !== cartItemId,
                            ),
                        );
                    }

                    const isIncrease =
                        existing != null && quantity > existing.quantity;
                    const toastId = isIncrease ? Date.now() : state.addToast;
                    const items = state.items.map((item) =>
                        item.cartItemId === cartItemId
                            ? { ...item, quantity }
                            : item,
                    );

                    return {
                        ...withQty(items),
                        ...(isIncrease && existing
                            ? {
                                  lastAddedTitle: existing.name,
                                  lastAddedAt: toastId,
                                  addToast: toastId,
                                  appToastMessage: null,
                                  appToastMessageKey: null,
                                  appToastSeverity: null,
                              }
                            : {}),
                    };
                }),

            decrementFirstLineForProduct: (productId) =>
                set((state) => {
                    // Несколько вариантов товара (разные модификаторы):
                    // с карточки не видно, какую строку уменьшаем, - открываем
                    // корзину, пусть пользователь выберет (паттерн Uber Eats).
                    const linesForProduct = state.items.filter(
                        (i) => i.productId === productId,
                    );
                    if (linesForProduct.length > 1) {
                        return { isCartOpen: true };
                    }
                    const idx = state.items.findIndex(
                        (i) => i.productId === productId,
                    );
                    if (idx === -1) return state;
                    const item = state.items[idx];
                    if (item.quantity > 1) {
                        const items = [...state.items];
                        items[idx] = { ...item, quantity: item.quantity - 1 };
                        return withQty(items);
                    }
                    return withQty(state.items.filter((_, i) => i !== idx));
                }),

            setItems: (items) =>
                set({ ...withQty(items), hasPriceMismatch: false }),

            markPriceMismatch: () => set({ hasPriceMismatch: true }),
            resetPriceMismatch: () => set({ hasPriceMismatch: false }),
            setAppliedPromoCode: (code) => set({ appliedPromoCode: code }),

            syncPricesWithServer: (serverItems) =>
                set((state) => {
                    let updated = false;
                    const newItems = state.items.map((item) => {
                        const serverMatch = serverItems.find(
                            (s) => s.cartItemId === item.cartItemId,
                        );
                        if (
                            serverMatch?.serverUnitPrice != null &&
                            serverMatch.serverUnitPrice !==
                                item.calculatedItemPrice
                        ) {
                            updated = true;
                            // Актуальные дельты модификаторов из БД: локальные
                            // могли устареть (сменилась цена опции).
                            const selectedModifiers = serverMatch.serverModifiers
                                ? item.selectedModifiers.map((m) => {
                                      const fresh =
                                          serverMatch.serverModifiers?.find(
                                              (sm) => sm.id === m.id,
                                          );
                                      return fresh
                                          ? {
                                                ...m,
                                                name: fresh.name || m.name,
                                                priceDelta: fresh.priceDelta,
                                            }
                                          : m;
                                  })
                                : item.selectedModifiers;
                            // basePrice берём с сервера; вычитание локальных
                            // дельт - только fallback для старого ответа API.
                            const basePrice =
                                serverMatch.serverBasePrice ??
                                serverMatch.serverUnitPrice -
                                    selectedModifiers.reduce(
                                        (sum, m) => sum + m.priceDelta,
                                        0,
                                    );
                            return {
                                ...item,
                                calculatedItemPrice: serverMatch.serverUnitPrice,
                                basePrice,
                                selectedModifiers,
                            };
                        }
                        return item;
                    });

                    if (!updated) return state;

                    return {
                        ...withQty(newItems),
                        hasPriceMismatch: false,
                        addToast: Date.now(),
                        appToastMessage: null,
                        appToastMessageKey: "toast.pricesUpdated",
                        appToastSeverity: "success" as const,
                    };
                }),
        }),
        {
            name: "sushi-cart-v2",
            storage: createJSONStorage(() => createDeferredLocalStorage()),
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
            partialize: (state) => ({
                items: state.items,
                hasPriceMismatch: state.hasPriceMismatch,
                appliedPromoCode: state.appliedPromoCode,
            }),
            merge: (persisted, current) => {
                const p = (persisted ?? {}) as Partial<CartState>;
                const items = p.items ?? current.items;
                return {
                    ...current,
                    ...p,
                    ...withQty(items),
                };
            },
        },
    ),
);
