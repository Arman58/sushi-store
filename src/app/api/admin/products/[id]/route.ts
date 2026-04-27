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

    const b = body as Record<string, unknown>;
    const data: {
        name?: string;
        slug?: string;
        description?: string | null;
        composition?: string | null;
        price?: number;
        weight?: number | null;
        images?: Prisma.InputJsonValue;
        isActive?: boolean;
        categoryId?: number;
    } = {};

    if (b.name !== undefined) {
        if (typeof b.name !== "string" || b.name.trim() === "") {
            return NextResponse.json({ error: "Invalid name" }, { status: 400 });
        }
        data.name = b.name.trim();
    }
    if (b.slug !== undefined) {
        if (typeof b.slug !== "string" || b.slug.trim() === "") {
            return NextResponse.json({ error: "Invalid slug" }, { status: 400 });
        }
        data.slug = b.slug.trim();
    }
    if (b.description !== undefined) {
        if (b.description === null) {
            data.description = null;
        } else if (typeof b.description === "string") {
            data.description = b.description;
        } else {
            return NextResponse.json({ error: "Invalid description" }, { status: 400 });
        }
    }
    if (b.composition !== undefined) {
        if (b.composition === null) {
            data.composition = null;
        } else if (typeof b.composition === "string") {
            data.composition = b.composition;
        } else {
            return NextResponse.json({ error: "Invalid composition" }, { status: 400 });
        }
    }
    if (b.price !== undefined) {
        if (typeof b.price !== "number" || !Number.isFinite(b.price) || b.price < 0) {
            return NextResponse.json({ error: "Invalid price" }, { status: 400 });
        }
        data.price = Math.round(b.price);
    }
    if (b.weight !== undefined) {
        if (b.weight === null) {
            data.weight = null;
        } else if (typeof b.weight === "number" && Number.isInteger(b.weight)) {
            data.weight = b.weight;
        } else {
            return NextResponse.json({ error: "Invalid weight" }, { status: 400 });
        }
    }
    if (b.images !== undefined) {
        if (b.images === null) {
            data.images = [] as Prisma.InputJsonValue;
        } else if (Array.isArray(b.images)) {
            data.images = b.images as Prisma.InputJsonValue;
        } else {
            return NextResponse.json({ error: "Invalid images" }, { status: 400 });
        }
    }
    if (b.isActive !== undefined) {
        if (typeof b.isActive !== "boolean") {
            return NextResponse.json({ error: "Invalid isActive" }, { status: 400 });
        }
        data.isActive = b.isActive;
    }
    if (b.categoryId !== undefined) {
        if (typeof b.categoryId !== "number" || !Number.isInteger(b.categoryId)) {
            return NextResponse.json({ error: "Invalid categoryId" }, { status: 400 });
        }
        const category = await prisma.category.findUnique({ where: { id: b.categoryId } });
        if (!category) {
            return NextResponse.json({ error: "Category not found" }, { status: 400 });
        }
        data.categoryId = b.categoryId;
    }

    if (data.slug) {
        const taken = await prisma.product.findFirst({
            where: { slug: data.slug, NOT: { id: idResult.id } },
        });
        if (taken) {
            return NextResponse.json({ error: "slug already in use" }, { status: 400 });
        }
    }

    if (Object.keys(data).length === 0) {
        return NextResponse.json({ error: "No fields to update" }, { status: 400 });
    }

    try {
        const product = await prisma.product.update({
            where: { id: idResult.id },
            data,
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
