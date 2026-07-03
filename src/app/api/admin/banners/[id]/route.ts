import { NextResponse } from "next/server";
import { z } from "zod";

import { parseJsonBody } from "@/lib/parse-json-body";
import { prisma } from "@/lib/prisma";
import { verifyAdmin } from "@/lib/verify-admin";

const bannerPatchSchema = z
    .object({
        image: z.string().url().max(2048).optional(),
        title: z.record(z.string()).optional(),
        href: z.string().max(2048).nullable().optional(),
        isActive: z.boolean().optional(),
        position: z.number().int().min(0).optional(),
        startsAt: z.string().datetime().nullable().optional(),
        endsAt: z.string().datetime().nullable().optional(),
    })
    .refine((d) => Object.keys(d).length > 0, "Nothing to update");

function parseId(idParam: string): number | null {
    const id = Number.parseInt(idParam, 10);
    return Number.isInteger(id) && id > 0 ? id : null;
}

export async function PATCH(
    request: Request,
    context: { params: Promise<{ id: string }> },
) {
    const auth = await verifyAdmin(request);
    if (!auth.ok) return auth.response;

    const { id: idParam } = await context.params;
    const id = parseId(idParam);
    if (id === null) {
        return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    }

    const parsed = await parseJsonBody(request, bannerPatchSchema);
    if (!parsed.ok) return parsed.response;

    try {
        const banner = await prisma.banner.update({
            where: { id },
            data: {
                ...(parsed.data.image !== undefined
                    ? { image: parsed.data.image }
                    : {}),
                ...(parsed.data.title !== undefined
                    ? { title: parsed.data.title }
                    : {}),
                ...(parsed.data.href !== undefined
                    ? { href: parsed.data.href }
                    : {}),
                ...(parsed.data.isActive !== undefined
                    ? { isActive: parsed.data.isActive }
                    : {}),
                ...(parsed.data.position !== undefined
                    ? { position: parsed.data.position }
                    : {}),
                ...(parsed.data.startsAt !== undefined
                    ? {
                          startsAt: parsed.data.startsAt
                              ? new Date(parsed.data.startsAt)
                              : null,
                      }
                    : {}),
                ...(parsed.data.endsAt !== undefined
                    ? {
                          endsAt: parsed.data.endsAt
                              ? new Date(parsed.data.endsAt)
                              : null,
                      }
                    : {}),
            },
        });
        return NextResponse.json(banner);
    } catch {
        return NextResponse.json(
            { error: "Failed to update banner" },
            { status: 500 },
        );
    }
}

export async function DELETE(
    request: Request,
    context: { params: Promise<{ id: string }> },
) {
    const auth = await verifyAdmin(request);
    if (!auth.ok) return auth.response;

    const { id: idParam } = await context.params;
    const id = parseId(idParam);
    if (id === null) {
        return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    }

    try {
        await prisma.banner.delete({ where: { id } });
        return NextResponse.json({ ok: true });
    } catch {
        return NextResponse.json(
            { error: "Failed to delete banner" },
            { status: 500 },
        );
    }
}
