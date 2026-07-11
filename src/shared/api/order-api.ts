/**
 * Order API - typed wrappers for /api/order and /api/order-status.
 * All server communication goes through apiPost - never raw fetch in pages.
 */

import { ApiError, apiPost } from "./client";

// ─── Types ────────────────────────────────────────────────────────────────────

export type OrderItemPayload = {
    productId: number;
    name: string;
    /** Цена единицы с учётом модификаторов; сервер сверит её с пересчётом из БД. */
    price: number;
    quantity: number;
    /**
     * Канонический формат (Шаг 4): только id выбранных Modifier.
     * Сервер сам поднимет name/priceDelta из БД и сделает snapshot для OrderItem.selectedModifiers.
     */
    selectedModifierIds?: number[];
};

export type PlaceOrderRequest = {
    name: string;
    phone: string;
    address: string;
    comment: string;
    payment: "cash" | "card";
    /** Наличные: сумма, с которой готовить сдачу (֏). null - сдача не нужна. */
    changeFrom?: number | null;
    scheduledFor?: string | null;
    delivery: "delivery" | "pickup";
    items: OrderItemPayload[];
    totalPrice: number;
    /** Сумма товаров без доставки - сверка с сервером */
    subtotalBeforeDiscount?: number;
    /** Сумма скидки по промокоду - сверка с сервером */
    discountAmount?: number;
    /** Для доставки - id активной зоны (сверяется на сервере) */
    deliveryZoneId?: number;
    hp: string;
    promoCode?: string;
    locale?: "hy" | "ru" | "en";
};

export type PlaceOrderResponse = {
    ok: true;
    order: { id: number; accessToken: string };
    duplicate?: boolean;
};

export type OrderStatus =
    | "PENDING_APPROVAL"
    | "NEW"
    | "COOKING"
    | "DELIVERING"
    | "DONE"
    | "CANCELLED";

export type OrderStatusResponse = {
    id: number;
    status: OrderStatus;
    name: string;
    phone: string;
    delivery: "DELIVERY" | "PICKUP";
    payment: "CASH" | "CARD";
    /** Наличные: сумма, с которой готовить сдачу (֏). null - не нужна. */
    changeFrom?: number | null;
    scheduledFor?: string | null;
    totalPrice: number;
    createdAt: string;
    /** ISO-строка или null - задаётся кухней */
    estimatedDeliveryAt: string | null;
    address?: string | null;
    deliveryZoneName?: string | null;
    /** Стоимость доставки в заказе (минорные единицы) */
    deliveryPrice: number;
    items: {
        id: number;
        productId?: number | null;
        name: string;
        quantity: number;
        price: number;
        selectedModifiers?: unknown;
    }[];
};

const IDEM_POLL_INTERVAL_MS = 2_000;
const IDEM_MAX_ATTEMPTS = 20;

function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

// ─── API calls ─────────────────────────────────────────────────────────────────

export async function placeOrder(
    payload: PlaceOrderRequest,
    /** UUID попытки оформления - сервер дедуплицирует ретраи (double-tap, сеть). */
    idempotencyKey?: string,
): Promise<PlaceOrderResponse> {
    const headers = idempotencyKey
        ? { "Idempotency-Key": idempotencyKey }
        : undefined;

    for (let attempt = 0; attempt < IDEM_MAX_ATTEMPTS; attempt++) {
        try {
            return await apiPost<PlaceOrderRequest, PlaceOrderResponse>(
                "/api/order",
                payload,
                { headers },
            );
        } catch (error) {
            const isDuplicateInFlight =
                error instanceof ApiError &&
                error.status === 409 &&
                idempotencyKey &&
                attempt < IDEM_MAX_ATTEMPTS - 1;

            if (isDuplicateInFlight) {
                await sleep(IDEM_POLL_INTERVAL_MS);
                continue;
            }
            throw error;
        }
    }

    throw new ApiError(409, "Duplicate request");
}

export function fetchOrderStatus(id: number): Promise<OrderStatusResponse> {
    return apiPost<{ id: number }, OrderStatusResponse>("/api/order-status", {
        id,
    });
}
