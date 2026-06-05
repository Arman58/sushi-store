"use client";

import ReplayIcon from "@mui/icons-material/Replay";
import ShoppingCartCheckoutIcon from "@mui/icons-material/ShoppingCartCheckout";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import Link from "next/link";

import { useCartStore } from "@/features/cart";
import type { CartModifierSnapshot } from "@/features/cart/model/types";

import type { ProfileOrderItem } from "./types";

/**
 * Преобразуем JSON-снимок модификаторов из OrderItem в форму,
 * с которой работает Zustand-корзина (id + name + priceDelta).
 */
function parseModifiersSnapshot(raw: unknown): CartModifierSnapshot[] {
    if (!Array.isArray(raw)) return [];
    const out: CartModifierSnapshot[] = [];
    for (const m of raw) {
        if (!m || typeof m !== "object") continue;
        const id = (m as { id?: unknown }).id;
        const name = (m as { name?: unknown }).name;
        const priceDelta = (m as { priceDelta?: unknown }).priceDelta;
        if (
            typeof id === "number" &&
            Number.isInteger(id) &&
            id > 0 &&
            typeof name === "string"
        ) {
            out.push({
                id,
                name,
                priceDelta: typeof priceDelta === "number" ? priceDelta : 0,
            });
        }
    }
    return out;
}

type Props = {
    orderId: number;
    items: ProfileOrderItem[];
};

export function ProfileOrderActions({ orderId, items }: Props) {
    const addItem = useCartStore((s) => s.addItem);
    const openCart = useCartStore((s) => s.openCart);

    // Если ни одной позиции с известным productId — повторить нечего
    const repeatable = items.filter((i) => typeof i.productId === "number" && i.productId > 0);

    const onRepeat = () => {
        for (const item of repeatable) {
            const mods = parseModifiersSnapshot(item.selectedModifiers);
            const calculatedItemPrice = item.price;
            const basePrice =
                calculatedItemPrice -
                mods.reduce((s, m) => s + m.priceDelta, 0);
            for (let i = 0; i < item.quantity; i++) {
                addItem({
                    productId: item.productId as number,
                    name: item.name,
                    basePrice,
                    selectedModifiers: mods,
                    calculatedItemPrice,
                });
            }
        }
        openCart();
    };

    return (
        <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
            <Button
                size="small"
                variant="contained"
                color="primary"
                onClick={onRepeat}
                disabled={repeatable.length === 0}
                startIcon={<ReplayIcon />}
                sx={{ textTransform: "none", fontWeight: 700, boxShadow: "none" }}
            >
                Повторить заказ
            </Button>
            <Button
                size="small"
                variant="outlined"
                color="primary"
                component={Link}
                href={`/order/${orderId}`}
                startIcon={<ShoppingCartCheckoutIcon />}
                sx={{ textTransform: "none", fontWeight: 700 }}
            >
                Подробнее
            </Button>
        </Stack>
    );
}
