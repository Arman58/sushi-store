import { NextResponse } from "next/server";

import {
    updateOrderEstimatedDeliveryAt,
    UpdateOrderEtaError,
} from "@/lib/order-service";
import { verifyAdmin } from "@/lib/verify-admin";

import {
    adminOrderPatchSchema,
    firstZodMessage,
} from "./_schema";

function extractOrderId(params: { id?: string }, request: Request): number {
    const direct = Number(params?.id);
    if (!Number.isNaN(direct) && direct > 0) return direct;

    try {
        const segments = new URL(request.url).pathname.split("/");
        const orderIndex = segments.findIndex((seg) => seg === "orders");
        const maybeId = segments[orderIndex + 1];
        const parsed = Number(maybeId);
        if (!Number.isNaN(parsed) && parsed > 0) return parsed;
    } catch {
        // ignore
    }

    return NaN;
}

function resolveEstimatedDeliveryAt(payload: {
    etaMinutes?: number;
    estimatedDeliveryAt?: string;
}): Date | null {
    if (payload.etaMinutes != null) {
        return new Date(Date.now() + payload.etaMinutes * 60 * 1000);
    }

    if (payload.estimatedDeliveryAt != null) {
        return new Date(payload.estimatedDeliveryAt);
    }

    return null;
}

export async function PATCH(
    request: Request,
    context: { params: Promise<{ id: string }> },
) {
    const auth = await verifyAdmin(request);
    if (!auth.ok) {
        return auth.response;
    }

    const params = await context.params;
    const orderId = extractOrderId(params, request);
    if (Number.isNaN(orderId) || orderId <= 0) {
        return NextResponse.json({ error: "Invalid order id" }, { status: 400 });
    }

    let body: unknown;
    try {
        body = await request.json();
    } catch {
        return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const parsed = adminOrderPatchSchema.safeParse(body);
    if (!parsed.success) {
        return NextResponse.json(
            { error: firstZodMessage(parsed.error) },
            { status: 400 },
        );
    }

    const estimatedDeliveryAt = resolveEstimatedDeliveryAt(parsed.data);
    if (!estimatedDeliveryAt || Number.isNaN(estimatedDeliveryAt.getTime())) {
        return NextResponse.json(
            { error: "Некорректное значение estimatedDeliveryAt" },
            { status: 400 },
        );
    }

    try {
        const updated = await updateOrderEstimatedDeliveryAt(orderId, estimatedDeliveryAt);
        return NextResponse.json({
            ok: true,
            estimatedDeliveryAt: updated.estimatedDeliveryAt.toISOString(),
        });
    } catch (error) {
        if (error instanceof UpdateOrderEtaError) {
            if (error.code === "NOT_FOUND") {
                return NextResponse.json({ error: "Order not found" }, { status: 404 });
            }
            return NextResponse.json({ error: error.message }, { status: 400 });
        }

        console.error("Update order ETA error", error);
        const message = error instanceof Error ? error.message : String(error);
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
