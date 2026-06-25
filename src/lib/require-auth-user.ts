import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";

export async function requireAuthenticatedUserId(): Promise<
    { userId: number } | NextResponse
> {
    const session = await auth();
    const rawId = session?.user?.id;

    if (rawId == null || !Number.isFinite(Number(rawId))) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    return { userId: Number(rawId) };
}
