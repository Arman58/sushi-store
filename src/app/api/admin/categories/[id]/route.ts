import { Prisma } from "@prisma/client";
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

const FK_MESSAGE = "Нельзя удалить эту категорию, так как к ней привязаны товары!";

export async function DELETE(
    request: Request,
    context: { params: Promise<{ id: string }> },
) {
    if (!isAuthorized(request)) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: idParam } = await context.params;
    const id = Number.parseInt(idParam, 10);
    if (Number.isNaN(id) || !Number.isInteger(id) || id < 1) {
        return NextResponse.json({ error: "Invalid category id" }, { status: 400 });
    }

    const exists = await prisma.category.findUnique({ where: { id } });
    if (!exists) {
        return NextResponse.json({ error: "Category not found" }, { status: 404 });
    }

    try {
        await prisma.category.delete({ where: { id } });
        return NextResponse.json({ ok: true });
    } catch (e) {
        if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2003") {
            return NextResponse.json({ error: FK_MESSAGE }, { status: 409 });
        }
        console.error("Admin category DELETE error", e);
        return NextResponse.json({ error: "Failed to delete category" }, { status: 500 });
    }
}
