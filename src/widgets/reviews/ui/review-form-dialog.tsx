"use client";

import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import Rating from "@mui/material/Rating";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { tokens } from "@/shared/ui/theme";

const TEXT_MAX = 2000;

export type ReviewFormValues = { rating: number; text: string };

type Props = {
    open: boolean;
    mode: "create" | "edit";
    initial?: ReviewFormValues;
    submitting: boolean;
    onClose: () => void;
    onSubmit: (values: ReviewFormValues) => void;
};

export function ReviewFormDialog({
    open,
    mode,
    initial,
    submitting,
    onClose,
    onSubmit,
}: Props) {
    const t = useTranslations("reviews");

    // Родитель ремоунтит диалог через key при каждом открытии,
    // поэтому state инициализируется из props без эффектов.
    const [rating, setRating] = useState<number | null>(initial?.rating ?? null);
    const [text, setText] = useState(initial?.text ?? "");
    const [ratingError, setRatingError] = useState(false);

    const handleSubmit = () => {
        if (!rating || rating < 1) {
            setRatingError(true);
            return;
        }
        onSubmit({ rating, text: text.trim().slice(0, TEXT_MAX) });
    };

    return (
        <Dialog
            open={open}
            onClose={submitting ? undefined : onClose}
            fullWidth
            maxWidth="sm"
            aria-labelledby="review-form-title"
        >
            <DialogTitle id="review-form-title">
                {mode === "create" ? t("form.title_create") : t("form.title_edit")}
            </DialogTitle>

            <DialogContent>
                <Box sx={{ mb: 2 }}>
                    <Typography
                        variant="subtitle2"
                        fontWeight={700}
                        sx={{ mb: 0.75 }}
                    >
                        {t("form.rating_label")}
                    </Typography>
                    <Rating
                        value={rating}
                        onChange={(_, value) => {
                            setRating(value);
                            if (value) setRatingError(false);
                        }}
                        size="large"
                        sx={{
                            fontSize: 36,
                            "& .MuiRating-iconFilled": { color: "#FFB800" },
                        }}
                    />
                    {ratingError && (
                        <Typography
                            variant="caption"
                            sx={{ color: "error.main", display: "block", mt: 0.5 }}
                            role="alert"
                        >
                            {t("form.rating_required")}
                        </Typography>
                    )}
                </Box>

                <TextField
                    value={text}
                    onChange={(e) => setText(e.target.value.slice(0, TEXT_MAX))}
                    multiline
                    minRows={4}
                    maxRows={10}
                    fullWidth
                    label={t("form.text_label")}
                    placeholder={t("form.text_placeholder")}
                    helperText={`${text.length} / ${TEXT_MAX}`}
                    slotProps={{
                        formHelperText: {
                            sx: { textAlign: "right", color: tokens.textMuted },
                        },
                    }}
                />
            </DialogContent>

            <DialogActions sx={{ px: 3, pb: 2.5, gap: 1 }}>
                <Button
                    onClick={onClose}
                    disabled={submitting}
                    color="inherit"
                    sx={{ fontWeight: 600 }}
                >
                    {t("form.cancel")}
                </Button>
                <Button
                    onClick={handleSubmit}
                    variant="contained"
                    disabled={submitting}
                    sx={{ fontWeight: 800, minWidth: 140 }}
                >
                    {submitting
                        ? t("form.submitting")
                        : mode === "create"
                          ? t("form.submit_create")
                          : t("form.submit_edit")}
                </Button>
            </DialogActions>
        </Dialog>
    );
}
