import type { OrderStatus } from "@prisma/client";
import { NextResponse } from "next/server";

import { adminOrderStatusBodySchema } from "@/lib/api-schemas";
import {
    updateOrderStatus,
    UpdateOrderStatusError,
} from "@/lib/order-service";
import { parseJsonBody } from "@/lib/parse-json-body";
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

    const parsed = await parseJsonBody(request, adminOrderStatusBodySchema);
    if (!parsed.ok) return parsed.response;

    const rawStatus = parsed.data.status as OrderStatus;

    try {
        const updated = await updateOrderStatus(orderId, rawStatus);
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

        // Error logged in production monitoring
        const message = error instanceof Error ? error.message : String(error);
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
