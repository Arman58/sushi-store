import { NextResponse } from "next/server";
import { z } from "zod";

import { validateBannerHref } from "@/lib/banner-href";
import { parseJsonBody } from "@/lib/parse-json-body";
import { prisma } from "@/lib/prisma";
import { verifyAdmin } from "@/lib/verify-admin";

const bannerPatchSchema = z
    .object({
        image: z.string().url().max(2048).optional(),
        title: z.record(z.string()).optional(),
        ctaText: z.record(z.string()).optional(),
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

    // Ссылку валидируем только если её прислали в патче.
    let normalizedHref: string | null | undefined;
    if (parsed.data.href !== undefined) {
        const href = validateBannerHref(parsed.data.href);
        if (!href.ok) {
            return NextResponse.json(
                { error: "Invalid banner href", code: href.code },
                { status: 400 },
            );
        }
        normalizedHref = href.value;
    }

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
                ...(parsed.data.ctaText !== undefined
                    ? { ctaText: parsed.data.ctaText }
                    : {}),
                ...(normalizedHref !== undefined
                    ? { href: normalizedHref }
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
    } catch (error) {
        console.error("[ADMIN BANNERS] update failed:", error);
        return NextResponse.json(
            {
                error:
                    process.env.NODE_ENV === "development" &&
                    error instanceof Error
                        ? error.message
                        : "Не удалось сохранить баннер",
            },
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
