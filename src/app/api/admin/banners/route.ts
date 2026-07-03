import { NextResponse } from "next/server";
import { z } from "zod";

import { parseJsonBody } from "@/lib/parse-json-body";
import { prisma } from "@/lib/prisma";
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

export async function GET(request: Request) {
    const auth = await verifyAdmin(request);
    if (!auth.ok) return auth.response;
    try {
        const banners = await prisma.banner.findMany({
            orderBy: [{ position: "asc" }, { id: "asc" }],
        });
        return NextResponse.json(banners);
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

    try {
        const banner = await prisma.banner.create({
            data: {
                image: parsed.data.image,
                title: parsed.data.title,
                ctaText: parsed.data.ctaText,
                href: parsed.data.href ?? null,
                isActive: parsed.data.isActive,
                position: parsed.data.position,
                startsAt: parsed.data.startsAt
                    ? new Date(parsed.data.startsAt)
                    : null,
                endsAt: parsed.data.endsAt ? new Date(parsed.data.endsAt) : null,
            },
        });
        return NextResponse.json(banner, { status: 201 });
    } catch {
        return NextResponse.json(
            { error: "Failed to create banner" },
            { status: 500 },
        );
    }
}
