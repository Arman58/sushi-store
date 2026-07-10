import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";

import {
    type AdminModifierGroupInput,
    parseAdminModifierGroupsPayload,
} from "@/lib/admin-product-modifiers";
import { asLocalizedRecord, isLocalizedJson, type LocalizedJson } from "@/lib/i18n-utils";
import { prisma } from "@/lib/prisma";
import { invalidateCatalogCache } from "@/lib/revalidate-storefront";
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
): Promise<{ data: Prisma.ProductUpdateInput; translationsPayload: Record<string, LocalizedJson> } | { response: NextResponse }> {
    const data: Prisma.ProductUpdateInput = {};
    const translationsPayload: Record<string, LocalizedJson> = {};
    const has = (key: string) => Object.prototype.hasOwnProperty.call(raw, key);

    if (has("name")) {
        const v = raw.name;
        if (!isLocalizedJson(v) || (!v.hy.trim() && !v.ru.trim() && !v.en.trim())) {
            return { response: NextResponse.json({ error: "Invalid name" }, { status: 400 }) };
        }
        translationsPayload.name = v;
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
            translationsPayload.description = { hy: "", ru: "", en: "" }; // treated as null later
        } else if (isLocalizedJson(v)) {
            translationsPayload.description = v;
        } else {
            return { response: NextResponse.json({ error: "Invalid description" }, { status: 400 }) };
        }
    }
    if (has("composition")) {
        const v = raw.composition;
        if (v === null) {
            translationsPayload.composition = { hy: "", ru: "", en: "" };
        } else if (isLocalizedJson(v)) {
            translationsPayload.composition = v;
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
    if (has("isAvailable")) {
        const v = raw.isAvailable;
        if (typeof v !== "boolean") {
            return { response: NextResponse.json({ error: "Invalid isAvailable" }, { status: 400 }) };
        }
        data.isAvailable = v;
    }
    if (has("minQty")) {
        const v = raw.minQty;
        if (typeof v !== "number" || !Number.isInteger(v) || v < 1 || v > 999) {
            return { response: NextResponse.json({ error: "Invalid minQty" }, { status: 400 }) };
        }
        data.minQty = v;
    }
    if (has("maxQty")) {
        const v = raw.maxQty;
        if (v !== null && (typeof v !== "number" || !Number.isInteger(v) || v < 1 || v > 999)) {
            return { response: NextResponse.json({ error: "Invalid maxQty" }, { status: 400 }) };
        }
        data.maxQty = v;
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

    return { data, translationsPayload };
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

    // Кросс-селл «с этим берут»: полная замена списка
    let upsellReplacement: number[] | undefined;
    if (Object.prototype.hasOwnProperty.call(rawBody, "upsellIds")) {
        const v = rawBody.upsellIds;
        if (
            !Array.isArray(v) ||
            v.some(
                (x) =>
                    typeof x !== "number" || !Number.isInteger(x) || x < 1,
            )
        ) {
            return NextResponse.json(
                { error: "Invalid upsellIds" },
                { status: 400 },
            );
        }
        upsellReplacement = [...new Set(v as number[])]
            .filter((x) => x !== idResult.id)
            .slice(0, 12);
    }

    const rest: Record<string, unknown> = { ...rawBody };
    delete rest.modifierGroups;
    delete rest.upsellIds;

    const parsed = await parsePutBodyToPrismaUpdate(rest, idResult.id);
    if ("response" in parsed) return parsed.response;


    if (
        Object.keys(parsed.data).length === 0 &&
        Object.keys(parsed.translationsPayload).length === 0 &&
        replacementGroups === undefined &&
        upsellReplacement === undefined
    ) {
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

            if (Object.keys(parsed.translationsPayload).length > 0) {
                const locales = ["hy", "ru", "en"];
                for (const loc of locales) {
                    const updateData: {
                        name?: string;
                        description?: string | null;
                        composition?: string | null;
                    } = {};
                    if ("name" in parsed.translationsPayload) {
                        updateData.name = parsed.translationsPayload.name[loc] || "";
                    }
                    if ("description" in parsed.translationsPayload) {
                        updateData.description = parsed.translationsPayload.description[loc] || null;
                    }
                    if ("composition" in parsed.translationsPayload) {
                        updateData.composition = parsed.translationsPayload.composition[loc] || null;
                    }
                    if (Object.keys(updateData).length > 0) {
                        // We need the existing translation to provide fallback name if creating
                        const existingT = await tx.productTranslation.findUnique({
                            where: { productId_locale: { productId: idResult.id, locale: loc } }
                        });
                        if (existingT) {
                            await tx.productTranslation.update({
                                where: { productId_locale: { productId: idResult.id, locale: loc } },
                                data: updateData,
                            });
                        } else {
                            await tx.productTranslation.create({
                                data: {
                                    productId: idResult.id,
                                    locale: loc,
                                    name: updateData.name ?? "",
                                    description: updateData.description ?? null,
                                    composition: updateData.composition ?? null,
                                }
                            });
                        }
                    }
                }
            }

            if (replacementGroups !== undefined) {
                await upsertProductModifierGroups(tx, idResult.id, replacementGroups);
            }

            if (upsellReplacement !== undefined) {
                await tx.productUpsell.deleteMany({
                    where: { productId: idResult.id },
                });
                if (upsellReplacement.length > 0) {
                    await tx.productUpsell.createMany({
                        data: upsellReplacement.map((suggestedId, i) => ({
                            productId: idResult.id,
                            suggestedId,
                            position: i,
                        })),
                    });
                }
            }

            return tx.product.findUniqueOrThrow({
                where: { id: idResult.id },
                include: {
                    category: true,
                    upsells: {
                        orderBy: { position: "asc" },
                        select: { suggestedId: true },
                    },
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

        invalidateCatalogCache();
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

const LOCALES = ["hy", "ru", "en"] as const;

function localizedNameParts(
    name: AdminModifierGroupInput["name"] | AdminModifierGroupInput["modifiers"][number]["name"],
): Record<(typeof LOCALES)[number], string> {
    const record =
        name && typeof name === "object"
            ? (name as Record<string, unknown>)
            : ({} as Record<string, unknown>);
    return {
        hy: typeof record.hy === "string" ? record.hy : "",
        ru: typeof record.ru === "string" ? record.ru : "",
        en: typeof record.en === "string" ? record.en : "",
    };
}

async function upsertGroupTranslations(
    tx: Prisma.TransactionClient,
    modifierGroupId: number,
    name: AdminModifierGroupInput["name"],
): Promise<void> {
    const parts = localizedNameParts(name);
    await Promise.all(
        LOCALES.map((locale) =>
            tx.modifierGroupTranslation.upsert({
                where: {
                    modifierGroupId_locale: { modifierGroupId, locale },
                },
                create: {
                    modifierGroupId,
                    locale,
                    name: parts[locale],
                },
                update: { name: parts[locale] },
            }),
        ),
    );
}

async function upsertModifierTranslations(
    tx: Prisma.TransactionClient,
    modifierId: number,
    name: AdminModifierGroupInput["modifiers"][number]["name"],
): Promise<void> {
    const parts = localizedNameParts(name);
    await Promise.all(
        LOCALES.map((locale) =>
            tx.modifierTranslation.upsert({
                where: { modifierId_locale: { modifierId, locale } },
                create: { modifierId, locale, name: parts[locale] },
                update: { name: parts[locale] },
            }),
        ),
    );
}

/**
 * Upsert ModifierGroup + Modifier без N+1 ownership checks:
 * ownership загружается одним запросом, переводы пишутся параллельно.
 */
async function upsertProductModifierGroups(
    tx: Prisma.TransactionClient,
    productId: number,
    incomingGroups: AdminModifierGroupInput[],
): Promise<void> {
    const existingGroups = await tx.modifierGroup.findMany({
        where: { productId },
        select: {
            id: true,
            modifiers: { select: { id: true } },
        },
    });
    const ownedGroupIds = new Set(existingGroups.map((g) => g.id));
    const ownedModifierIdsByGroup = new Map(
        existingGroups.map((g) => [g.id, new Set(g.modifiers.map((m) => m.id))]),
    );

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

    for (let gi = 0; gi < incomingGroups.length; gi++) {
        const g = incomingGroups[gi];
        const groupPosition = g.position || gi;
        let groupId: number;

        if (typeof g.id === "number") {
            if (!ownedGroupIds.has(g.id)) {
                throw Object.assign(
                    new Error(`Группа модификаторов id=${String(g.id)} не принадлежит товару`),
                    { httpStatus: 400 },
                );
            }
            await tx.modifierGroup.update({
                where: { id: g.id },
                data: {
                    required: g.required,
                    maxChoices: g.maxChoices,
                    position: groupPosition,
                },
            });
            await upsertGroupTranslations(tx, g.id, g.name);
            groupId = g.id;
        } else {
            const created = await tx.modifierGroup.create({
                data: {
                    productId,
                    required: g.required,
                    maxChoices: g.maxChoices,
                    position: groupPosition,
                    translations: {
                        create: LOCALES.map((locale) => ({
                            locale,
                            name: localizedNameParts(g.name)[locale],
                        })),
                    },
                },
                select: { id: true },
            });
            groupId = created.id;
            ownedModifierIdsByGroup.set(groupId, new Set());
        }

        const ownedModifierIds = ownedModifierIdsByGroup.get(groupId) ?? new Set<number>();
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
                if (!ownedModifierIds.has(m.id)) {
                    throw Object.assign(
                        new Error(`Опция id=${String(m.id)} не принадлежит группе`),
                        { httpStatus: 400 },
                    );
                }
                await tx.modifier.update({
                    where: { id: m.id },
                    data: {
                        priceDelta: m.priceDelta,
                        position: modPosition,
                    },
                });
                await upsertModifierTranslations(tx, m.id, m.name);
            } else {
                await tx.modifier.create({
                    data: {
                        modifierGroupId: groupId,
                        priceDelta: m.priceDelta,
                        position: modPosition,
                        translations: {
                            create: LOCALES.map((locale) => ({
                                locale,
                                name: localizedNameParts(m.name)[locale],
                            })),
                        },
                    },
                });
            }
        }
    }
}

const productDetailInclude = {
    translations: true,
    category: { include: { translations: true } },
    upsells: {
        orderBy: { position: "asc" as const },
        select: { suggestedId: true },
    },
    modifierGroups: {
        orderBy: [{ position: "asc" as const }, { id: "asc" as const }],
        include: {
            translations: true,
            modifiers: {
                orderBy: [{ position: "asc" as const }, { id: "asc" as const }],
                include: { translations: true },
            },
        },
    },
} satisfies Prisma.ProductInclude;

function emptyLocalized() {
    return { hy: "", ru: "", en: "" };
}

function mapProductDetailForAdmin(
    product: Prisma.ProductGetPayload<{ include: typeof productDetailInclude }>,
) {
    const { translations, category, modifierGroups, ...rest } = product;
    return {
        ...rest,
        name: asLocalizedRecord(translations, "name") ?? emptyLocalized(),
        description: asLocalizedRecord(translations, "description") ?? emptyLocalized(),
        composition: asLocalizedRecord(translations, "composition") ?? emptyLocalized(),
        category: category
            ? {
                  ...category,
                  name: asLocalizedRecord(category.translations, "name") ?? emptyLocalized(),
              }
            : null,
        modifierGroups: modifierGroups.map((g) => ({
            id: g.id,
            required: g.required,
            maxChoices: g.maxChoices,
            position: g.position,
            name: asLocalizedRecord(g.translations, "name") ?? emptyLocalized(),
            modifiers: g.modifiers.map((m) => ({
                id: m.id,
                priceDelta: m.priceDelta,
                position: m.position,
                name: asLocalizedRecord(m.translations, "name") ?? emptyLocalized(),
            })),
        })),
    };
}

export async function GET(
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
        const product = await prisma.product.findUnique({
            where: { id: idResult.id },
            include: productDetailInclude,
        });
        if (!product) {
            return NextResponse.json({ error: "Product not found" }, { status: 404 });
        }
        return NextResponse.json(mapProductDetailForAdmin(product));
    } catch {
        return NextResponse.json({ error: "Failed to fetch product" }, { status: 500 });
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
        invalidateCatalogCache();
        return NextResponse.json({ ok: true });
    } catch (error) {
        // P2003 (FK Restrict): товар лежит в серверных корзинах покупателей.
        // Вместо жёсткого удаления - soft delete: validate-cart пометит строки
        // как "inactive", клиент покажет штатное состояние «товар недоступен».
        if (
            error instanceof Prisma.PrismaClientKnownRequestError &&
            error.code === "P2003"
        ) {
            await prisma.product.update({
                where: { id: idResult.id },
                data: { isActive: false, isAvailable: false },
            });
            invalidateCatalogCache();
            return NextResponse.json({ ok: true, softDeleted: true });
        }
        // Error logged in production monitoring
        return NextResponse.json({ error: "Failed to delete product" }, { status: 500 });
    }
}
