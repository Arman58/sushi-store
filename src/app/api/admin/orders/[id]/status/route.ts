import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";

const ADMIN_USER = process.env.ADMIN_USER;
const ADMIN_PASS = process.env.ADMIN_PASS;

function isAuthorized(request: Request): boolean {
    if (!ADMIN_USER || !ADMIN_PASS) return false;

    const expected = Buffer.from(`${ADMIN_USER}:${ADMIN_PASS}`).toString("base64");
    const cookieHeader = request.headers.get("cookie") ?? "";
    const hasCookie = cookieHeader.includes(`admin_auth=${expected}`);

    if (hasCookie) return true;

    const authHeader = request.headers.get("authorization");
    if (authHeader?.startsWith("Basic ")) {
        const token = authHeader.split(" ")[1] ?? "";
        try {
            const decoded = Buffer.from(token, "base64").toString("utf-8");
            const [user, pass] = decoded.split(":");
            return user === ADMIN_USER && pass === ADMIN_PASS;
        } catch {
            return false;
        }
    }

    return false;
}

export async function POST(
    request: Request,
    context: { params: Promise<{ id: string }> },
) {
    if (!isAuthorized(request)) {
        return new NextResponse("Unauthorized", { status: 401 });
    }

    const params = await context.params;

    const extractId = () => {
        const direct = Number(params?.id);
        if (!Number.isNaN(direct) && direct > 0) return direct;

        try {
            const segments = new URL(request.url).pathname.split("/");
            const orderIndex = segments.findIndex((seg) => seg === "orders");
            const maybeId = segments[orderIndex + 1];
            const parsed = Number(maybeId);
            if (!Number.isNaN(parsed) && parsed > 0) return parsed;
        } catch {
            // ignore
        }

        return NaN;
    };

    const orderId = extractId();
    if (Number.isNaN(orderId) || orderId <= 0) {
        return NextResponse.json({ error: "Invalid order id" }, { status: 400 });
    }

    let body: unknown;
    try {
        body = await request.json();
    } catch {
        return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const status = (body as { status?: string }).status;
    if (
        status !== "NEW" &&
        status !== "IN_PROGRESS" &&
        status !== "DONE" &&
        status !== "CANCELLED"
    ) {
        return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    try {
        const updated = await prisma.order.update({
            where: { id: orderId },
            data: { status },
            select: { id: true, status: true },
        });

        return NextResponse.json({ ok: true, status: updated.status });
    } catch (error) {
        console.error("Update status error", error);
        return NextResponse.json({ error: "Failed to update status" }, { status: 500 });
    }
}
