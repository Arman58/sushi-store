import { NextResponse } from "next/server";
import { z } from "zod";

import { translationsToLocalized } from "@/lib/admin-localized";
import { validateBannerHref } from "@/lib/banner-href";
import { parseJsonBody } from "@/lib/parse-json-body";
import { prisma } from "@/lib/prisma";
import { invalidateBannersCache } from "@/lib/revalidate-storefront";
import { verifyAdmin } from "@/lib/verify-admin";

const bannerBodySchema = z.object({
    image: z.string().url().max(2048),
    title: z.record(z.string()).optional().default({}),
    ctaText: z.record(z.string()).optional().default({}),
    href: z.string().max(2048).nullable().optional(),
    isActive: z.boolean().optional().default(true),
    position: z.number().int().min(0).optional().default(0),
    startsAt: z.string().datetime().nullable().optional(),
    endsAt: z.string().datetime().nullable().optional(),
});

function mapBannerRow<T extends { translations?: unknown }>(banner: T) {
    const { translations, ...rest } = banner;
    return {
        ...rest,
        title: translationsToLocalized(translations, "title"),
        ctaText: translationsToLocalized(translations, "ctaText"),
    };
}

export async function GET(request: Request) {
    const auth = await verifyAdmin(request);
    if (!auth.ok) return auth.response;
    try {
        const banners = await prisma.banner.findMany({
            orderBy: [{ position: "asc" }, { id: "asc" }],
            include: { translations: true },
        });
        return NextResponse.json(banners.map(mapBannerRow));
    } catch {
        return NextResponse.json(
            { error: "Failed to fetch banners" },
            { status: 500 },
        );
    }
}

export async function POST(request: Request) {
    const auth = await verifyAdmin(request);
    if (!auth.ok) return auth.response;

    const parsed = await parseJsonBody(request, bannerBodySchema);
    if (!parsed.ok) return parsed.response;

    const href = validateBannerHref(parsed.data.href);
    if (!href.ok) {
        return NextResponse.json(
            { error: "Invalid banner href", code: href.code },
            { status: 400 },
        );
    }

    const titleData = parsed.data.title as Record<string, string>;
    const ctaTextData = parsed.data.ctaText as Record<string, string>;
    const translationsData = ["hy", "ru", "en"].map((loc) => ({
        locale: loc,
        title: titleData[loc] || "",
        ctaText: ctaTextData[loc] || "",
    }));

    try {
        const banner = await prisma.banner.create({
            data: {
                image: parsed.data.image,
                href: href.value,
                isActive: parsed.data.isActive,
                position: parsed.data.position,
                startsAt: parsed.data.startsAt
                    ? new Date(parsed.data.startsAt)
                    : null,
                endsAt: parsed.data.endsAt ? new Date(parsed.data.endsAt) : null,
                translations: {
                    create: translationsData,
                },
            },
            include: { translations: true },
        });
        invalidateBannersCache();
        return NextResponse.json(mapBannerRow(banner), { status: 201 });
    } catch {
        return NextResponse.json(
            { error: "Failed to create banner" },
            { status: 500 },
        );
    }
}
