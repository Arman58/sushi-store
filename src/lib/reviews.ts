import { z } from "zod";

import { prisma } from "@/lib/prisma";

// ─── Validation ───────────────────────────────────────────────────────────────

export const REVIEW_TEXT_MAX = 2000;

export const reviewBodySchema = z.object({
    rating: z.number().int().min(1).max(5),
    text: z
        .string()
        .trim()
        .max(REVIEW_TEXT_MAX)
        .optional()
        .default(""),
});

export type ReviewBody = z.infer<typeof reviewBodySchema>;

export const REVIEW_SORTS = ["new", "helpful", "rating_desc", "rating_asc"] as const;
export type ReviewSort = (typeof REVIEW_SORTS)[number];

export function parseReviewSort(value: string | null): ReviewSort {
    return REVIEW_SORTS.includes(value as ReviewSort)
        ? (value as ReviewSort)
        : "new";
}

// ─── DTOs ─────────────────────────────────────────────────────────────────────

export type ReviewAuthorDto = {
    name: string;
};

export type ReviewDto = {
    id: number;
    rating: number;
    text: string;
    verifiedPurchase: boolean;
    helpfulCount: number;
    createdAt: string;
    updatedAt: string;
    author: ReviewAuthorDto;
    /** Отзыв текущего пользователя. */
    isOwn: boolean;
    /** Текущий пользователь голосовал «Полезно». */
    votedHelpful: boolean;
};

export type ReviewSummaryDto = {
    avg: number;
    count: number;
    /** Кол-во отзывов по каждой оценке: индекс 0 → 1 звезда … индекс 4 → 5 звёзд. */
    distribution: [number, number, number, number, number];
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Имя автора для витрины: имя пользователя или маскированный email («an***»). */
export function displayAuthorName(user: {
    name: string | null;
    email: string;
}): string {
    const name = user.name?.trim();
    if (name) return name;
    const local = user.email.split("@")[0] ?? "";
    if (local.length <= 2) return `${local}***`;
    return `${local.slice(0, 2)}***`;
}

type ReviewWithUser = {
    id: number;
    userId: number;
    rating: number;
    text: string;
    verifiedPurchase: boolean;
    helpfulCount: number;
    createdAt: Date;
    updatedAt: Date;
    user: { name: string | null; email: string };
};

export function serializeReview(
    review: ReviewWithUser,
    currentUserId: number | null,
    votedReviewIds: ReadonlySet<number>,
): ReviewDto {
    return {
        id: review.id,
        rating: review.rating,
        text: review.text,
        verifiedPurchase: review.verifiedPurchase,
        helpfulCount: review.helpfulCount,
        createdAt: review.createdAt.toISOString(),
        updatedAt: review.updatedAt.toISOString(),
        author: { name: displayAuthorName(review.user) },
        isOwn: currentUserId !== null && review.userId === currentUserId,
        votedHelpful: votedReviewIds.has(review.id),
    };
}

// ─── Business logic ───────────────────────────────────────────────────────────

/**
 * Пересчитывает денормализованные ratingAvg / ratingCount у товара.
 * Вызывать внутри той же транзакции, что и изменение отзывов.
 */
export async function recalcProductRating(
    tx: Pick<typeof prisma, "review" | "product">,
    productId: number,
): Promise<void> {
    const agg = await tx.review.aggregate({
        where: { productId },
        _avg: { rating: true },
        _count: { _all: true },
    });

    await tx.product.update({
        where: { id: productId },
        data: {
            ratingAvg: Math.round((agg._avg.rating ?? 0) * 10) / 10,
            ratingCount: agg._count._all,
        },
    });
}

/** true - у пользователя есть доставленный заказ с этим товаром. */
export async function hasVerifiedPurchase(
    userId: number,
    productId: number,
): Promise<boolean> {
    const order = await prisma.order.findFirst({
        where: {
            userId,
            status: "DONE",
            items: { some: { productId } },
        },
        select: { id: true },
    });
    return order !== null;
}

/** Сводка рейтинга с распределением по звёздам. */
export async function getReviewSummary(
    productId: number,
): Promise<ReviewSummaryDto> {
    const grouped = await prisma.review.groupBy({
        by: ["rating"],
        where: { productId },
        _count: { _all: true },
    });

    const distribution: [number, number, number, number, number] = [
        0, 0, 0, 0, 0,
    ];
    let total = 0;
    let weighted = 0;
    for (const row of grouped) {
        const idx = row.rating - 1;
        if (idx >= 0 && idx < 5) {
            distribution[idx] = row._count._all;
            total += row._count._all;
            weighted += row.rating * row._count._all;
        }
    }

    return {
        avg: total > 0 ? Math.round((weighted / total) * 10) / 10 : 0,
        count: total,
        distribution,
    };
}
