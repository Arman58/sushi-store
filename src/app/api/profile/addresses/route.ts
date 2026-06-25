import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { requireAuthenticatedUserId } from "@/lib/require-auth-user";
import { savedAddressBodySchema,type SavedAddressDto } from "@/lib/saved-address";

function serializeAddress(address: {
    id: number;
    label: string;
    street: string;
    apartment: string | null;
    comment: string | null;
    createdAt: Date;
}): SavedAddressDto {
    return {
        id: address.id,
        label: address.label,
        street: address.street,
        apartment: address.apartment,
        comment: address.comment,
        createdAt: address.createdAt.toISOString(),
    };
}

export async function GET() {
    const authResult = await requireAuthenticatedUserId();
    if (authResult instanceof NextResponse) return authResult;

    const addresses = await prisma.savedAddress.findMany({
        where: { userId: authResult.userId },
        orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({
        addresses: addresses.map(serializeAddress),
    });
}

export async function POST(request: Request) {
    const authResult = await requireAuthenticatedUserId();
    if (authResult instanceof NextResponse) return authResult;

    let json: unknown;
    try {
        json = await request.json();
    } catch {
        return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const parsed = savedAddressBodySchema.safeParse(json);
    if (!parsed.success) {
        return NextResponse.json({ error: "Invalid address" }, { status: 400 });
    }

    const created = await prisma.savedAddress.create({
        data: {
            userId: authResult.userId,
            ...parsed.data,
        },
    });

    return NextResponse.json({ address: serializeAddress(created) }, { status: 201 });
}
