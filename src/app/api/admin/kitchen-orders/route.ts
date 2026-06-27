import { NextResponse } from "next/server";

import { fetchKitchenOrders } from "@/lib/kitchen-orders";
import { verifyAdmin } from "@/lib/verify-admin";

export async function GET(request: Request) {
    const auth = await verifyAdmin(request);
    if (!auth.ok) {
        return auth.response;
    }

    try {
        const data = await fetchKitchenOrders();
        return NextResponse.json(data);
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
