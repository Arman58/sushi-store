"use client";

import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import RateReviewOutlinedIcon from "@mui/icons-material/RateReviewOutlined";
import StarIcon from "@mui/icons-material/Star";
import ThumbUpAltOutlinedIcon from "@mui/icons-material/ThumbUpAltOutlined";
import ThumbUpAltRoundedIcon from "@mui/icons-material/ThumbUpAltRounded";
import VerifiedIcon from "@mui/icons-material/Verified";
import Avatar from "@mui/material/Avatar";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import LinearProgress from "@mui/material/LinearProgress";
import MenuItem from "@mui/material/MenuItem";
import Rating from "@mui/material/Rating";
import Skeleton from "@mui/material/Skeleton";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import dynamic from "next/dynamic";
import { useSession } from "next-auth/react";
import { useLocale, useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useState } from "react";

import { useCartStore } from "@/features/cart";
import { tokens } from "@/shared/ui/theme";

import type {
    ReviewDto,
    ReviewSort,
    ReviewsResponse,
    ReviewSummaryDto,
} from "../model/types";
import { ReviewFormDialog, type ReviewFormValues } from "./review-form-dialog";

const LoginDialog = dynamic(
    () => import("@/features/auth/ui/login-dialog").then((m) => m.LoginDialog),
    { ssr: false },
);

const PAGE_SIZE = 10;

type Props = {
    productId: number;
};

// ─── Summary block ────────────────────────────────────────────────────────────

function RatingSummary({
    summary,
    activeRating,
    onRatingFilter,
}: {
    summary: ReviewSummaryDto;
    activeRating: number | null;
    onRatingFilter: (rating: number | null) => void;
}) {
    const t = useTranslations("reviews");

    return (
        <Box
            sx={{
                display: "flex",
                flexDirection: { xs: "column", sm: "row" },
                gap: { xs: 2, sm: 4 },
                p: { xs: 2, sm: 2.5 },
                borderRadius: `${tokens.radiusCardLg}px`,
                border: `1px solid ${tokens.border}`,
                bgcolor: tokens.surfaceHi,
                mb: 2.5,
            }}
        >
            {/* Average */}
            <Box
                sx={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: { xs: "flex-start", sm: "center" },
                    justifyContent: "center",
                    minWidth: 120,
                    gap: 0.5,
                }}
            >
                <Typography
                    sx={{
                        fontWeight: 900,
                        fontSize: "2.5rem",
                        lineHeight: 1,
                        letterSpacing: -1,
                    }}
                >
                    {summary.avg.toFixed(1)}
                </Typography>
                <Rating
                    value={summary.avg}
                    precision={0.1}
                    readOnly
                    size="small"
                    sx={{ "& .MuiRating-iconFilled": { color: "#FFB800" } }}
                />
                <Typography variant="caption" sx={{ color: tokens.textMuted }}>
                    {t("summary.count", { count: summary.count })}
                </Typography>
            </Box>

            {/* Distribution bars: 5 → 1, кликабельны как фильтр */}
            <Box sx={{ flex: 1, minWidth: 0 }}>
                {[5, 4, 3, 2, 1].map((star) => {
                    const count = summary.distribution[star - 1] ?? 0;
                    const percent =
                        summary.count > 0 ? (count / summary.count) * 100 : 0;
                    const isActive = activeRating === star;

                    return (
                        <Box
                            key={star}
                            component="button"
                            type="button"
                            onClick={() =>
                                onRatingFilter(isActive ? null : star)
                            }
                            aria-pressed={isActive}
                            aria-label={t("summary.filter_by_star", { star })}
                            sx={{
                                display: "flex",
                                alignItems: "center",
                                gap: 1,
                                width: "100%",
                                py: 0.4,
                                px: 0.5,
                                border: "none",
                                borderRadius: 1.5,
                                bgcolor: isActive
                                    ? tokens.brandDim
                                    : "transparent",
                                cursor: "pointer",
                                transition: "background-color 0.15s ease",
                                "&:hover": { bgcolor: tokens.brandDim },
                            }}
                        >
                            <Typography
                                variant="caption"
                                sx={{
                                    minWidth: 12,
                                    fontWeight: 700,
                                    color: tokens.textSecondary,
                                }}
                            >
                                {star}
                            </Typography>
                            <StarIcon sx={{ fontSize: 13, color: "#FFB800" }} />
                            <LinearProgress
                                variant="determinate"
                                value={percent}
                                sx={{
                                    flex: 1,
                                    height: 8,
                                    borderRadius: 999,
                                    bgcolor: tokens.surfaceHi,
                                    "& .MuiLinearProgress-bar": {
                                        bgcolor: "#FFB800",
                                        borderRadius: 999,
                                    },
                                }}
                            />
                            <Typography
                                variant="caption"
                                sx={{
                                    minWidth: 28,
                                    textAlign: "right",
                                    color: tokens.textMuted,
                                    fontVariantNumeric: "tabular-nums",
                                }}
                            >
                                {count}
                            </Typography>
                        </Box>
                    );
                })}
            </Box>
        </Box>
    );
}

