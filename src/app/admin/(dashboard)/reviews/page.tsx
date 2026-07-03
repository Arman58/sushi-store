"use client";

import DeleteIcon from "@mui/icons-material/Delete";
import RateReviewOutlinedIcon from "@mui/icons-material/RateReviewOutlined";
import StarIcon from "@mui/icons-material/Star";
import {
    Alert,
    Box,
    Button,
    Chip,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    IconButton,
    MenuItem,
    Paper,
    Rating,
    Skeleton,
    Stack,
    TextField,
    Typography,
} from "@mui/material";
import { useCallback, useEffect, useState } from "react";

import { getLocalizedField } from "@/lib/i18n-utils";
import { PageContainer, SectionTitle } from "@/shared/ui";
import { tokens } from "@/shared/ui/theme";

type AdminReview = {
    id: number;
    rating: number;
    text: string;
    verifiedPurchase: boolean;
    helpfulCount: number;
    createdAt: string;
    user: { name: string | null; email: string };
    product: { id: number; name: unknown; slug: string };
};

type AdminReviewsResponse = {
    items: AdminReview[];
    total: number;
    page: number;
    pageSize: number;
};

export default function AdminReviewsPage() {
    const [data, setData] = useState<AdminReviewsResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [rating, setRating] = useState<string>("all");
    const [page, setPage] = useState(1);
    const [deleting, setDeleting] = useState<AdminReview | null>(null);
    const [deleteBusy, setDeleteBusy] = useState(false);

    const load = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const params = new URLSearchParams({ page: String(page) });
            if (rating !== "all") params.set("rating", rating);
            const res = await fetch(
                `/api/admin/reviews?${params.toString()}`,
                { credentials: "same-origin" },
            );
            if (!res.ok) throw new Error();
            setData((await res.json()) as AdminReviewsResponse);
        } catch {
            setError("Не удалось загрузить отзывы.");
        } finally {
            setLoading(false);
        }
    }, [page, rating]);

    useEffect(() => {
        void load();
    }, [load]);

    const handleDelete = async () => {
        if (!deleting) return;
        setDeleteBusy(true);
        try {
            const res = await fetch(`/api/reviews/${deleting.id}`, {
                method: "DELETE",
                credentials: "same-origin",
            });
            if (!res.ok) throw new Error();
            setDeleting(null);
            await load();
        } catch {
            setError("Не удалось удалить отзыв.");
            setDeleting(null);
        } finally {
            setDeleteBusy(false);
        }
    };

    const totalPages = data ? Math.ceil(data.total / data.pageSize) : 0;

    return (
        <PageContainer>
            <Stack direction="row" alignItems="center" spacing={1.25} sx={{ mb: 2 }}>
                <RateReviewOutlinedIcon sx={{ color: tokens.brand }} />
                <SectionTitle pageTitle>Отзывы</SectionTitle>
            </Stack>

            <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 2, flexWrap: "wrap" }}>
                <TextField
                    select
                    size="small"
                    label="Оценка"
                    value={rating}
                    onChange={(e) => {
                        setRating(e.target.value);
                        setPage(1);
                    }}
                    sx={{ minWidth: 130 }}
                >
                    <MenuItem value="all">Все</MenuItem>
                    {[5, 4, 3, 2, 1].map((r) => (
                        <MenuItem key={r} value={String(r)}>
                            {r} ★
                        </MenuItem>
                    ))}
                </TextField>
                {data && (
                    <Typography variant="caption" color="text.secondary">
                        Всего: {data.total}
                    </Typography>
                )}
            </Stack>

            {error && (
                <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
                    {error}
                </Alert>
            )}

            {loading ? (
                <Stack spacing={1}>
                    {[0, 1, 2, 3].map((i) => (
                        <Skeleton key={i} variant="rounded" height={92} sx={{ borderRadius: 2 }} />
                    ))}
                </Stack>
            ) : !data || data.items.length === 0 ? (
                <Box sx={{ textAlign: "center", py: 6, border: `1px dashed ${tokens.borderHi}`, borderRadius: 2 }}>
                    <Typography fontWeight={700}>Отзывов нет</Typography>
                </Box>
            ) : (
                <Stack spacing={1}>
                    {data.items.map((review) => (
                        <Paper
                            key={review.id}
                            variant="outlined"
                            sx={{ p: 1.5, borderRadius: 2 }}
                        >
                            <Stack
                                direction="row"
                                spacing={1}
                                alignItems="flex-start"
                                justifyContent="space-between"
                            >
                                <Box sx={{ minWidth: 0, flex: 1 }}>
                                    <Stack direction="row" spacing={1} alignItems="center" sx={{ flexWrap: "wrap", rowGap: 0.5 }}>
                                        <Rating
                                            value={review.rating}
                                            readOnly
                                            size="small"
                                            icon={<StarIcon fontSize="inherit" />}
                                            sx={{ "& .MuiRating-iconFilled": { color: "#FFB800" } }}
                                        />
                                        <Typography variant="body2" fontWeight={700} noWrap>
                                            {getLocalizedField(review.product.name, "ru")}
                                        </Typography>
                                        {review.verifiedPurchase && (
                                            <Chip
                                                label="Покупка"
                                                size="small"
                                                sx={{
                                                    height: 20,
                                                    fontSize: 10,
                                                    fontWeight: 700,
                                                    bgcolor: tokens.brandDim,
                                                    color: "#1E8449",
                                                }}
                                            />
                                        )}
                                    </Stack>
                                    <Typography variant="caption" color="text.secondary">
                                        {review.user.name || review.user.email} ·{" "}
                                        {new Date(review.createdAt).toLocaleDateString("ru-RU")}
                                        {review.helpfulCount > 0
                                            ? ` · 👍 ${review.helpfulCount}`
                                            : ""}
                                    </Typography>
                                    {review.text && (
                                        <Typography
                                            variant="body2"
                                            sx={{
                                                mt: 0.5,
                                                color: tokens.textSecondary,
                                                whiteSpace: "pre-wrap",
                                                wordBreak: "break-word",
                                            }}
                                        >
                                            {review.text}
                                        </Typography>
                                    )}
                                </Box>
                                <IconButton
                                    size="small"
                                    color="error"
                                    onClick={() => setDeleting(review)}
                                    aria-label="Удалить отзыв"
                                >
                                    <DeleteIcon sx={{ fontSize: 18 }} />
                                </IconButton>
                            </Stack>
                        </Paper>
                    ))}

                    {totalPages > 1 && (
                        <Stack direction="row" spacing={1} justifyContent="center" sx={{ pt: 1 }}>
                            <Button
                                size="small"
                                disabled={page <= 1}
                                onClick={() => setPage((p) => p - 1)}
                            >
                                Назад
                            </Button>
                            <Typography variant="body2" sx={{ alignSelf: "center" }}>
                                {page} / {totalPages}
                            </Typography>
                            <Button
                                size="small"
                                disabled={page >= totalPages}
                                onClick={() => setPage((p) => p + 1)}
                            >
                                Вперёд
                            </Button>
                        </Stack>
                    )}
                </Stack>
            )}

            <Dialog
                open={deleting !== null}
                onClose={deleteBusy ? undefined : () => setDeleting(null)}
                maxWidth="xs"
                fullWidth
            >
                <DialogTitle>Удалить отзыв?</DialogTitle>
                <DialogContent>
                    <Typography variant="body2" color="text.secondary">
                        Отзыв будет удалён, рейтинг товара пересчитается.
                    </Typography>
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2 }}>
                    <Button onClick={() => setDeleting(null)} disabled={deleteBusy} color="inherit">
                        Отмена
                    </Button>
                    <Button
                        onClick={() => void handleDelete()}
                        color="error"
                        variant="contained"
                        disabled={deleteBusy}
                        sx={{ fontWeight: 700 }}
                    >
                        Удалить
                    </Button>
                </DialogActions>
            </Dialog>
        </PageContainer>
    );
}
