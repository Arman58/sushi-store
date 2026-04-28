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

/** Keys we accept on PUT — only keys present on the parsed body are merged into Prisma update `data`.
 *  (POST в `route.ts` по-прежнему требует name, price, categoryId.) */
async function parsePutBodyToPrismaUpdate(
    raw: Record<string, unknown>,
    productId: number,
): Promise<{ data: Prisma.ProductUpdateInput } | { response: NextResponse }> {
    const data: Prisma.ProductUpdateInput = {};
    const has = (key: string) => Object.prototype.hasOwnProperty.call(raw, key);

    if (has("name")) {
        const v = raw.name;
        if (typeof v !== "string" || v.trim() === "") {
            return { response: NextResponse.json({ error: "Invalid name" }, { status: 400 }) };
        }
        data.name = v.trim();
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
            data.description = null;
        } else if (typeof v === "string") {
            data.description = v;
        } else {
            return { response: NextResponse.json({ error: "Invalid description" }, { status: 400 }) };
        }
    }
    if (has("composition")) {
        const v = raw.composition;
        if (v === null) {
            data.composition = null;
        } else if (typeof v === "string") {
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

    if (Object.keys(data).length === 0) {
        return { response: NextResponse.json({ error: "No fields to update" }, { status: 400 }) };
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

export async function PUT(
    request: Request,
    context: { params: Promise<{ id: string }> },
) {
    if (!isAuthorized(request)) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const params = await context.params;
    const idResult = parseProductId(request, params);
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

    const parsed = await parsePutBodyToPrismaUpdate(body as Record<string, unknown>, idResult.id);
    if ("response" in parsed) return parsed.response;

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
        const product = await prisma.product.update({
            where: { id: idResult.id },
            data: finalData,
            include: { category: true },
        });
        return NextResponse.json(product);
    } catch (error) {
        console.error("Admin product PUT error", error);
        return NextResponse.json({ error: "Failed to update product" }, { status: 500 });
    }
}

export async function DELETE(
    request: Request,
    context: { params: Promise<{ id: string }> },
) {
    if (!isAuthorized(request)) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const params = await context.params;
    const idResult = parseProductId(request, params);
    if (!idResult.ok) return idResult.response;

    try {
        await prisma.product.delete({ where: { id: idResult.id } });
        return NextResponse.json({ ok: true });
    } catch (error) {
        console.error("Admin product DELETE error", error);
        return NextResponse.json({ error: "Failed to delete product" }, { status: 500 });
    }
}
