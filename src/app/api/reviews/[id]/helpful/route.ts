import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { requireAuthenticatedUserId } from "@/lib/require-auth-user";

/** Тоггл «Полезно». Нельзя голосовать за собственный отзыв. */
export async function POST(
    _request: Request,
    context: { params: Promise<{ id: string }> },
) {
    const authResult = await requireAuthenticatedUserId();
    if (authResult instanceof NextResponse) return authResult;
    const { userId } = authResult;

    const { id: idParam } = await context.params;
    const reviewId = Number.parseInt(idParam, 10);
    if (Number.isNaN(reviewId) || reviewId < 1) {
        return NextResponse.json({ error: "Invalid review id" }, { status: 400 });
    }

    try {
        const review = await prisma.review.findUnique({
            where: { id: reviewId },
            select: { id: true, userId: true },
        });
        if (!review) {
            return NextResponse.json({ error: "Review not found" }, { status: 404 });
        }
        if (review.userId === userId) {
            return NextResponse.json(
                { error: "own_review" },
                { status: 400 },
            );
        }

        const existing = await prisma.reviewVote.findUnique({
            where: { reviewId_userId: { reviewId, userId } },
            select: { id: true },
        });

        const result = await prisma.$transaction(async (tx) => {
            if (existing) {
                await tx.reviewVote.delete({ where: { id: existing.id } });
                const updated = await tx.review.update({
                    where: { id: reviewId },
                    data: { helpfulCount: { decrement: 1 } },
                    select: { helpfulCount: true },
                });
                return { voted: false, helpfulCount: Math.max(0, updated.helpfulCount) };
            }
            await tx.reviewVote.create({ data: { reviewId, userId } });
            const updated = await tx.review.update({
                where: { id: reviewId },
                data: { helpfulCount: { increment: 1 } },
                select: { helpfulCount: true },
            });
            return { voted: true, helpfulCount: updated.helpfulCount };
        });

        return NextResponse.json(result);
    } catch {
        return NextResponse.json(
            { error: "Failed to vote" },
            { status: 500 },
        );
    }
}
