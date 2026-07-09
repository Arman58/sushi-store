import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";

import { translationsToLocalized } from "@/lib/admin-localized";
import { adminCategoryPatchSchema } from "@/lib/api-schemas";
import { parseJsonBody } from "@/lib/parse-json-body";
import { prisma } from "@/lib/prisma";
import { invalidateCatalogCache } from "@/lib/revalidate-storefront";
import { verifyAdmin } from "@/lib/verify-admin";

const FK_MESSAGE = "Нельзя удалить эту категорию, так как к ней привязаны товары!";

const LOCALES = ["hy", "ru", "en"] as const;

function mapCategoryRow<T extends { translations?: unknown }>(category: T) {
    const { translations, ...rest } = category;
    return {
        ...rest,
        name: translationsToLocalized(translations, "name"),
    };
}

/** Обновление категории: фото, имя (translations), порядок, активность. */
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
        const category = await prisma.$transaction(async (tx) => {
            if (parsed.data.name !== undefined) {
                const nameData = parsed.data.name as Record<string, string>;
                await Promise.all(
                    LOCALES.map((locale) =>
                        tx.categoryTranslation.upsert({
                            where: {
                                categoryId_locale: { categoryId: id, locale },
                            },
                            create: {
                                categoryId: id,
                                locale,
                                name: nameData[locale] || "",
                            },
                            update: { name: nameData[locale] || "" },
                        }),
                    ),
                );
            }

            return tx.category.update({
                where: { id },
                data: {
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
                include: { translations: true },
            });
        });

        invalidateCatalogCache();
        return NextResponse.json(mapCategoryRow(category));
    } catch {
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
        invalidateCatalogCache();
        return NextResponse.json({ ok: true });
    } catch (e) {
        if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2003") {
            return NextResponse.json({ error: FK_MESSAGE }, { status: 409 });
        }
        return NextResponse.json({ error: "Failed to delete category" }, { status: 500 });
    }
}
