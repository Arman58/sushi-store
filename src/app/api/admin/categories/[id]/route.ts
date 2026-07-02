import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";

import { adminCategoryPatchSchema } from "@/lib/api-schemas";
import { parseJsonBody } from "@/lib/parse-json-body";
import { prisma } from "@/lib/prisma";
import { verifyAdmin } from "@/lib/verify-admin";

const FK_MESSAGE = "Нельзя удалить эту категорию, так как к ней привязаны товары!";

/** Обновление категории: фото (загрузка/замена/удаление), имя, порядок, активность. */
export async function PATCH(
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

    const parsed = await parseJsonBody(request, adminCategoryPatchSchema);
    if (!parsed.ok) return parsed.response;

    const exists = await prisma.category.findUnique({ where: { id } });
    if (!exists) {
        return NextResponse.json({ error: "Category not found" }, { status: 404 });
    }

    try {
        const category = await prisma.category.update({
            where: { id },
            data: {
                ...(parsed.data.name !== undefined
                    ? { name: parsed.data.name }
                    : {}),
                ...(parsed.data.image !== undefined
                    ? { image: parsed.data.image }
                    : {}),
                ...(parsed.data.isActive !== undefined
                    ? { isActive: parsed.data.isActive }
                    : {}),
                ...(parsed.data.position !== undefined
                    ? { position: parsed.data.position }
                    : {}),
            },
        });
        return NextResponse.json(category);
    } catch {
        // Error logged in production monitoring
        return NextResponse.json(
            { error: "Failed to update category" },
            { status: 500 },
        );
    }
}

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
        // Error logged in production monitoring
        return NextResponse.json({ error: "Failed to delete category" }, { status: 500 });
    }
}
