import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";

import { parseAdminModifierGroupsPayload } from "@/lib/admin-product-modifiers";
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
    const auth = await verifyAdmin(request);
    if (!auth.ok) {
        return auth.response;
    }

    try {
        const products = await prisma.product.findMany({
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
            orderBy: { id: "asc" },
        });
        return NextResponse.json(products);
    } catch (error) {
        console.error("Admin products GET error", error);
        return NextResponse.json({ error: "Failed to fetch products" }, { status: 500 });
    }
}

export async function POST(request: Request) {
    const auth = await verifyAdmin(request);
    if (!auth.ok) {
        return auth.response;
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
        mainImage?: unknown;
        isActive?: unknown;
        slug?: unknown;
        modifierGroups?: unknown;
    };

    let modifierGroupsNested:
        | {
              create: {
                  name: string;
                  required: boolean;
                  maxChoices: number;
                  position: number;
                  modifiers: {
                      create: { name: string; priceDelta: number; position: number }[];
                  };
              }[];
          }
        | undefined;

    if (Object.prototype.hasOwnProperty.call(b, "modifierGroups")) {
        const parsed = parseAdminModifierGroupsPayload(b.modifierGroups);
        if (!parsed.ok) {
            return NextResponse.json({ error: parsed.error }, { status: 400 });
        }
        // На create id из payload игнорируем — это новый товар, новые сущности.
        modifierGroupsNested = {
            create: parsed.groups.map((g, gi) => ({
                name: g.name,
                required: g.required,
                maxChoices: g.maxChoices,
                position: g.position || gi,
                modifiers: {
                    create: g.modifiers.map((m, mi) => ({
                        name: m.name,
                        priceDelta: m.priceDelta,
                        position: m.position || mi,
                    })),
                },
            })),
        };
    }

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
    let imageUrls: string[];
    if (b.images === undefined || b.images === null) {
        images = [];
        imageUrls = [];
    } else if (Array.isArray(b.images)) {
        images = b.images as Prisma.InputJsonValue;
        imageUrls = (b.images as unknown[]).filter(
            (x): x is string => typeof x === "string" && x.trim() !== "",
        );
    } else {
        return NextResponse.json({ error: "Invalid images" }, { status: 400 });
    }

    let mainImage: string | null = null;
    if (b.mainImage !== undefined && b.mainImage !== null) {
        if (typeof b.mainImage !== "string") {
            return NextResponse.json({ error: "Invalid mainImage" }, { status: 400 });
        }
        const t = b.mainImage.trim();
        if (t !== "") {
            if (!imageUrls.includes(t)) {
                return NextResponse.json(
                    { error: "mainImage must be one of product images" },
                    { status: 400 },
                );
            }
            mainImage = t;
        }
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
                mainImage,
                isActive: typeof b.isActive === "boolean" ? b.isActive : true,
                ...(modifierGroupsNested ? { modifierGroups: modifierGroupsNested } : {}),
            },
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
        return NextResponse.json(product, { status: 201 });
    } catch (error) {
        console.error("Admin products POST error", error);
        return NextResponse.json({ error: "Failed to create product" }, { status: 500 });
    }
}
