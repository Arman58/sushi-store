import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";

import {
    type AdminModifierGroupInput,
    parseAdminModifierGroupsPayload,
} from "@/lib/admin-product-modifiers";
import { isLocalizedJson } from "@/lib/i18n-utils";
import { prisma } from "@/lib/prisma";
import { verifyAdmin } from "@/lib/verify-admin";

function parseProductId(
    request: Request,
    params: { id?: string } | undefined,
): { ok: true; id: number } | { ok: false; response: NextResponse } {
    const direct = Number(params?.id);
    if (!Number.isNaN(direct) && direct > 0) {
        return { ok: true, id: direct };
    }
    try {
        const segments = new URL(request.url).pathname.split("/");
        const idx = segments.findIndex((seg) => seg === "products");
        const maybeId = segments[idx + 1];
        const parsed = Number(maybeId);
        if (!Number.isNaN(parsed) && parsed > 0) {
            return { ok: true, id: parsed };
        }
    } catch {
        // ignore
    }
    return {
        ok: false,
        response: NextResponse.json({ error: "Invalid product id" }, { status: 400 }),
    };
}

/** Keys we accept on PUT - only keys present on the parsed body are merged into Prisma update `data`.
 *  (POST в `route.ts` по-прежнему требует name, price, categoryId.) */
async function parsePutBodyToPrismaUpdate(
    raw: Record<string, unknown>,
    productId: number,
): Promise<{ data: Prisma.ProductUpdateInput } | { response: NextResponse }> {
    const data: Prisma.ProductUpdateInput = {};
    const has = (key: string) => Object.prototype.hasOwnProperty.call(raw, key);

    if (has("name")) {
        const v = raw.name;
        if (!isLocalizedJson(v) || (!v.hy.trim() && !v.ru.trim() && !v.en.trim())) {
            return { response: NextResponse.json({ error: "Invalid name" }, { status: 400 }) };
        }
        data.name = v;
    }
    if (has("slug")) {
        const v = raw.slug;
        if (typeof v !== "string" || v.trim() === "") {
            return { response: NextResponse.json({ error: "Invalid slug" }, { status: 400 }) };
        }
        data.slug = v.trim();
    }
    if (has("description")) {
        const v = raw.description;
        if (v === null) {
            data.description = Prisma.DbNull;
        } else if (isLocalizedJson(v)) {
            data.description = v;
        } else {
            return { response: NextResponse.json({ error: "Invalid description" }, { status: 400 }) };
        }
    }
    if (has("composition")) {
        const v = raw.composition;
        if (v === null) {
            data.composition = Prisma.DbNull;
        } else if (isLocalizedJson(v)) {
            data.composition = v;
        } else {
            return { response: NextResponse.json({ error: "Invalid composition" }, { status: 400 }) };
        }
    }
    if (has("price")) {
        const v = raw.price;
        if (typeof v !== "number" || !Number.isFinite(v) || v < 0) {
            return { response: NextResponse.json({ error: "Invalid price" }, { status: 400 }) };
        }
        data.price = Math.round(v);
    }
    if (has("weight")) {
        const v = raw.weight;
        if (v === null) {
            data.weight = null;
        } else if (typeof v === "number" && Number.isInteger(v)) {
            data.weight = v;
        } else {
            return { response: NextResponse.json({ error: "Invalid weight" }, { status: 400 }) };
        }
    }
    if (has("images")) {
        const v = raw.images;
        if (v === null) {
            data.images = [] as Prisma.InputJsonValue;
        } else if (Array.isArray(v)) {
            data.images = v as Prisma.InputJsonValue;
        } else {
            return { response: NextResponse.json({ error: "Invalid images" }, { status: 400 }) };
        }
    }
    if (has("mainImage")) {
        const v = raw.mainImage;
        if (v === null) {
            data.mainImage = null;
        } else if (typeof v === "string") {
            const t = v.trim();
            data.mainImage = t === "" ? null : t;
        } else {
            return { response: NextResponse.json({ error: "Invalid mainImage" }, { status: 400 }) };
        }
    }
    if (has("isActive")) {
        const v = raw.isActive;
        if (typeof v !== "boolean") {
            return { response: NextResponse.json({ error: "Invalid isActive" }, { status: 400 }) };
        }
        data.isActive = v;
    }
    if (has("categoryId")) {
        const v = raw.categoryId;
        if (typeof v !== "number" || !Number.isInteger(v)) {
            return { response: NextResponse.json({ error: "Invalid categoryId" }, { status: 400 }) };
        }
        const category = await prisma.category.findUnique({ where: { id: v } });
        if (!category) {
            return { response: NextResponse.json({ error: "Category not found" }, { status: 400 }) };
        }
        data.category = { connect: { id: v } };
    }

    if (typeof data.slug === "string") {
        const taken = await prisma.product.findFirst({
            where: { slug: data.slug, NOT: { id: productId } },
        });
        if (taken) {
            return { response: NextResponse.json({ error: "slug already in use" }, { status: 400 }) };
        }
    }

    return { data };
}

