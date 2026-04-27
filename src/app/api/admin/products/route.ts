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

function slugifyName(name: string): string {
    const cleaned = name
        .toLowerCase()
        .trim()
        .replace(/\s+/g, "-")
        .replace(/[^a-z0-9-]/g, "");
    return cleaned;
}

async function makeUniqueProductSlug(name: string): Promise<string> {
    const base = slugifyName(name) || `item-${Date.now()}`;
    for (let n = 0; n < 10_000; n++) {
        const slug = n === 0 ? base : `${base}-${n}`;
        const existing = await prisma.product.findUnique({ where: { slug } });
        if (!existing) return slug;
    }
    return `${base}-${Date.now()}`;
}

export async function GET(request: Request) {
    if (!isAuthorized(request)) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const products = await prisma.product.findMany({
            include: { category: true },
            orderBy: { id: "asc" },
        });
        return NextResponse.json(products);
    } catch (error) {
        console.error("Admin products GET error", error);
        return NextResponse.json({ error: "Failed to fetch products" }, { status: 500 });
    }
}

export async function POST(request: Request) {
    if (!isAuthorized(request)) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let body: unknown;
    try {
        body = await request.json();
    } catch {
        return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const b = body as {
        name?: unknown;
        price?: unknown;
        categoryId?: unknown;
        description?: unknown;
        composition?: unknown;
        weight?: unknown;
        images?: unknown;
        isActive?: unknown;
        slug?: unknown;
    };

    if (typeof b.name !== "string" || b.name.trim() === "") {
        return NextResponse.json({ error: "name is required" }, { status: 400 });
    }
    if (typeof b.price !== "number" || !Number.isFinite(b.price) || b.price < 0) {
        return NextResponse.json({ error: "price is required" }, { status: 400 });
    }
    if (typeof b.categoryId !== "number" || !Number.isInteger(b.categoryId)) {
        return NextResponse.json({ error: "categoryId is required" }, { status: 400 });
    }

    const price = Math.round(b.price);
    const category = await prisma.category.findUnique({ where: { id: b.categoryId } });
    if (!category) {
        return NextResponse.json({ error: "Category not found" }, { status: 400 });
    }

    const slugInput = typeof b.slug === "string" && b.slug.trim() !== "" ? b.slug.trim() : null;
    const slug = slugInput ?? (await makeUniqueProductSlug(b.name));
    if (slugInput) {
        const taken = await prisma.product.findUnique({ where: { slug } });
        if (taken) {
            return NextResponse.json({ error: "slug already in use" }, { status: 400 });
        }
    }

    let images: Prisma.InputJsonValue;
    if (b.images === undefined || b.images === null) {
        images = [];
    } else if (Array.isArray(b.images)) {
        images = b.images as Prisma.InputJsonValue;
    } else {
        return NextResponse.json({ error: "Invalid images" }, { status: 400 });
    }

    try {
        const product = await prisma.product.create({
            data: {
                name: b.name.trim(),
                slug,
                price,
                categoryId: b.categoryId,
                description: typeof b.description === "string" ? b.description : null,
                composition: typeof b.composition === "string" ? b.composition : null,
                weight: typeof b.weight === "number" && Number.isInteger(b.weight) ? b.weight : null,
                images,
                isActive: typeof b.isActive === "boolean" ? b.isActive : true,
            },
            include: { category: true },
        });
        return NextResponse.json(product, { status: 201 });
    } catch (error) {
        console.error("Admin products POST error", error);
        return NextResponse.json({ error: "Failed to create product" }, { status: 500 });
    }
}
