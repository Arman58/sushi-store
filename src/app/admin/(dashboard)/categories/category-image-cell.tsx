"use client";

import AddPhotoAlternateOutlinedIcon from "@mui/icons-material/AddPhotoAlternateOutlined";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import ImageOutlinedIcon from "@mui/icons-material/ImageOutlined";
import {
    Box,
    CircularProgress,
    IconButton,
    Stack,
    Tooltip,
    Typography,
} from "@mui/material";
import { useTranslations } from "next-intl";
import { useRef, useState } from "react";

import { IMAGE_UPLOAD_ACCEPT } from "@/lib/validate-image-upload";
import { tokens } from "@/shared/ui/theme";

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

export type CategoryRow = {
    id: number;
    slug: string;
    name: unknown;
    position: number;
    isActive: boolean;
    image: string | null;
};

export function CategoryImageCell({
    category,
    onImageChange,
    disabled,
}: {
    category: CategoryRow;
    onImageChange: (id: number, image: string | null) => Promise<void>;
    disabled: boolean;
}) {
    const t = useTranslations("admin.categories");
    const tCommon = useTranslations("admin.common");
    const inputRef = useRef<HTMLInputElement>(null);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const pickFile = () => inputRef.current?.click();

    const handleFile = async (file: File | null) => {
        if (!file) return;
        setError(null);

        if (file.size > MAX_IMAGE_BYTES) {
            setError(t("fileTooBig"));
            return;
        }
        if (!file.type.startsWith("image/") && file.type !== "") {
            setError(t("pickImage"));
            return;
        }

        setBusy(true);
        try {
            const formData = new FormData();
            formData.append("file", file);
            const res = await fetch("/api/upload", {
                method: "POST",
                body: formData,
                credentials: "same-origin",
            });
            const json = (await res.json()) as { url?: string; error?: string };
            if (!res.ok || !json.url) {
                setError(json.error || t("uploadFailed"));
                return;
            }
            await onImageChange(category.id, json.url);
        } catch {
            setError(t("uploadFailed"));
        } finally {
            setBusy(false);
            if (inputRef.current) inputRef.current.value = "";
        }
    };

    const handleRemove = async () => {
        setBusy(true);
        setError(null);
        try {
            await onImageChange(category.id, null);
        } finally {
            setBusy(false);
        }
    };

    return (
        <Stack direction="row" spacing={1} alignItems="center">
            <input
                ref={inputRef}
                type="file"
                accept={IMAGE_UPLOAD_ACCEPT}
                hidden
                onChange={(e) => void handleFile(e.target.files?.[0] ?? null)}
            />

            <Box
                onClick={disabled || busy ? undefined : pickFile}
                role="button"
                aria-label={t("uploadCategoryPhoto")}
                sx={{
                    width: 64,
                    height: 44,
                    borderRadius: 1.5,
                    overflow: "hidden",
                    border: `1px solid ${tokens.border}`,
                    bgcolor: tokens.surfaceHi,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: disabled || busy ? "default" : "pointer",
                    flexShrink: 0,
                    position: "relative",
                    "&:hover": {
                        borderColor: tokens.brand,
                    },
                }}
            >
                {busy ? (
                    <CircularProgress size={18} />
                ) : category.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                        src={category.image}
                        alt=""
                        style={{
                            width: "100%",
                            height: "100%",
                            objectFit: "cover",
                        }}
                    />
                ) : (
                    <ImageOutlinedIcon
                        sx={{ fontSize: 20, color: tokens.textMuted }}
                    />
                )}
            </Box>

            <Stack direction="row" spacing={0.25}>
                <Tooltip
                    title={
                        category.image
                            ? tCommon("replacePhoto")
                            : tCommon("uploadPhoto")
                    }
                >
                    <span>
                        <IconButton
                            size="small"
                            onClick={pickFile}
                            disabled={disabled || busy}
                            aria-label={
                                category.image
                                    ? tCommon("replacePhoto")
                                    : tCommon("uploadPhoto")
                            }
                        >
                            <AddPhotoAlternateOutlinedIcon sx={{ fontSize: 18 }} />
                        </IconButton>
                    </span>
                </Tooltip>
                {category.image ? (
                    <Tooltip title={tCommon("removePhoto")}>
                        <span>
                            <IconButton
                                size="small"
                                onClick={() => void handleRemove()}
                                disabled={disabled || busy}
                                aria-label={tCommon("removePhoto")}
                                sx={{ color: "#E74C3C" }}
                            >
                                <DeleteOutlineIcon sx={{ fontSize: 18 }} />
                            </IconButton>
                        </span>
                    </Tooltip>
                ) : null}
            </Stack>

            {error ? (
                <Typography variant="caption" sx={{ color: "error.main" }}>
                    {error}
                </Typography>
            ) : null}
        </Stack>
    );
}
