import type { OrderStatus } from "@prisma/client";
import { NextResponse } from "next/server";

import {
    isOrderStatus,
    UpdateOrderStatusError,
    updateOrderStatus,
} from "@/lib/order-service";
import { verifyAdmin } from "@/lib/verify-admin";

export async function POST(
    request: Request,
    context: { params: Promise<{ id: string }> },
) {
    const auth = await verifyAdmin(request);
    if (!auth.ok) {
        return auth.response;
    }

    const params = await context.params;

    const extractId = () => {
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
    };

    const orderId = extractId();
    if (Number.isNaN(orderId) || orderId <= 0) {
        return NextResponse.json({ error: "Invalid order id" }, { status: 400 });
    }

    let body: unknown;
    try {
        body = await request.json();
    } catch {
        return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const rawStatus = (body as { status?: unknown }).status;
    if (typeof rawStatus !== "string") {
        return NextResponse.json({ error: "status must be a string" }, { status: 400 });
    }

    if (!isOrderStatus(rawStatus)) {
        return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    try {
        const updated = await updateOrderStatus(orderId, rawStatus as OrderStatus);
        return NextResponse.json({ ok: true, status: updated.status });
    } catch (error) {
        if (error instanceof UpdateOrderStatusError) {
            if (error.code === "NOT_FOUND") {
                return NextResponse.json({ error: "Order not found" }, { status: 404 });
            }
            if (error.code === "CANCELLED_LOCKED") {
                return NextResponse.json({ error: error.message }, { status: 409 });
            }
            return NextResponse.json({ error: error.message }, { status: 400 });
        }

        console.error("Update status error", error);
        const message = error instanceof Error ? error.message : String(error);
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
