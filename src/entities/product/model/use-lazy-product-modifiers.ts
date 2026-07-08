"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import { useCallback, useRef, useState } from "react";

import type { MenuModifierGroup } from "@/entities/product/model/modifiers";
import type { ConnectableProduct } from "@/entities/product/ui/connected-product-card";
import { showAppToast } from "@/shared/lib/show-app-toast";

/** Модификаторы догружаются по требованию и кэшируются в React Query. */
export function useLazyProductModifiers() {
    const locale = useLocale();
    const t = useTranslations("menu");
    const queryClient = useQueryClient();
    const loadingRef = useRef(false);
    const [modifierProduct, setModifierProduct] =
        useState<ConnectableProduct | null>(null);

    const openModifiers = useCallback(
        (product: ConnectableProduct) => {
            if (
                (product.modifierGroups?.length ?? 0) > 0 ||
                !product.hasModifiers
            ) {
                setModifierProduct(product);
                return;
            }

            if (loadingRef.current) return;
            loadingRef.current = true;

            void queryClient
                .fetchQuery({
                    queryKey: ["product-modifiers", product.id, locale],
                    staleTime: 5 * 60_000,
                    queryFn: async () => {
                        const res = await fetch(
                            `/api/menu/modifiers?productId=${product.id}&locale=${locale}`,
                        );
                        if (!res.ok) throw new Error("modifiers fetch failed");
                        return res.json() as Promise<{
                            modifierGroups: MenuModifierGroup[];
                        }>;
                    },
                })
                .then((data) => {
                    setModifierProduct({
                        ...product,
                        modifierGroups: data.modifierGroups,
                    });
                })
                .catch(() => {
                    showAppToast(t("modifiersLoadError"), "error");
                })
                .finally(() => {
                    loadingRef.current = false;
                });
        },
        [locale, queryClient, t],
    );

    const closeModifiers = useCallback(() => {
        setModifierProduct(null);
    }, []);

    return { modifierProduct, openModifiers, closeModifiers };
}
