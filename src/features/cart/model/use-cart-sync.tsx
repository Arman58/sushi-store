"use client";

import { useSession } from "next-auth/react";
import { type ReactNode, useEffect, useRef } from "react";
import { useShallow } from "zustand/react/shallow";

import { useCartStore } from "./store";
import type { CartItem } from "./types";

/**
 * Хук для синхронизации локальной корзины с сервером при наличии авторизации.
 * - При монтировании (и наличии сессии) загружает серверную корзину и мержит с локальной.
 * - При изменении локальной корзины (debounced) отправляет её на сервер.
 */
export function useCartSync() {
    const { status } = useSession();
    const { items, appliedPromoCode, setItems, setAppliedPromoCode } = useCartStore(
        useShallow((s) => ({
            items: s.items,
            appliedPromoCode: s.appliedPromoCode,
            setItems: s.setItems,
            setAppliedPromoCode: s.setAppliedPromoCode,
        })),
    );
    const isInitialSyncDone = useRef(false);
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);

    // Initial sync
    useEffect(() => {
        if (status === "authenticated" && !isInitialSyncDone.current) {
            isInitialSyncDone.current = true;
            fetch("/api/cart/sync")
                .then((res) => {
                    if (res.ok) return res.json();
                    throw new Error("Failed to fetch cart");
                })
                .then((data: { items: CartItem[]; appliedPromoCode: string | null }) => {
                    if (data.items && data.items.length > 0) {
                        setItems(data.items);
                        if (data.appliedPromoCode) {
                            setAppliedPromoCode(data.appliedPromoCode);
                        }
                    }
                })
                .catch((err) => console.error("[CartSync] Load failed:", err));
        }
    }, [status, setItems, setAppliedPromoCode]);

    // Save sync
    useEffect(() => {
        if (status === "authenticated" && isInitialSyncDone.current) {
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
            timeoutRef.current = setTimeout(() => {
                fetch("/api/cart/sync", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ items, appliedPromoCode }),
                }).catch((err) => console.error("[CartSync] Save failed:", err));
            }, 1000);
        }
        return () => {
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
        };
    }, [status, items, appliedPromoCode]);
}

export function CartSyncProvider({ children }: { children: ReactNode }) {
    useCartSync();
    return <>{children}</>;
}
