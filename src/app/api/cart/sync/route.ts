import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import type { z } from "zod";

import { cartSyncBodySchema } from "@/lib/api-schemas";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type CartSyncBody = z.infer<typeof cartSyncBodySchema>;
type CartSyncItem = CartSyncBody["items"][number];

function parseModifiers(value: unknown): CartSyncItem["selectedModifiers"] {
    const parsed =
        cartSyncBodySchema.shape.items.element.shape.selectedModifiers.safeParse(
            value,
        );
    return parsed.success ? parsed.data : [];
}

function lineToClientItem(line: {
    cartItemId: string;
    productId: number;
    name: string;
    basePrice: number;
    quantity: number;
    selectedModifiers: unknown;
    calculatedItemPrice: number;
    image: string | null;
}): CartSyncItem {
    return {
        cartItemId: line.cartItemId,
        productId: line.productId,
        name: line.name,
        basePrice: line.basePrice,
        quantity: line.quantity,
        selectedModifiers: parseModifiers(line.selectedModifiers),
        calculatedItemPrice: line.calculatedItemPrice,
        image: line.image,
    };
}

export async function GET() {
    try {
        const session = await auth();
        const userId = session?.user?.id;
        if (!userId) {
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 401 },
            );
        }

        const cart = await prisma.cart.findUnique({
            where: { userId },
            include: {
                lines: { orderBy: { position: "asc" } },
            },
        });

        if (!cart) {
            return NextResponse.json({ items: [], appliedPromoCode: null });
        }

        return NextResponse.json({
            items: cart.lines.map(lineToClientItem),
            appliedPromoCode: cart.appliedPromoCode ?? null,
        });
    } catch (error) {
        console.error("[CartSync GET Error]", error);
        return NextResponse.json(
            { error: "Internal Server Error" },
            { status: 500 },
        );
    }
}

export async function POST(req: Request) {
    try {
        const session = await auth();
        const userId = session?.user?.id;
        if (!userId) {
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 401 },
            );
        }

        let raw: unknown;
        try {
            raw = await req.json();
        } catch {
            return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
        }

        const parsed = cartSyncBodySchema.safeParse(raw);
        if (!parsed.success) {
            return NextResponse.json(
                {
                    error: "Invalid cart payload",
                    details: parsed.error.flatten(),
                },
                { status: 400 },
            );
        }

        const { items, appliedPromoCode } = parsed.data;
        const promo = appliedPromoCode ?? null;

        const productIds = [...new Set(items.map((i) => i.productId))];
        const existingProducts =
            productIds.length === 0
                ? []
                : await prisma.product.findMany({
                      where: { id: { in: productIds } },
                      select: { id: true },
                  });
        const existingIds = new Set(existingProducts.map((p) => p.id));
        const safeItems = items.filter((i) => existingIds.has(i.productId));
        const droppedCount = items.length - safeItems.length;

        await prisma.$transaction(async (tx) => {
            const cart = await tx.cart.upsert({
                where: { userId },
                update: { appliedPromoCode: promo },
                create: {
                    userId,
                    appliedPromoCode: promo,
                },
                select: { id: true },
            });

            await tx.cartLine.deleteMany({ where: { cartId: cart.id } });

            if (safeItems.length === 0) return;

            await tx.cartLine.createMany({
                data: safeItems.map((item, position) => ({
                    cartId: cart.id,
                    cartItemId: item.cartItemId,
                    productId: item.productId,
                    name: item.name,
                    basePrice: item.basePrice,
                    quantity: item.quantity,
                    selectedModifiers:
                        item.selectedModifiers as Prisma.InputJsonValue,
                    calculatedItemPrice: item.calculatedItemPrice,
                    image: item.image ?? null,
                    position,
                })),
            });
        });

        return NextResponse.json({ success: true, droppedCount });
    } catch (error) {
        console.error("[CartSync POST Error]", error);
        return NextResponse.json(
            { error: "Internal Server Error" },
            { status: 500 },
        );
    }
}
