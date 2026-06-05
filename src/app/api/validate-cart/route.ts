import { NextResponse } from "next/server";
import { z } from "zod";

import { validateCartLinesForCheckout } from "@/lib/prepare-order-items";

const itemSchema = z.object({
    cartItemId: z.string().min(1),
    productId: z.number().int().positive(),
    price: z.number().int().positive(),
    quantity: z.number().int().positive(),
    selectedModifierIds: z.array(z.number().int().positive()).optional(),
});

const bodySchema = z.object({
    items: z.array(itemSchema),
});

export async function POST(request: Request) {
    let json: unknown;
    try {
        json = await request.json();
    } catch {
        return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const parsed = bodySchema.safeParse(json);
    if (!parsed.success) {
        return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    const lines = parsed.data.items.map((i) => ({
        cartItemId: i.cartItemId,
        productId: i.productId,
        price: i.price,
        quantity: i.quantity,
        selectedModifierIds: Array.from(new Set(i.selectedModifierIds ?? [])),
    }));

    const items = await validateCartLinesForCheckout(lines);
    const valid = items.every((row) => row.ok);

    return NextResponse.json({ valid, items });
}
