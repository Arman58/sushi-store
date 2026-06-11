"use client";

import ReplayIcon from "@mui/icons-material/Replay";
import ShoppingCartCheckoutIcon from "@mui/icons-material/ShoppingCartCheckout";
import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Snackbar from "@mui/material/Snackbar";
import Stack from "@mui/material/Stack";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { useCartStore } from "@/features/cart";
import type { CartModifierSnapshot } from "@/features/cart/model/types";
import { Link } from "@/i18n/server";

import type { ProfileOrderItem } from "./types";

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

type ReorderFeedback = {
    severity: "success" | "warning" | "error";
    message: string;
};

type Props = {
    orderId: number;
    items: ProfileOrderItem[];
};

export function ProfileOrderActions({ orderId, items }: Props) {
    const addItem = useCartStore((s) => s.addItem);
    const openCart = useCartStore((s) => s.openCart);
    const t = useTranslations("order");

    const [reorderLoading, setReorderLoading] = useState(false);
    const [feedback, setFeedback] = useState<ReorderFeedback | null>(null);

    const repeatable = items.filter(
        (i) => typeof i.productId === "number" && i.productId > 0,
    );

    const onRepeat = async () => {
        if (repeatable.length === 0 || reorderLoading) return;

        setReorderLoading(true);
        setFeedback(null);

        const lineMeta = repeatable.map((item, index) => ({
            item,
            cartItemId: `reorder-${String(orderId)}-${String(index)}`,
            mods: parseModifiersSnapshot(item.selectedModifiers),
        }));

        try {
            const res = await fetch("/api/validate-cart", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    items: lineMeta.map((line) => ({
                        cartItemId: line.cartItemId,
                        productId: line.item.productId as number,
                        price: line.item.price,
                        quantity: line.item.quantity,
                        selectedModifierIds: line.mods.map((m) => m.id),
                    })),
                }),
            });

            if (!res.ok) {
                setFeedback({
                    severity: "error",
                    message: t("reorder.failed"),
                });
                return;
            }

            const data = (await res.json()) as {
                items: Array<{ cartItemId: string; ok: boolean }>;
            };

            const okIds = new Set(
                data.items.filter((row) => row.ok).map((row) => row.cartItemId),
            );

            let addedCount = 0;

            for (const line of lineMeta) {
                if (!okIds.has(line.cartItemId)) continue;

                const calculatedItemPrice = line.item.price;
                const basePrice =
                    calculatedItemPrice -
                    line.mods.reduce((s, m) => s + m.priceDelta, 0);

                for (let q = 0; q < line.item.quantity; q++) {
                    addItem({
                        productId: line.item.productId as number,
                        name: line.item.name,
                        basePrice,
                        selectedModifiers: line.mods,
                        calculatedItemPrice,
                    });
                    addedCount += 1;
                }
            }

            if (addedCount === 0) {
                setFeedback({
                    severity: "error",
                    message: t("reorder.failed"),
                });
                return;
            }

            if (okIds.size < lineMeta.length) {
                setFeedback({
                    severity: "warning",
                    message: t("reorder.partial_success"),
                });
            } else {
                setFeedback({
                    severity: "success",
                    message: t("reorder.success"),
                });
            }

            openCart();
        } catch {
            setFeedback({
                severity: "error",
                message: t("reorder.failed"),
            });
        } finally {
            setReorderLoading(false);
        }
    };

    return (
        <>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
                <Button
                    size="small"
                    variant="contained"
                    color="primary"
                    onClick={() => void onRepeat()}
                    disabled={repeatable.length === 0 || reorderLoading}
                    startIcon={<ReplayIcon />}
                    sx={{
                        textTransform: "none",
                        fontWeight: 700,
                        boxShadow: "none",
                    }}
                >
                    {reorderLoading ? t("reorder.validating") : t("repeat")}
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
                    {t("details")}
                </Button>
            </Stack>

            <Snackbar
                open={feedback != null}
                autoHideDuration={6000}
                onClose={() => setFeedback(null)}
                anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
            >
                {feedback ? (
                    <Alert
                        onClose={() => setFeedback(null)}
                        severity={feedback.severity}
                        variant="filled"
                        sx={{ width: "100%" }}
                    >
                        {feedback.message}
                    </Alert>
                ) : undefined}
            </Snackbar>
        </>
    );
}
