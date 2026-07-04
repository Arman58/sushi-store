import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { requireAuthenticatedUserId } from "@/lib/require-auth-user";
import {
    getReviewSummary,
    hasVerifiedPurchase,
    parseReviewSort,
    recalcProductRating,
    reviewBodySchema,
    type ReviewDto,
    serializeReview,
} from "@/lib/reviews";

const PAGE_SIZE_DEFAULT = 10;
const PAGE_SIZE_MAX = 50;

function parseProductId(idParam: string): number | null {
    const id = Number.parseInt(idParam, 10);
    if (Number.isNaN(id) || !Number.isInteger(id) || id < 1) return null;
    return id;
}

async function currentUserId(): Promise<number | null> {
    const session = await auth();
    const rawId = session?.user?.id;
    if (rawId == null || !Number.isFinite(Number(rawId))) return null;
    return Number(rawId);
}

/** Публичный список отзывов + сводка. Учитывает сортировку/фильтр/пагинацию. */
export async function GET(
    request: Request,
    context: { params: Promise<{ id: string }> },
) {
    const { id: idParam } = await context.params;
    const productId = parseProductId(idParam);
    if (productId === null) {
        return NextResponse.json({ error: "Invalid product id" }, { status: 400 });
    }

    const url = new URL(request.url);
    const sort = parseReviewSort(url.searchParams.get("sort"));
    const ratingRaw = url.searchParams.get("rating");
    const rating = ratingRaw ? Number.parseInt(ratingRaw, 10) : null;
    const ratingFilter =
        rating !== null && rating >= 1 && rating <= 5 ? rating : null;

    const page = Math.max(
        1,
        Number.parseInt(url.searchParams.get("page") ?? "1", 10) || 1,
    );
    const pageSize = Math.min(
        PAGE_SIZE_MAX,
        Math.max(
            1,
            Number.parseInt(
                url.searchParams.get("pageSize") ?? String(PAGE_SIZE_DEFAULT),
                10,
            ) || PAGE_SIZE_DEFAULT,
        ),
    );

    const where = {
        productId,
        ...(ratingFilter !== null ? { rating: ratingFilter } : {}),
    };

    const orderBy =
        sort === "helpful"
            ? [{ helpfulCount: "desc" as const }, { createdAt: "desc" as const }]
            : sort === "rating_desc"
              ? [{ rating: "desc" as const }, { createdAt: "desc" as const }]
              : sort === "rating_asc"
                ? [{ rating: "asc" as const }, { createdAt: "desc" as const }]
                : [{ createdAt: "desc" as const }];

    try {
        const product = await prisma.product.findUnique({
            where: { id: productId },
            select: { id: true, isActive: true },
        });
        if (!product || !product.isActive) {
            return NextResponse.json(
                { error: "Product not found" },
                { status: 404 },
            );
        }

        const userId = await currentUserId();

        const [items, total, summary, myReviewRaw] = await Promise.all([
            prisma.review.findMany({
                where,
                orderBy,
                skip: (page - 1) * pageSize,
                take: pageSize,
                include: { user: { select: { name: true, email: true } } },
            }),
            prisma.review.count({ where }),
            getReviewSummary(productId),
            userId !== null
                ? prisma.review.findUnique({
                      where: {
                          productId_userId: { productId, userId },
                      },
                      include: {
                          user: { select: { name: true, email: true } },
                      },
                  })
                : Promise.resolve(null),
        ]);

        const votedIds = new Set<number>();
        if (userId !== null && items.length > 0) {
            const votes = await prisma.reviewVote.findMany({
                where: {
                    userId,
                    reviewId: { in: items.map((r) => r.id) },
                },
                select: { reviewId: true },
            });
            for (const v of votes) votedIds.add(v.reviewId);
        }

        const myReview: ReviewDto | null = myReviewRaw
            ? serializeReview(myReviewRaw, userId, votedIds)
            : null;

        return NextResponse.json({
            items: items.map((r) => serializeReview(r, userId, votedIds)),
            total,
            page,
            pageSize,
            summary,
            myReview,
        });
    } catch {
        return NextResponse.json(
            { error: "Failed to load reviews" },
            { status: 500 },
        );
    }
}

/** Создание отзыва (один на товар от пользователя). */
export async function POST(
    request: Request,
    context: { params: Promise<{ id: string }> },
) {
    const authResult = await requireAuthenticatedUserId();
    if (authResult instanceof NextResponse) return authResult;
    const { userId } = authResult;

    const { id: idParam } = await context.params;
    const productId = parseProductId(idParam);
    if (productId === null) {
        return NextResponse.json({ error: "Invalid product id" }, { status: 400 });
    }

    let body: unknown;
    try {
        body = await request.json();
    } catch {
        return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const parsed = reviewBodySchema.safeParse(body);
    if (!parsed.success) {
        return NextResponse.json(
            { error: "Validation failed", details: parsed.error.flatten() },
            { status: 400 },
        );
    }

    try {
        const product = await prisma.product.findUnique({
            where: { id: productId },
            select: { id: true, isActive: true },
        });
        if (!product || !product.isActive) {
            return NextResponse.json(
                { error: "Product not found" },
                { status: 404 },
            );
        }

        const existing = await prisma.review.findUnique({
            where: { productId_userId: { productId, userId } },
            select: { id: true },
        });
        if (existing) {
            return NextResponse.json(
                { error: "already_reviewed", reviewId: existing.id },
                { status: 409 },
            );
        }

        const verifiedPurchase = await hasVerifiedPurchase(userId, productId);

        const created = await prisma.$transaction(async (tx) => {
            const review = await tx.review.create({
                data: {
                    productId,
                    userId,
                    rating: parsed.data.rating,
                    text: parsed.data.text,
                    verifiedPurchase,
                },
                include: { user: { select: { name: true, email: true } } },
            });
            await recalcProductRating(tx, productId);
            return review;
        });

        return NextResponse.json(
            serializeReview(created, userId, new Set()),
            { status: 201 },
        );
    } catch {
        return NextResponse.json(
            { error: "Failed to create review" },
            { status: 500 },
        );
    }
}
