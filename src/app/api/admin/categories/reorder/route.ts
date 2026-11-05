import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";

import { adminCategoryReorderSchema } from "@/lib/api-schemas";
import { parseJsonBody } from "@/lib/parse-json-body";
import { prisma } from "@/lib/prisma";
import { invalidateCatalogCache } from "@/lib/revalidate-storefront";
import { verifyAdmin } from "@/lib/verify-admin";

/**
 * Задать порядок категорий на сайте одним запросом: `{ ids: [3, 1, 2] }`.
 *
 * Принимает ПОЛНЫЙ список: если за время работы в админке категории добавили или
 * удалили (в другой вкладке, другой человек), ответ 409 - клиент перезагрузит список,
 * вместо того чтобы молча затереть чужие изменения.
 */
export async function PUT(request: Request) {
    const auth = await verifyAdmin(request);
    if (!auth.ok) {
        return auth.response;
    }

    const parsed = await parseJsonBody(request, adminCategoryReorderSchema);
    if (!parsed.ok) return parsed.response;

    const { ids } = parsed.data;

    try {
        await prisma.$transaction(
            async (tx) => {
            const existing = await tx.category.findMany({ select: { id: true } });
            const existingIds = new Set(existing.map((c) => c.id));
            if (existingIds.size !== ids.length || ids.some((id) => !existingIds.has(id))) {
                throw new CategoryListChangedError();
            }

            for (const [index, id] of ids.entries()) {
                await tx.category.update({ where: { id }, data: { position: index } });
            }
            },
            { timeout: 15_000 },
        );
    } catch (error) {
        // P2025: категорию удалили между проверкой и обновлением - то же, что "список изменился".
        if (
            error instanceof CategoryListChangedError ||
            (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025")
        ) {
            return NextResponse.json(
                { error: "Category list has changed, reload the page", code: "CATEGORY_LIST_CHANGED" },
                { status: 409 },
            );
        }
        return NextResponse.json({ error: "Failed to reorder categories" }, { status: 500 });
    }

    invalidateCatalogCache();
    return NextResponse.json({ ok: true });
}

class CategoryListChangedError extends Error {}
