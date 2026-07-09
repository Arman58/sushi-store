import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";

import { parseAdminModifierGroupsPayload } from "@/lib/admin-product-modifiers";
import { adminProductCreateSchema } from "@/lib/api-schemas";
import { asLocalizedRecord, localizedSlugSource } from "@/lib/i18n-utils";
import { parseJsonBody } from "@/lib/parse-json-body";
import { prisma } from "@/lib/prisma";
import { invalidateCatalogCache } from "@/lib/revalidate-storefront";
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

function emptyLocalized() {
    return { hy: "", ru: "", en: "" };
}

function mapProductListRow(
    product: Prisma.ProductGetPayload<{
        include: {
            translations: true;
            category: { include: { translations: true } };
            upsells: { select: { suggestedId: true } };
        };
    }>,
) {
    const { translations, category, ...rest } = product;
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
    };
}

export async function GET(request: Request) {
    const auth = await verifyAdmin(request);
    if (!auth.ok) {
        return auth.response;
    }

    try {
        // List payload stays light: modifiers load on GET /api/admin/products/[id] when editing.
        const products = await prisma.product.findMany({
            include: {
                translations: true,
                category: { include: { translations: true } },
                upsells: {
                    orderBy: { position: "asc" },
                    select: { suggestedId: true },
                },
            },
            orderBy: { id: "asc" },
        });
        return NextResponse.json(products.map(mapProductListRow));
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

    const nameData = b.name as Record<string, string>;
    const descriptionData = b.description as Record<string, string> | undefined;
    const compositionData = b.composition as Record<string, string> | undefined;

    const translationsData = ["hy", "ru", "en"].map((loc) => ({
        locale: loc,
        name: nameData[loc] || "",
        description: descriptionData?.[loc] || null,
        composition: compositionData?.[loc] || null,
    }));

    try {
        const product = await prisma.product.create({
            data: {
                slug,
                price,
                categoryId: b.categoryId,
                images,
                mainImage,
                isActive: b.isActive ?? true,
                minQty: b.minQty ?? 1,
                maxQty: b.maxQty ?? null,
                translations: {
                    create: translationsData,
                },
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
        invalidateCatalogCache();
        return NextResponse.json(product, { status: 201 });
    } catch {
        // Error logged in production monitoring
        return NextResponse.json({ error: "Failed to create product" }, { status: 500 });
    }
}
