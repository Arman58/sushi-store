import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { requireAuthenticatedUserId } from "@/lib/require-auth-user";
import {
    recalcProductRating,
    reviewBodySchema,
    serializeReview,
} from "@/lib/reviews";
import { verifyAdmin } from "@/lib/verify-admin";

function parseReviewId(idParam: string): number | null {
    const id = Number.parseInt(idParam, 10);
    if (Number.isNaN(id) || !Number.isInteger(id) || id < 1) return null;
    return id;
}

/** Редактирование собственного отзыва. */
export async function PATCH(
    request: Request,
    context: { params: Promise<{ id: string }> },
) {
    const authResult = await requireAuthenticatedUserId();
    if (authResult instanceof NextResponse) return authResult;
    const { userId } = authResult;

    const { id: idParam } = await context.params;
    const reviewId = parseReviewId(idParam);
    if (reviewId === null) {
        return NextResponse.json({ error: "Invalid review id" }, { status: 400 });
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
        const review = await prisma.review.findUnique({
            where: { id: reviewId },
            select: { id: true, userId: true, productId: true },
        });
        if (!review) {
            return NextResponse.json({ error: "Review not found" }, { status: 404 });
        }
        if (review.userId !== userId) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const updated = await prisma.$transaction(async (tx) => {
            const result = await tx.review.update({
                where: { id: reviewId },
                data: {
                    rating: parsed.data.rating,
                    text: parsed.data.text,
                },
                include: { user: { select: { name: true, email: true } } },
            });
            await recalcProductRating(tx, review.productId);
            return result;
        });

        const votedIds = new Set<number>();
        const vote = await prisma.reviewVote.findUnique({
            where: { reviewId_userId: { reviewId, userId } },
            select: { reviewId: true },
        });
        if (vote) votedIds.add(vote.reviewId);

        return NextResponse.json(serializeReview(updated, userId, votedIds));
    } catch {
        return NextResponse.json(
            { error: "Failed to update review" },
            { status: 500 },
        );
    }
}

/** Удаление: автор или администратор. */
export async function DELETE(
    request: Request,
    context: { params: Promise<{ id: string }> },
) {
    const { id: idParam } = await context.params;
    const reviewId = parseReviewId(idParam);
    if (reviewId === null) {
        return NextResponse.json({ error: "Invalid review id" }, { status: 400 });
    }

    try {
        const review = await prisma.review.findUnique({
            where: { id: reviewId },
            select: { id: true, userId: true, productId: true },
        });
        if (!review) {
            return NextResponse.json({ error: "Review not found" }, { status: 404 });
        }

        // Автор может удалить свой отзыв; администратор - любой (модерация).
        let allowed = false;
        const authResult = await requireAuthenticatedUserId();
        if (!(authResult instanceof NextResponse)) {
            allowed = authResult.userId === review.userId;
        }
        if (!allowed) {
            const admin = await verifyAdmin(request);
            allowed = admin.ok;
        }
        if (!allowed) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        await prisma.$transaction(async (tx) => {
            await tx.review.delete({ where: { id: reviewId } });
            await recalcProductRating(tx, review.productId);
        });

        return NextResponse.json({ ok: true });
    } catch {
        return NextResponse.json(
            { error: "Failed to delete review" },
            { status: 500 },
        );
    }
}
