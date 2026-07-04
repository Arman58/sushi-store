"use client";

import { Box, Chip } from "@mui/material";
import type { ChipProps } from "@mui/material/Chip";

import {
    ETA_PRESET_MINUTES,
    orderStatusChipColor,
} from "@/lib/order-status";

export async function readApiErrorMessage(
    res: Response,
    fallback: string,
): Promise<string> {
    const text = await res.text();
    if (!text.trim()) {
        return `${fallback} (HTTP ${res.status})`;
    }

    try {
        const json = JSON.parse(text) as { error?: unknown; message?: unknown };
        const detail =
            typeof json.error === "string"
                ? json.error
                : typeof json.message === "string"
                  ? json.message
                  : null;
        if (detail?.trim()) {
            return detail;
        }
    } catch {
        // ответ не JSON - покажем как есть
    }

    return text;
}

/** Ближайший пресет (15/30/45/60), если ETA задано недавно. */
export function inferEtaPresetMinutes(
    iso: string | null,
    nowMs = Date.now(),
): number | null {
    if (!iso) return null;
    const etaMs = new Date(iso).getTime();
    if (Number.isNaN(etaMs)) return null;

    const diffMin = Math.round((etaMs - nowMs) / 60_000);
    let best: number | null = null;
    let bestDelta = Infinity;

    for (const minutes of ETA_PRESET_MINUTES) {
        const delta = Math.abs(diffMin - minutes);
        if (delta <= 3 && delta < bestDelta) {
            best = minutes;
            bestDelta = delta;
        }
    }

    return best;
}

export type OrderItem = {
    id: number;
    productId?: number | null;
    name: string;
    price: number;
    quantity: number;
    selectedModifiers?: unknown;
};

export type OrderRowProps = {
    order: {
        id: number;
        createdAtFormatted: string;
        name: string;
        phone: string;
        deliveryLabel: string;
        paymentLabel: string;
        payment: string;
        statusLabel: string;
        status: string;
        address: string;
        subtotalBeforeDiscount: number;
        discountAmount: number;
        deliveryPrice: number;
        totalPrice: number;
        items: OrderItem[];
        comment?: string | null;
        changeFrom?: number | null;
        scheduledFor?: string | null;
        estimatedDeliveryAt?: string | null;
    };
    searchQuery: string;
    variant?: "table" | "card";
};

export function highlight(text: string, query: string) {
    if (!query.trim()) return text;

    const lowerText = text.toLowerCase();
    const lowerQuery = query.toLowerCase();
    const index = lowerText.indexOf(lowerQuery);

    if (index === -1) return text;

    const before = text.slice(0, index);
    const match = text.slice(index, index + query.length);
    const after = text.slice(index + query.length);

    return (
        <>
            {before}
            <Box
                component="span"
                sx={{
                    bgcolor: "rgba(249,115,22,0.18)",
                    borderRadius: 0.5,
                    px: 0.3,
                    fontWeight: 700,
                }}
            >
                {match}
            </Box>
            {after}
        </>
    );
}

function paymentChipProps(payment: string): Pick<ChipProps, "variant" | "color"> {
    if (payment === "CARD") {
        return { variant: "outlined", color: "primary" };
    }
    return { variant: "outlined", color: "default" };
}

export function OrderStatusChip({
    label,
    status,
}: {
    label: string;
    status: string;
}) {
    return (
        <Chip
            label={label}
            size="small"
            color={
                status === "NEW" ||
                status === "COOKING" ||
                status === "DELIVERING" ||
                status === "DONE" ||
                status === "CANCELLED"
                    ? orderStatusChipColor(status)
                    : "default"
            }
            sx={{ fontWeight: 600, fontSize: 12 }}
        />
    );
}

export function OrderPaymentChip({
    label,
    payment,
}: {
    label: string;
    payment: string;
}) {
    const chipProps = paymentChipProps(payment);
    return (
        <Chip
            label={label}
            size="small"
            variant={chipProps.variant}
            color={chipProps.color}
            sx={{ fontWeight: 500, fontSize: 12 }}
        />
    );
}