// ─── Review item ──────────────────────────────────────────────────────────────

function ReviewItem({
    review,
    locale,
    onEdit,
    onDelete,
    onHelpful,
}: {
    review: ReviewDto;
    locale: string;
    onEdit: () => void;
    onDelete: () => void;
    onHelpful: () => void;
}) {
    const t = useTranslations("reviews");

    const dateLabel = useMemo(() => {
        try {
            return new Intl.DateTimeFormat(locale, {
                day: "numeric",
                month: "long",
                year: "numeric",
            }).format(new Date(review.createdAt));
        } catch {
            return review.createdAt.slice(0, 10);
        }
    }, [locale, review.createdAt]);

    return (
        <Box
            component="li"
            sx={{
                listStyle: "none",
                py: 2,
                borderBottom: `1px solid ${tokens.border}`,
                "&:last-of-type": { borderBottom: "none" },
            }}
        >
            <Stack direction="row" spacing={1.5} alignItems="flex-start">
                <Avatar
                    sx={{
                        width: 40,
                        height: 40,
                        bgcolor: review.isOwn ? tokens.brand : tokens.surfaceHi,
                        color: review.isOwn ? "#FFF" : tokens.textSecondary,
                        fontWeight: 700,
                        fontSize: 16,
                    }}
                >
                    {review.author.name.charAt(0).toUpperCase()}
                </Avatar>

                <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Stack
                        direction="row"
                        alignItems="center"
                        spacing={1}
                        sx={{ flexWrap: "wrap", rowGap: 0.5 }}
                    >
                        <Typography variant="body2" fontWeight={700}>
                            {review.isOwn
                                ? t("item.you", { name: review.author.name })
                                : review.author.name}
                        </Typography>
                        {review.verifiedPurchase && (
                            <Chip
                                icon={<VerifiedIcon sx={{ fontSize: 14 }} />}
                                label={t("item.verified")}
                                size="small"
                                sx={{
                                    height: 22,
                                    fontSize: 11,
                                    fontWeight: 700,
                                    bgcolor: tokens.brandDim,
                                    color: "#1E8449",
                                    "& .MuiChip-icon": { color: "#1E8449" },
                                }}
                            />
                        )}
                    </Stack>

                    <Stack
                        direction="row"
                        alignItems="center"
                        spacing={1}
                        sx={{ mt: 0.25 }}
                    >
                        <Rating
                            value={review.rating}
                            readOnly
                            size="small"
                            sx={{
                                fontSize: 16,
                                "& .MuiRating-iconFilled": { color: "#FFB800" },
                            }}
                        />
                        <Typography
                            variant="caption"
                            sx={{ color: tokens.textMuted }}
                        >
                            {dateLabel}
                        </Typography>
                    </Stack>

                    {review.text && (
                        <Typography
                            variant="body2"
                            sx={{
                                mt: 1,
                                color: tokens.textSecondary,
                                lineHeight: 1.6,
                                whiteSpace: "pre-wrap",
                                wordBreak: "break-word",
                            }}
                        >
                            {review.text}
                        </Typography>
                    )}

                    <Stack
                        direction="row"
                        alignItems="center"
                        spacing={1}
                        sx={{ mt: 1.25 }}
                    >
                        {review.isOwn ? (
                            <>
                                <Button
                                    size="small"
                                    startIcon={
                                        <EditOutlinedIcon
                                            sx={{ fontSize: 16 }}
                                        />
                                    }
                                    onClick={onEdit}
                                    sx={{
                                        fontWeight: 700,
                                        fontSize: 12,
                                        color: tokens.brand,
                                        minHeight: 36,
                                    }}
                                >
                                    {t("item.edit")}
                                </Button>
                                <Button
                                    size="small"
                                    startIcon={
                                        <DeleteOutlineIcon
                                            sx={{ fontSize: 16 }}
                                        />
                                    }
                                    onClick={onDelete}
                                    sx={{
                                        fontWeight: 700,
                                        fontSize: 12,
                                        color: "#E74C3C",
                                        minHeight: 36,
                                    }}
                                >
                                    {t("item.delete")}
                                </Button>
                            </>
                        ) : (
                            <Button
                                size="small"
                                startIcon={
                                    review.votedHelpful ? (
                                        <ThumbUpAltRoundedIcon
                                            sx={{ fontSize: 16 }}
                                        />
                                    ) : (
                                        <ThumbUpAltOutlinedIcon
                                            sx={{ fontSize: 16 }}
                                        />
                                    )
                                }
                                onClick={onHelpful}
                                aria-pressed={review.votedHelpful}
                                sx={{
                                    fontWeight: 700,
                                    fontSize: 12,
                                    minHeight: 36,
                                    color: review.votedHelpful
                                        ? tokens.brand
                                        : tokens.textMuted,
                                }}
                            >
                                {t("item.helpful")}
                                {review.helpfulCount > 0
                                    ? ` (${review.helpfulCount})`
                                    : ""}
                            </Button>
                        )}
                    </Stack>
                </Box>
            </Stack>
        </Box>
    );
}

