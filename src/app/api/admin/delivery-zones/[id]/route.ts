import { NextResponse } from "next/server";

import { translationsToLocalized } from "@/lib/admin-localized";
import { adminDeliveryZonePatchSchema } from "@/lib/api-schemas";
import { parseJsonBody } from "@/lib/parse-json-body";
import { prisma } from "@/lib/prisma";
import { invalidateDeliveryZonesCache } from "@/lib/revalidate-storefront";
import { verifyAdmin } from "@/lib/verify-admin";

const LOCALES = ["hy", "ru", "en"] as const;

function parseId(param: string): number | null {
    const id = Number(param);
    return Number.isInteger(id) && id > 0 ? id : null;
}

function mapZoneRow<T extends { translations?: unknown }>(zone: T) {
    const { translations, ...rest } = zone;
    return {
        ...rest,
        name: translationsToLocalized(translations, "name"),
        description: translationsToLocalized(translations, "description"),
    };
}

export async function PATCH(
    request: Request,
    ctx: { params: Promise<{ id: string }> },
) {
    const auth = await verifyAdmin(request);
    if (!auth.ok) return auth.response;

    const { id: idRaw } = await ctx.params;
    const id = parseId(idRaw);
    if (!id) {
        return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    }

    const parsed = await parseJsonBody(request, adminDeliveryZonePatchSchema);
    if (!parsed.ok) return parsed.response;

    const { name, description, ...scalarData } = parsed.data;

    try {
        const updated = await prisma.$transaction(async (tx) => {
            if (name !== undefined || description !== undefined) {
                const nameData = (name ?? {}) as Record<string, string>;
                const descData = (description ?? {}) as Record<string, string>;
                const existing = await tx.deliveryZoneTranslation.findMany({
                    where: { deliveryZoneId: id },
                });
                const byLocale = new Map(existing.map((t) => [t.locale, t]));

                await Promise.all(
                    LOCALES.map((locale) => {
                        const prev = byLocale.get(locale);
                        const nextName =
                            name !== undefined
                                ? nameData[locale] || ""
                                : prev?.name || "";
                        const nextDescription =
                            description !== undefined
                                ? descData[locale] || null
                                : prev?.description ?? null;
                        return tx.deliveryZoneTranslation.upsert({
                            where: {
                                deliveryZoneId_locale: {
                                    deliveryZoneId: id,
                                    locale,
                                },
                            },
                            create: {
                                deliveryZoneId: id,
                                locale,
                                name: nextName,
                                description: nextDescription,
                            },
                            update: {
                                name: nextName,
                                description: nextDescription,
                            },
                        });
                    }),
                );
            }

            return tx.deliveryZone.update({
                where: { id },
                data: scalarData,
                include: { translations: true },
            });
        });

        invalidateDeliveryZonesCache();
        return NextResponse.json(mapZoneRow(updated));
    } catch {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
}

export async function DELETE(
    request: Request,
    ctx: { params: Promise<{ id: string }> },
) {
    const auth = await verifyAdmin(request);
    if (!auth.ok) return auth.response;

    const { id: idRaw } = await ctx.params;
    const id = parseId(idRaw);
    if (!id) {
        return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    }

    try {
        await prisma.deliveryZone.delete({ where: { id } });
        invalidateDeliveryZonesCache();
        return NextResponse.json({ ok: true });
    } catch {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
}
