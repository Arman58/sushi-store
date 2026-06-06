import { NextResponse } from "next/server";

import { adminCategoryCreateSchema } from "@/lib/api-schemas";
import { parseJsonBody } from "@/lib/parse-json-body";
import { prisma } from "@/lib/prisma";
import { verifyAdmin } from "@/lib/verify-admin";

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
    const auth = await verifyAdmin(request);
    if (!auth.ok) {
        return auth.response;
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
    const auth = await verifyAdmin(request);
    if (!auth.ok) {
        return auth.response;
    }

    const parsed = await parseJsonBody(request, adminCategoryCreateSchema);
    if (!parsed.ok) return parsed.response;

    const name = parsed.data.name;
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
