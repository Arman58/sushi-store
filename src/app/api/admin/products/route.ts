import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";

import { parseAdminModifierGroupsPayload } from "@/lib/admin-product-modifiers";
import { adminProductCreateSchema } from "@/lib/api-schemas";
import { localizedSlugSource } from "@/lib/i18n-utils";
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
            orderBy: { id: "asc" },
        });
        return NextResponse.json(products);
    } catch {
        // Error logged in production monitoring
        return NextResponse.json({ error: "Failed to fetch products" }, { status: 500 });
    }
}

export async function POST(request: Request) {
    const auth = await verifyAdmin(request);
    if (!auth.ok) {
        return auth.response;
    }

    const parsed = await parseJsonBody(request, adminProductCreateSchema);
    if (!parsed.ok) return parsed.response;

    const b = parsed.data;

    let modifierGroupsNested:
        | {
              create: {
                  name: { hy: string; ru: string; en: string };
                  required: boolean;
                  maxChoices: number;
                  position: number;
                  modifiers: {
                      create: {
                          name: { hy: string; ru: string; en: string };
                          priceDelta: number;
                          position: number;
                      }[];
                  };
              }[];
          }
        | undefined;

    if (b.modifierGroups !== undefined) {
        const modParsed = parseAdminModifierGroupsPayload(b.modifierGroups);
        if (!modParsed.ok) {
            return NextResponse.json({ error: modParsed.error }, { status: 400 });
        }
        // На create id из payload игнорируем - это новый товар, новые сущности.
        modifierGroupsNested = {
            create: modParsed.groups.map((g, gi) => ({
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

    const price = b.price;
    const category = await prisma.category.findUnique({ where: { id: b.categoryId } });
    if (!category) {
        return NextResponse.json({ error: "Category not found" }, { status: 400 });
    }

    const slugInput = b.slug?.trim() ? b.slug.trim() : null;
    const slug =
        slugInput ?? (await makeUniqueProductSlug(localizedSlugSource(b.name)));
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
        imageUrls = b.images.filter((x) => x.trim() !== "");
    } else {
        return NextResponse.json({ error: "Invalid images" }, { status: 400 });
    }

    let mainImage: string | null = null;
    if (b.mainImage != null) {
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
                name: b.name,
                slug,
                price,
                categoryId: b.categoryId,
                description:
                    b.description == null ? Prisma.DbNull : b.description,
                composition:
                    b.composition == null ? Prisma.DbNull : b.composition,
                weight: b.weight ?? null,
                images,
                mainImage,
                isActive: b.isActive ?? true,
                minQty: b.minQty ?? 1,
                maxQty: b.maxQty ?? null,
                ...(b.upsellIds && b.upsellIds.length > 0
                    ? {
                          upsells: {
                              create: [...new Set(b.upsellIds)].map(
                                  (suggestedId, i) => ({
                                      suggestedId,
                                      position: i,
                                  }),
                              ),
                          },
                      }
                    : {}),
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
    } catch {
        // Error logged in production monitoring
        return NextResponse.json({ error: "Failed to create product" }, { status: 500 });
    }
}
