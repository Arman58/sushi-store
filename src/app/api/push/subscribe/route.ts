import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";

import { auth } from "@/lib/auth";
import { debugLog } from "@/lib/debug-log";
import { prisma } from "@/lib/prisma";
import { isValidPushEndpoint } from "@/lib/push-endpoint";
import {
    checkRateLimit,
    rateLimitExceededJsonResponse,
} from "@/lib/rate-limit";

const pushSubscribeSchema = z.object({
    endpoint: z.string().refine(isValidPushEndpoint),
    keys: z.object({
        p256dh: z.string().min(1),
        auth: z.string().min(1),
    }),
});

export async function POST(request: Request) {
    const rl = await checkRateLimit(request, "pushSubscribe");
    if (!rl.allowed) return rateLimitExceededJsonResponse();

    debugLog("[PUSH] Subscribe request received");

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

    debugLog("[PUSH] Saving subscription for user:", session.user.id);

    try {
        // The ownership predicate is part of the write, including concurrent claims.
        const where = { endpoint, OR: [{ userId }, { userId: null }] };
        const data = { keys, userId };
        try {
            await prisma.pushSubscription.upsert({
                where,
                create: { endpoint, ...data },
                update: data,
            });
        } catch (error) {
            if (
                !(error instanceof Prisma.PrismaClientKnownRequestError) ||
                (error.code !== "P2002" && error.code !== "P2025")
            ) {
                throw error;
            }

            // P2002: concurrent insert / foreign owner; P2025: an unowned row was claimed.
            // Retry only an owned/unclaimed row so same-user races still succeed.
            const updated = await prisma.pushSubscription.updateMany({
                where,
                data,
            });
            if (updated.count === 0) {
                return NextResponse.json({ error: "Subscription unavailable" }, { status: 409 });
            }
        }
    } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown database error";
        console.error("[PUSH SUBSCRIBE ERROR]", error);
        return NextResponse.json({ error: `DB Error: ${message}` }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
}