// ─── Section ──────────────────────────────────────────────────────────────────

export function ProductReviewsSection({ productId }: Props) {
    const t = useTranslations("reviews");
    const locale = useLocale();
    const { status } = useSession();
    const isAuthenticated = status === "authenticated";
    const showAppToast = useCartStore((s) => s.showAppToast);

    const [data, setData] = useState<ReviewsResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [sort, setSort] = useState<ReviewSort>("new");
    const [ratingFilter, setRatingFilter] = useState<number | null>(null);

    const [formOpen, setFormOpen] = useState(false);
    const [formMode, setFormMode] = useState<"create" | "edit">("create");
    /** Инкремент на каждое открытие - ремоунт формы со свежим state. */
    const [formSession, setFormSession] = useState(0);
    const [submitting, setSubmitting] = useState(false);
    const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
    const [loginOpen, setLoginOpen] = useState(false);

    const buildUrl = useCallback(
        (page: number) => {
            const params = new URLSearchParams({
                sort,
                page: String(page),
                pageSize: String(PAGE_SIZE),
            });
            if (ratingFilter !== null) params.set("rating", String(ratingFilter));
            return `/api/products/${productId}/reviews?${params.toString()}`;
        },
        [productId, sort, ratingFilter],
    );

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch(buildUrl(1));
            if (!res.ok) throw new Error();
            const json = (await res.json()) as ReviewsResponse;
            setData(json);
        } catch {
            setData(null);
        } finally {
            setLoading(false);
        }
    }, [buildUrl]);

    useEffect(() => {
        void load();
    }, [load]);

    const loadMore = async () => {
        if (!data) return;
        setLoadingMore(true);
        try {
            const res = await fetch(buildUrl(data.page + 1));
            if (!res.ok) throw new Error();
            const json = (await res.json()) as ReviewsResponse;
            setData({
                ...json,
                items: [...data.items, ...json.items],
            });
        } catch {
            showAppToast(t("toast.load_error"), "error");
        } finally {
            setLoadingMore(false);
        }
    };

    const openCreateForm = () => {
        if (!isAuthenticated) {
            setLoginOpen(true);
            return;
        }
        setFormMode("create");
        setFormSession((n) => n + 1);
        setFormOpen(true);
    };

    const openEditForm = () => {
        setFormMode("edit");
        setFormSession((n) => n + 1);
        setFormOpen(true);
    };

    const handleSubmit = async (values: ReviewFormValues) => {
        setSubmitting(true);
        try {
            const res =
                formMode === "create"
                    ? await fetch(`/api/products/${productId}/reviews`, {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify(values),
                      })
                    : await fetch(`/api/reviews/${data?.myReview?.id}`, {
                          method: "PATCH",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify(values),
                      });

            if (!res.ok) throw new Error();
            setFormOpen(false);
            showAppToast(
                formMode === "create"
                    ? t("toast.created")
                    : t("toast.updated"),
                "success",
            );
            await load();
        } catch {
            showAppToast(t("toast.save_error"), "error");
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async () => {
        if (!data?.myReview) return;
        setSubmitting(true);
        try {
            const res = await fetch(`/api/reviews/${data.myReview.id}`, {
                method: "DELETE",
            });
            if (!res.ok) throw new Error();
            setDeleteConfirmOpen(false);
            showAppToast(t("toast.deleted"), "success");
            await load();
        } catch {
            showAppToast(t("toast.save_error"), "error");
        } finally {
            setSubmitting(false);
        }
    };

    const handleHelpful = async (review: ReviewDto) => {
        if (!isAuthenticated) {
            setLoginOpen(true);
            return;
        }
        // Оптимистичное обновление
        setData((prev) =>
            prev
                ? {
                      ...prev,
                      items: prev.items.map((r) =>
                          r.id === review.id
                              ? {
                                    ...r,
                                    votedHelpful: !r.votedHelpful,
                                    helpfulCount:
                                        r.helpfulCount +
                                        (r.votedHelpful ? -1 : 1),
                                }
                              : r,
                      ),
                  }
                : prev,
        );
        try {
            const res = await fetch(`/api/reviews/${review.id}/helpful`, {
                method: "POST",
            });
            if (!res.ok) throw new Error();
        } catch {
            // Откат
            setData((prev) =>
                prev
                    ? {
                          ...prev,
                          items: prev.items.map((r) =>
                              r.id === review.id ? review : r,
                          ),
                      }
                    : prev,
            );
            showAppToast(t("toast.vote_error"), "error");
        }
    };

    const summary = data?.summary;
    const items = data?.items ?? [];
    const hasMore = data ? data.items.length < data.total : false;
    const canWrite = !data?.myReview;

    return (
        <Box component="section" sx={{ mt: 5 }} aria-label={t("title")}>
            {/* Header */}
            <Stack
                direction="row"
                alignItems="center"
                justifyContent="space-between"
                sx={{ mb: 2, gap: 1, flexWrap: "wrap" }}
            >
                <Typography
                    component="h2"
                    sx={{
                        fontWeight: 800,
                        fontSize: { xs: "1.25rem", sm: "1.5rem" },
                        letterSpacing: -0.5,
                    }}
                >
                    {t("title")}
                    {summary && summary.count > 0 ? ` (${summary.count})` : ""}
                </Typography>

                {canWrite && (
                    <Button
                        variant="contained"
                        size="small"
                        startIcon={<RateReviewOutlinedIcon />}
                        onClick={openCreateForm}
                        sx={{ fontWeight: 800, borderRadius: "10px" }}
                    >
                        {t("write")}
                    </Button>
                )}
            </Stack>

            {/* Loading */}
            {loading && (
                <Box>
                    <Skeleton
                        variant="rounded"
                        height={140}
                        sx={{ mb: 2, borderRadius: `${tokens.radiusCardLg}px` }}
                    />
                    {[0, 1, 2].map((i) => (
                        <Skeleton
                            key={i}
                            variant="rounded"
                            height={88}
                            sx={{ mb: 1.5, borderRadius: 2 }}
                        />
                    ))}
                </Box>
            )}

            {!loading && summary && summary.count > 0 && (
                <RatingSummary
                    summary={summary}
                    activeRating={ratingFilter}
                    onRatingFilter={setRatingFilter}
                />
            )}

            {/* Controls */}
            {!loading && summary && summary.count > 1 && (
                <Stack
                    direction="row"
                    alignItems="center"
                    spacing={1.5}
                    sx={{ mb: 1, flexWrap: "wrap", rowGap: 1 }}
                >
                    <TextField
                        select
                        size="small"
                        value={sort}
                        onChange={(e) => setSort(e.target.value as ReviewSort)}
                        aria-label={t("sort.label")}
                        sx={{ minWidth: 190 }}
                    >
                        <MenuItem value="new">{t("sort.new")}</MenuItem>
                        <MenuItem value="helpful">{t("sort.helpful")}</MenuItem>
                        <MenuItem value="rating_desc">
                            {t("sort.rating_desc")}
                        </MenuItem>
                        <MenuItem value="rating_asc">
                            {t("sort.rating_asc")}
                        </MenuItem>
                    </TextField>

                    {ratingFilter !== null && (
                        <Chip
                            label={t("filter.stars", { star: ratingFilter })}
                            onDelete={() => setRatingFilter(null)}
                            size="small"
                            sx={{
                                fontWeight: 700,
                                bgcolor: tokens.brandDim,
                                color: "#1E8449",
                            }}
                        />
                    )}
                </Stack>
            )}

            {/* Empty state */}
            {!loading && (!summary || summary.count === 0) && (
                <Box
                    sx={{
                        textAlign: "center",
                        py: 5,
                        px: 2,
                        borderRadius: `${tokens.radiusCardLg}px`,
                        border: `1px dashed ${tokens.borderHi}`,
                    }}
                >
                    <RateReviewOutlinedIcon
                        sx={{ fontSize: 40, color: tokens.textMuted, mb: 1 }}
                    />
                    <Typography fontWeight={700} sx={{ mb: 0.5 }}>
                        {t("empty.title")}
                    </Typography>
                    <Typography
                        variant="body2"
                        sx={{ color: tokens.textMuted, mb: 2 }}
                    >
                        {t("empty.hint")}
                    </Typography>
                    <Button
                        variant="outlined"
                        onClick={openCreateForm}
                        sx={{ fontWeight: 700, borderRadius: "10px" }}
                    >
                        {t("empty.cta")}
                    </Button>
                </Box>
            )}

            {/* Filtered empty */}
            {!loading &&
                summary &&
                summary.count > 0 &&
                items.length === 0 && (
                    <Typography
                        variant="body2"
                        sx={{ color: tokens.textMuted, py: 3, textAlign: "center" }}
                    >
                        {t("filter.no_results")}
                    </Typography>
                )}

            {/* List */}
            {!loading && items.length > 0 && (
                <Box component="ul" sx={{ m: 0, p: 0 }}>
                    {items.map((review) => (
                        <ReviewItem
                            key={review.id}
                            review={review}
                            locale={locale}
                            onEdit={openEditForm}
                            onDelete={() => setDeleteConfirmOpen(true)}
                            onHelpful={() => void handleHelpful(review)}
                        />
                    ))}
                </Box>
            )}

            {/* Load more */}
            {!loading && hasMore && (
                <Box sx={{ textAlign: "center", mt: 1 }}>
                    <Button
                        variant="outlined"
                        onClick={() => void loadMore()}
                        disabled={loadingMore}
                        sx={{ fontWeight: 700, borderRadius: "10px", minWidth: 180 }}
                    >
                        {loadingMore ? t("loading_more") : t("load_more")}
                    </Button>
                </Box>
            )}

            {/* Dialogs */}
            <ReviewFormDialog
                key={`${formMode}-${formSession}`}
                open={formOpen}
                mode={formMode}
                initial={
                    formMode === "edit" && data?.myReview
                        ? {
                              rating: data.myReview.rating,
                              text: data.myReview.text,
                          }
                        : undefined
                }
                submitting={submitting}
                onClose={() => setFormOpen(false)}
                onSubmit={(values) => void handleSubmit(values)}
            />

            <Dialog
                open={deleteConfirmOpen}
                onClose={submitting ? undefined : () => setDeleteConfirmOpen(false)}
                maxWidth="xs"
                fullWidth
            >
                <DialogTitle>{t("delete_confirm.title")}</DialogTitle>
                <DialogContent>
                    <Typography variant="body2" sx={{ color: tokens.textSecondary }}>
                        {t("delete_confirm.text")}
                    </Typography>
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2 }}>
                    <Button
                        onClick={() => setDeleteConfirmOpen(false)}
                        disabled={submitting}
                        color="inherit"
                        sx={{ fontWeight: 600 }}
                    >
                        {t("form.cancel")}
                    </Button>
                    <Button
                        onClick={() => void handleDelete()}
                        color="error"
                        variant="contained"
                        disabled={submitting}
                        sx={{ fontWeight: 800 }}
                    >
                        {t("item.delete")}
                    </Button>
                </DialogActions>
            </Dialog>

            <LoginDialog open={loginOpen} onClose={() => setLoginOpen(false)} />
        </Box>
    );
}
