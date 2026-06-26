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
    console.log("[PUSH] Subscribe request received");

    if (!process.env.VAPID_PRIVATE_KEY || !process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY) {
        console.error("[PUSH] Server VAPID keys missing");
        return NextResponse.json({ error: "Server VAPID keys missing" }, { status: 500 });
    }

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
    if (!session?.user?.id || !Number.isFinite(Number(session.user.id))) {
        console.warn("[PUSH] Subscribe rejected: unauthorized");
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = Number(session.user.id);
    const { endpoint, keys } = parsed.data;

    console.log("[PUSH] Saving subscription for user:", userId, "endpoint:", endpoint.slice(0, 48));

    try {
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
    } catch (error) {
        const message = error instanceof Error ? error.message : "Database error";
        console.error("[PUSH SUBSCRIBE ERROR]", error);
        return NextResponse.json({ error: message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
}