"use client";

import { useSession } from "next-auth/react";
import { type ReactNode, useEffect, useRef } from "react";
import { useShallow } from "zustand/react/shallow";

import { type AppLocale, routing } from "@/i18n/routing";
import { showAppToast } from "@/shared/lib/show-app-toast";

import { useCartStore } from "./store";
import type { CartItem } from "./types";

function resolveClientLocale(): AppLocale {
    if (typeof window === "undefined") return routing.defaultLocale;
    const match = window.location.pathname.match(/^\/(hy|en|ru)(?=\/|$)/);
    return (match?.[1] as AppLocale | undefined) ?? routing.defaultLocale;
}

async function getCartSyncDroppedMessage(): Promise<string> {
    const locale = resolveClientLocale();
    const messages = (await import(`@/messages/${locale}.json`)).default as {
        cart: { sync_dropped: string };
    };
    return messages.cart.sync_dropped;
}

/**
 * Хук для синхронизации локальной корзины с сервером при наличии авторизации.
 * - При монтировании (и наличии сессии) загружает серверную корзину.
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
                })
                    .then(async (res) => {
                        if (!res.ok) return;
                        const data = (await res.json()) as {
                            droppedCount?: number;
                        };
                        if (
                            typeof data.droppedCount === "number" &&
                            data.droppedCount > 0
                        ) {
                            void getCartSyncDroppedMessage().then((message) => {
                                showAppToast(message, "warning");
                            });
                        }
                    })
                    .catch((err) => console.error("[CartSync] Save failed:", err));
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
