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

async function makeUniqueCategorySlug(name: string): Promise<string> {
    const base = slugifyName(name) || `cat-${Date.now()}`;
    for (let n = 0; n < 10_000; n++) {
        const slug = n === 0 ? base : `${base}-${n}`;
        const existing = await prisma.category.findUnique({ where: { slug } });
        if (!existing) return slug;
    }
    return `cat-${Date.now()}`;
}

export async function GET(request: Request) {
    if (!isAuthorized(request)) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const categories = await prisma.category.findMany({
            orderBy: { name: "asc" },
        });
        return NextResponse.json(categories);
    } catch (error) {
        console.error("Admin categories GET error", error);
        return NextResponse.json({ error: "Failed to fetch categories" }, { status: 500 });
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

    const b = body as { name?: unknown };
    if (typeof b.name !== "string" || b.name.trim() === "") {
        return NextResponse.json({ error: "name is required" }, { status: 400 });
    }

    const name = b.name.trim();
    const slug = await makeUniqueCategorySlug(name);

    try {
        const category = await prisma.category.create({
            data: { name, slug },
        });
        return NextResponse.json(category, { status: 201 });
    } catch (error) {
        console.error("Admin categories POST error", error);
        return NextResponse.json({ error: "Failed to create category" }, { status: 500 });
    }
}
