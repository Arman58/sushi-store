import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { verifyAdmin } from "@/lib/verify-admin";

const FK_MESSAGE = "Нельзя удалить эту категорию, так как к ней привязаны товары!";

export async function DELETE(
    request: Request,
    context: { params: Promise<{ id: string }> },
) {
    const auth = await verifyAdmin(request);
    if (!auth.ok) {
        return auth.response;
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
