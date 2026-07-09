import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";

/**
 * Liveness / readiness probe for uptime monitors.
 * Does not expose secrets or internal details.
 */
export async function GET() {
    try {
        await prisma.$queryRaw`SELECT 1`;
        return NextResponse.json(
            { ok: true, db: "up" },
            {
                status: 200,
                headers: { "Cache-Control": "no-store" },
            },
        );
    } catch {
        return NextResponse.json(
            { ok: false, db: "down" },
            {
                status: 503,
                headers: { "Cache-Control": "no-store" },
            },
        );
    }
}
