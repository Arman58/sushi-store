/**
 * Order API — typed wrappers for /api/order and /api/order-status.
 * All server communication goes through apiPost — never raw fetch in pages.
 */

import { apiPost } from "./client";

// ─── Types ────────────────────────────────────────────────────────────────────

export type OrderItemPayload = {
    productId: number;
    name: string;
    price: number;
    quantity: number;
};

export type PlaceOrderRequest = {
    name: string;
    phone: string;
    address: string;
    comment: string;
    payment: "cash" | "card";
    delivery: "delivery" | "pickup";
    items: OrderItemPayload[];
    totalPrice: number;
    hp: string;
};

export type PlaceOrderResponse = { ok: true; orderId: number };

export type OrderStatus = "NEW" | "PREPARING" | "DELIVERING" | "DONE" | "CANCELLED";

export type OrderStatusResponse = {
    id: number;
    status: OrderStatus;
    delivery: "DELIVERY" | "PICKUP";
    payment: "CASH" | "CARD";
    totalPrice: number;
    createdAt: string;
    address?: string | null;
    items: { id: number; name: string; quantity: number; price: number }[];
    etaMinutes: number;
};

// ─── API calls ─────────────────────────────────────────────────────────────────

export function placeOrder(payload: PlaceOrderRequest): Promise<PlaceOrderResponse> {
    return apiPost<PlaceOrderRequest, PlaceOrderResponse>("/api/order", payload);
}

export function fetchOrderStatus(
    id: number,
    phone: string,
): Promise<OrderStatusResponse> {
    return apiPost<{ id: number; phone: string }, OrderStatusResponse>(
        "/api/order-status",
        { id, phone },
    );
}
