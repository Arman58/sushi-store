import { NextResponse } from "next/server";
import { z } from "zod";

import { normalizePhoneToE164Digits } from "@/lib/phone";
import { prisma } from "@/lib/prisma";
import { requireAuthenticatedUserId } from "@/lib/require-auth-user";

const phoneBodySchema = z.object({
    phone: z.string().min(1).max(32),
});

export async function GET() {
    const authResult = await requireAuthenticatedUserId();
    if (authResult instanceof NextResponse) return authResult;

    const user = await prisma.user.findUnique({
        where: { id: authResult.userId },
        select: { phone: true },
    });

    return NextResponse.json({ phone: user?.phone ?? null });
}

export async function PATCH(request: Request) {
    const authResult = await requireAuthenticatedUserId();
    if (authResult instanceof NextResponse) return authResult;

    let json: unknown;
    try {
        json = await request.json();
    } catch {
        return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const parsed = phoneBodySchema.safeParse(json);
    if (!parsed.success) {
        return NextResponse.json({ error: "Invalid phone" }, { status: 400 });
    }

    const normalized = normalizePhoneToE164Digits(parsed.data.phone);
    if (!normalized) {
        return NextResponse.json({ error: "Invalid phone" }, { status: 400 });
    }

    const taken = await prisma.user.findFirst({
        where: {
            phone: normalized,
            NOT: { id: authResult.userId },
        },
        select: { id: true },
    });
    if (taken) {
        return NextResponse.json({ error: "Phone already in use" }, { status: 409 });
    }

    const updated = await prisma.user.update({
        where: { id: authResult.userId },
        data: { phone: normalized },
        select: { phone: true },
    });

    return NextResponse.json({ phone: updated.phone });
}
