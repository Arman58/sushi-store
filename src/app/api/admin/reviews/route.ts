import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { verifyAdmin } from "@/lib/verify-admin";

const PAGE_SIZE = 30;

/** Все отзывы для модерации: фильтр по оценке, пагинация. */
export async function GET(request: Request) {
    const auth = await verifyAdmin(request);
    if (!auth.ok) return auth.response;

    const url = new URL(request.url);
    const page = Math.max(
        1,
        Number.parseInt(url.searchParams.get("page") ?? "1", 10) || 1,
    );
    const ratingRaw = Number.parseInt(url.searchParams.get("rating") ?? "", 10);
    const rating = ratingRaw >= 1 && ratingRaw <= 5 ? ratingRaw : null;
    const where = rating !== null ? { rating } : {};

    try {
        const [items, total] = await Promise.all([
            prisma.review.findMany({
                where,
                orderBy: { createdAt: "desc" },
                skip: (page - 1) * PAGE_SIZE,
                take: PAGE_SIZE,
                include: {
                    user: { select: { name: true, email: true } },
                    product: { select: { id: true, translations: true, slug: true } },
                },
            }),
            prisma.review.count({ where }),
        ]);

        return NextResponse.json({ items, total, page, pageSize: PAGE_SIZE });
    } catch {
        return NextResponse.json(
            { error: "Failed to load reviews" },
            { status: 500 },
        );
    }
}
