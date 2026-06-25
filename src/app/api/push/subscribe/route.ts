import { NextResponse } from "next/server";
import { z } from "zod";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const pushSubscribeSchema = z.object({
    endpoint: z.string().url(),
    keys: z.object({
        p256dh: z.string().min(1),
        auth: z.string().min(1),
    }),
});

export async function POST(request: Request) {
    let json: unknown;
    try {
        json = await request.json();
    } catch {
        return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const parsed = pushSubscribeSchema.safeParse(json);
    if (!parsed.success) {
        return NextResponse.json({ error: "Invalid subscription" }, { status: 400 });
    }

    const session = await auth();
    const userId =
        session?.user?.id != null && Number.isFinite(Number(session.user.id))
            ? Number(session.user.id)
            : null;

    const { endpoint, keys } = parsed.data;

    await prisma.pushSubscription.upsert({
        where: { endpoint },
        create: {
            endpoint,
            keys,
            userId,
        },
        update: {
            keys,
            userId,
        },
    });

    return NextResponse.json({ ok: true });
}
