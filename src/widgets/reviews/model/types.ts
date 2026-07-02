export type ReviewDto = {
    id: number;
    rating: number;
    text: string;
    verifiedPurchase: boolean;
    helpfulCount: number;
    createdAt: string;
    updatedAt: string;
    author: { name: string };
    isOwn: boolean;
    votedHelpful: boolean;
};

export type ReviewSummaryDto = {
    avg: number;
    count: number;
    /** Индекс 0 → 1 звезда … индекс 4 → 5 звёзд. */
    distribution: [number, number, number, number, number];
};

export type ReviewsResponse = {
    items: ReviewDto[];
    total: number;
    page: number;
    pageSize: number;
    summary: ReviewSummaryDto;
    myReview: ReviewDto | null;
};

export type ReviewSort = "new" | "helpful" | "rating_desc" | "rating_asc";
