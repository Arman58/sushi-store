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

async function getOwnedAddress(userId: number, id: number) {
    if (!Number.isFinite(id) || id <= 0) return null;

    return prisma.savedAddress.findFirst({
        where: { id, userId },
    });
}

export async function PUT(
    request: Request,
    context: { params: Promise<{ id: string }> },
) {
    const authResult = await requireAuthenticatedUserId();
    if (authResult instanceof NextResponse) return authResult;

    const params = await context.params;
    const addressId = Number(params.id);
    const existing = await getOwnedAddress(authResult.userId, addressId);

    if (!existing) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

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

    const updated = await prisma.savedAddress.update({
        where: { id: existing.id },
        data: parsed.data,
    });

    return NextResponse.json({ address: serializeAddress(updated) });
}

export async function DELETE(
    _request: Request,
    context: { params: Promise<{ id: string }> },
) {
    const authResult = await requireAuthenticatedUserId();
    if (authResult instanceof NextResponse) return authResult;

    const params = await context.params;
    const addressId = Number(params.id);
    const existing = await getOwnedAddress(authResult.userId, addressId);

    if (!existing) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    await prisma.savedAddress.delete({ where: { id: existing.id } });

    return NextResponse.json({ ok: true });
}