function urlListFromJson(images: unknown): string[] {
    if (!Array.isArray(images)) return [];
    return images.filter(
        (x): x is string => typeof x === "string" && x.trim() !== "",
    );
}

function reconcileMainImageForUpdate(
    existing: { mainImage: string | null; images: unknown },
    update: Prisma.ProductUpdateInput,
    nextImages: string[],
): { ok: true; mainImage: string | null } | { ok: false; response: NextResponse } {
    let main: string | null;
    if (update.mainImage !== undefined) {
        if (update.mainImage === null) {
            main = null;
        } else {
            const m = String(update.mainImage).trim();
            main = m === "" ? null : m;
            if (main !== null && !nextImages.includes(main)) {
                return {
                    ok: false,
                    response: NextResponse.json(
                        { error: "mainImage must be one of product images" },
                        { status: 400 },
                    ),
                };
            }
        }
    } else {
        main = existing.mainImage;
    }
    if (main !== null && !nextImages.includes(main)) {
        main = null;
    }
    return { ok: true, mainImage: main };
}

async function handleProductJsonPartialUpdate(request: Request, params: Promise<{ id: string }>) {
    const auth = await verifyAdmin(request);
    if (!auth.ok) {
        return auth.response;
    }

    const resolvedParams = await params;
    const idResult = parseProductId(request, resolvedParams);
    if (!idResult.ok) return idResult.response;

    let body: unknown;
    try {
        body = await request.json();
    } catch {
        return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    if (body === null || typeof body !== "object" || Array.isArray(body)) {
        return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const rawBody = body as Record<string, unknown>;
    const hasModifierGroupsKey = Object.prototype.hasOwnProperty.call(rawBody, "modifierGroups");

    let replacementGroups: AdminModifierGroupInput[] | undefined;
    if (hasModifierGroupsKey) {
        const modsParsed = parseAdminModifierGroupsPayload(rawBody.modifierGroups);
        if (!modsParsed.ok) {
            return NextResponse.json({ error: modsParsed.error }, { status: 400 });
        }
        replacementGroups = modsParsed.groups;
    }

    const rest: Record<string, unknown> = { ...rawBody };
    delete rest.modifierGroups;

    const parsed = await parsePutBodyToPrismaUpdate(rest, idResult.id);
    if ("response" in parsed) return parsed.response;


    if (Object.keys(parsed.data).length === 0 && replacementGroups === undefined) {
        return NextResponse.json({ error: "No fields to update" }, { status: 400 });
    }

    const existing = await prisma.product.findUnique({ where: { id: idResult.id } });
    if (!existing) {
        return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    const nextImages =
        parsed.data.images !== undefined
            ? urlListFromJson(parsed.data.images)
            : urlListFromJson(existing.images);

    const finalData: Prisma.ProductUpdateInput = { ...parsed.data };

    if (parsed.data.images !== undefined || parsed.data.mainImage !== undefined) {
        const reconciled = reconcileMainImageForUpdate(existing, parsed.data, nextImages);
        if (!reconciled.ok) return reconciled.response;
        finalData.mainImage = reconciled.mainImage;
    }

    try {
        const product = await prisma.$transaction(async (tx) => {
            if (Object.keys(finalData).length > 0) {
                await tx.product.update({
                    where: { id: idResult.id },
                    data: finalData,
                });
            }

            if (replacementGroups !== undefined) {
                await upsertProductModifierGroups(tx, idResult.id, replacementGroups);
            }

            return tx.product.findUniqueOrThrow({
                where: { id: idResult.id },
                include: {
                    category: true,
                    modifierGroups: {
                        orderBy: [{ position: "asc" }, { id: "asc" }],
                        include: {
                            modifiers: {
                                orderBy: [{ position: "asc" }, { id: "asc" }],
                            },
                        },
                    },
                },
            });
        });

        return NextResponse.json(product);
    } catch (error) {
        if (
            typeof error === "object" &&
            error !== null &&
            "httpStatus" in error &&
            typeof (error as { httpStatus?: unknown }).httpStatus === "number"
        ) {
            const httpStatus = (error as { httpStatus: number }).httpStatus;
            const message =
                error instanceof Error ? error.message : "Bad Request";
            if (httpStatus >= 400 && httpStatus < 500) {
                return NextResponse.json({ error: message }, { status: httpStatus });
            }
        }
        // Error logged in production monitoring
        return NextResponse.json({ error: "Failed to update product" }, { status: 500 });
    }
}

/**
 * Upsert-стратегия для ModifierGroup и вложенных Modifier:
 *
 *   1. Удалить группы товара, которых нет в incoming (по id).
 *   2. Для каждой incoming-группы:
 *      - id есть → update (с anti-IDOR проверкой productId);
 *      - id нет  → create.
 *   3. Внутри группы - то же для опций (anti-IDOR по modifierGroupId).
 *
 * onDelete: Cascade в схеме сам подчистит modifiers удалённых групп.
 */
async function upsertProductModifierGroups(
    tx: Prisma.TransactionClient,
    productId: number,
    incomingGroups: AdminModifierGroupInput[],
): Promise<void> {
    // 1) Удаляем группы, которых больше нет.
    const incomingGroupIds = incomingGroups
        .map((g) => g.id)
        .filter((id): id is number => typeof id === "number");

    await tx.modifierGroup.deleteMany({
        where: {
            productId,
            ...(incomingGroupIds.length > 0
                ? { id: { notIn: incomingGroupIds } }
                : {}),
        },
    });

    // 2) Для каждой incoming-группы - update либо create.
    for (let gi = 0; gi < incomingGroups.length; gi++) {
        const g = incomingGroups[gi];
        const groupPosition = g.position || gi;

        let groupId: number;

        if (typeof g.id === "number") {
            // anti-IDOR: убеждаемся, что эта группа принадлежит именно этому товару.
            const owns = await tx.modifierGroup.findFirst({
                where: { id: g.id, productId },
                select: { id: true },
            });
            if (!owns) {
                throw Object.assign(
                    new Error(`Группа модификаторов id=${String(g.id)} не принадлежит товару`),
                    { httpStatus: 400 },
                );
            }
            await tx.modifierGroup.update({
                where: { id: g.id },
                data: {
                    name: g.name,
                    required: g.required,
                    maxChoices: g.maxChoices,
                    position: groupPosition,
                },
            });
            groupId = g.id;
        } else {
            const created = await tx.modifierGroup.create({
                data: {
                    productId,
                    name: g.name,
                    required: g.required,
                    maxChoices: g.maxChoices,
                    position: groupPosition,
                },
                select: { id: true },
            });
            groupId = created.id;
        }

        // 3) Опции внутри группы.
        const incomingModifierIds = g.modifiers
            .map((m) => m.id)
            .filter((id): id is number => typeof id === "number");

        await tx.modifier.deleteMany({
            where: {
                modifierGroupId: groupId,
                ...(incomingModifierIds.length > 0
                    ? { id: { notIn: incomingModifierIds } }
                    : {}),
            },
        });

        for (let mi = 0; mi < g.modifiers.length; mi++) {
            const m = g.modifiers[mi];
            const modPosition = m.position || mi;

            if (typeof m.id === "number") {
                // anti-IDOR: опция должна принадлежать именно этой группе.
                const owns = await tx.modifier.findFirst({
                    where: { id: m.id, modifierGroupId: groupId },
                    select: { id: true },
                });
                if (!owns) {
                    throw Object.assign(
                        new Error(
                            `Опция id=${String(m.id)} не принадлежит группе`,
                        ),
                        { httpStatus: 400 },
                    );
                }
                await tx.modifier.update({
                    where: { id: m.id },
                    data: {
                        name: m.name,
                        priceDelta: m.priceDelta,
                        position: modPosition,
                    },
                });
            } else {
                await tx.modifier.create({
                    data: {
                        modifierGroupId: groupId,
                        name: m.name,
                        priceDelta: m.priceDelta,
                        position: modPosition,
                    },
                });
            }
        }
    }
}

export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
    return handleProductJsonPartialUpdate(request, context.params);
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
    return handleProductJsonPartialUpdate(request, context.params);
}

export async function DELETE(
    request: Request,
    context: { params: Promise<{ id: string }> },
) {
    const auth = await verifyAdmin(request);
    if (!auth.ok) {
        return auth.response;
    }

    const params = await context.params;
    const idResult = parseProductId(request, params);
    if (!idResult.ok) return idResult.response;

    try {
        await prisma.product.delete({ where: { id: idResult.id } });
        return NextResponse.json({ ok: true });
    } catch {
        // Error logged in production monitoring
        return NextResponse.json({ error: "Failed to delete product" }, { status: 500 });
    }
}
