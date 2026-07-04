"use client";

import AddPhotoAlternateOutlinedIcon from "@mui/icons-material/AddPhotoAlternateOutlined";
import CategoryOutlinedIcon from "@mui/icons-material/CategoryOutlined";
import DeleteIcon from "@mui/icons-material/Delete";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import EditIcon from "@mui/icons-material/Edit";
import ImageOutlinedIcon from "@mui/icons-material/ImageOutlined";
import {
    Alert,
    Box,
    Button,
    CircularProgress,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    IconButton,
    Skeleton,
    Stack,
    Switch,
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableRow,
    Tooltip,
    Typography,
} from "@mui/material";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useRef, useState } from "react";

import {
    emptyLocalizedJson,
    getLocalizedField,
    type LocalizedJson,
    parseLocalizedJson,
} from "@/lib/i18n-utils";
import { IMAGE_UPLOAD_ACCEPT } from "@/lib/validate-image-upload";
import { PageContainer, SectionTitle } from "@/shared/ui";
import { LocalizedTextFields } from "@/shared/ui/localized-text-fields";
import { tokens } from "@/shared/ui/theme";

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

type CategoryRow = {
    id: number;
    slug: string;
    name: unknown;
    position: number;
    isActive: boolean;
    image: string | null;
};

// ─── Image cell: preview + upload/replace/delete ─────────────────────────────

function CategoryImageCell({
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

            {/* Preview */}
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
                    title={category.image ? tCommon("replacePhoto") : tCommon("uploadPhoto")}
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
                            <AddPhotoAlternateOutlinedIcon
                                sx={{ fontSize: 18 }}
                            />
                        </IconButton>
                    </span>
                </Tooltip>
                {category.image && (
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
                )}
            </Stack>

            {error && (
                <Typography variant="caption" sx={{ color: "error.main" }}>
                    {error}
                </Typography>
            )}
        </Stack>
    );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AdminCategoriesPage() {
    const t = useTranslations("admin.categories");
    const tCommon = useTranslations("admin.common");
    const [categories, setCategories] = useState<CategoryRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [pageError, setPageError] = useState<string | null>(null);
    const [savingId, setSavingId] = useState<number | null>(null);

    // Rename dialog
    const [editing, setEditing] = useState<CategoryRow | null>(null);
    const [editName, setEditName] = useState<LocalizedJson>(emptyLocalizedJson());
    const [saveBusy, setSaveBusy] = useState(false);

    // Delete confirm
    const [deleting, setDeleting] = useState<CategoryRow | null>(null);
    const [deleteBusy, setDeleteBusy] = useState(false);

    const load = useCallback(async () => {
        setLoading(true);
        setPageError(null);
        try {
            const res = await fetch("/api/admin/categories", {
                credentials: "same-origin",
            });
            if (!res.ok) throw new Error();
            const data = (await res.json()) as CategoryRow[];
            setCategories(data);
        } catch {
            setPageError(t("loadFailed"));
        } finally {
            setLoading(false);
        }
    }, [t]);

    useEffect(() => {
        void load();
    }, [load]);

    const patchCategory = useCallback(
        async (id: number, body: Record<string, unknown>) => {
            setSavingId(id);
            setPageError(null);
            try {
                const res = await fetch(`/api/admin/categories/${id}`, {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    credentials: "same-origin",
                    body: JSON.stringify(body),
                });
                if (!res.ok) {
                    const json = (await res.json().catch(() => null)) as {
                        error?: string;
                    } | null;
                    throw new Error(json?.error || tCommon("saveFailed"));
                }
                const updated = (await res.json()) as CategoryRow;
                setCategories((prev) =>
                    prev.map((c) => (c.id === id ? { ...c, ...updated } : c)),
                );
            } catch (e) {
                setPageError(
                    e instanceof Error ? e.message : tCommon("saveFailed"),
                );
            } finally {
                setSavingId(null);
            }
        },
        [tCommon],
    );

    const handleImageChange = useCallback(
        (id: number, image: string | null) => patchCategory(id, { image }),
        [patchCategory],
    );

    const openRename = (category: CategoryRow) => {
        setEditing(category);
        setEditName(parseLocalizedJson(category.name));
    };

    const handleRenameSave = async () => {
        if (!editing) return;
        setSaveBusy(true);
        try {
            await patchCategory(editing.id, { name: editName });
            setEditing(null);
        } finally {
            setSaveBusy(false);
        }
    };

    const handleDelete = async () => {
        if (!deleting) return;
        setDeleteBusy(true);
        setPageError(null);
        try {
            const res = await fetch(`/api/admin/categories/${deleting.id}`, {
                method: "DELETE",
                credentials: "same-origin",
            });
            if (!res.ok) {
                const json = (await res.json().catch(() => null)) as {
                    error?: string;
                } | null;
                throw new Error(json?.error || tCommon("deleteFailed"));
            }
            setCategories((prev) => prev.filter((c) => c.id !== deleting.id));
            setDeleting(null);
        } catch (e) {
            setPageError(
                e instanceof Error ? e.message : tCommon("deleteFailed"),
            );
            setDeleting(null);
        } finally {
            setDeleteBusy(false);
        }
    };

    return (
        <PageContainer>
            <Stack
                direction="row"
                alignItems="center"
                spacing={1.25}
                sx={{ mb: 0.5 }}
            >
                <CategoryOutlinedIcon sx={{ color: tokens.brand }} />
                <SectionTitle pageTitle>{t("title")}</SectionTitle>
            </Stack>
            <Typography
                variant="body2"
                sx={{ color: tokens.textMuted, mb: 3, mt: -2 }}
            >
                {t("subtitle")}
            </Typography>

            {pageError && (
                <Alert severity="error" sx={{ mb: 2 }} onClose={() => setPageError(null)}>
                    {pageError}
                </Alert>
            )}

            {loading ? (
                <Stack spacing={1}>
                    {[0, 1, 2, 3].map((i) => (
                        <Skeleton
                            key={i}
                            variant="rounded"
                            height={60}
                            sx={{ borderRadius: 2 }}
                        />
                    ))}
                </Stack>
            ) : categories.length === 0 ? (
                <Box
                    sx={{
                        textAlign: "center",
                        py: 6,
                        border: `1px dashed ${tokens.borderHi}`,
                        borderRadius: 2,
                    }}
                >
                    <Typography fontWeight={700} sx={{ mb: 0.5 }}>
                        {t("emptyTitle")}
                    </Typography>
                    <Typography variant="body2" sx={{ color: tokens.textMuted }}>
                        {t("emptyHint")}
                    </Typography>
                </Box>
            ) : (
                <Box sx={{ overflowX: "auto" }}>
                    <Table size="small" sx={{ minWidth: 640 }}>
                        <TableHead>
                            <TableRow>
                                <TableCell sx={{ fontWeight: 700 }}>{tCommon("photo")}</TableCell>
                                <TableCell sx={{ fontWeight: 700 }}>
                                    {tCommon("name")}
                                </TableCell>
                                <TableCell sx={{ fontWeight: 700 }}>{tCommon("slug")}</TableCell>
                                <TableCell sx={{ fontWeight: 700 }} align="center">
                                    {tCommon("active")}
                                </TableCell>
                                <TableCell align="right" sx={{ fontWeight: 700 }}>
                                    {tCommon("actions")}
                                </TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {categories.map((category) => (
                                <TableRow key={category.id} hover>
                                    <TableCell sx={{ minWidth: 180 }}>
                                        <CategoryImageCell
                                            category={category}
                                            onImageChange={handleImageChange}
                                            disabled={savingId === category.id}
                                        />
                                    </TableCell>
                                    <TableCell>
                                        <Typography
                                            variant="body2"
                                            fontWeight={600}
                                        >
                                            {getLocalizedField(
                                                category.name,
                                                "ru",
                                            )}
                                        </Typography>
                                    </TableCell>
                                    <TableCell>
                                        <Typography
                                            variant="caption"
                                            sx={{ color: tokens.textMuted }}
                                        >
                                            {category.slug}
                                        </Typography>
                                    </TableCell>
                                    <TableCell align="center">
                                        <Switch
                                            size="small"
                                            checked={category.isActive}
                                            disabled={savingId === category.id}
                                            onChange={(e) =>
                                                void patchCategory(category.id, {
                                                    isActive: e.target.checked,
                                                })
                                            }
                                            inputProps={{
                                                "aria-label": t("categoryActiveAria", {
                                                    name: getLocalizedField(category.name, "ru"),
                                                }),
                                            }}
                                        />
                                    </TableCell>
                                    <TableCell align="right">
                                        <Tooltip title={tCommon("rename")}>
                                            <IconButton
                                                size="small"
                                                onClick={() =>
                                                    openRename(category)
                                                }
                                                aria-label={t("renameCategory")}
                                            >
                                                <EditIcon
                                                    sx={{ fontSize: 18 }}
                                                />
                                            </IconButton>
                                        </Tooltip>
                                        <Tooltip title={tCommon("delete")}>
                                            <IconButton
                                                size="small"
                                                onClick={() =>
                                                    setDeleting(category)
                                                }
                                                aria-label={t("deleteCategory")}
                                                sx={{ color: "#E74C3C" }}
                                            >
                                                <DeleteIcon
                                                    sx={{ fontSize: 18 }}
                                                />
                                            </IconButton>
                                        </Tooltip>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </Box>
            )}

            {/* Rename dialog */}
            <Dialog
                open={editing !== null}
                onClose={saveBusy ? undefined : () => setEditing(null)}
                fullWidth
                maxWidth="sm"
            >
                <DialogTitle>{t("renameCategory")}</DialogTitle>
                <DialogContent>
                    <Box sx={{ pt: 1 }}>
                        <LocalizedTextFields
                            label={tCommon("name")}
                            value={editName}
                            onChange={setEditName}
                            required
                        />
                    </Box>
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2 }}>
                    <Button
                        onClick={() => setEditing(null)}
                        disabled={saveBusy}
                        color="inherit"
                    >
                        {tCommon("cancel")}
                    </Button>
                    <Button
                        onClick={() => void handleRenameSave()}
                        variant="contained"
                        disabled={saveBusy}
                        sx={{ fontWeight: 700 }}
                    >
                        {tCommon("save")}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Delete confirm */}
            <Dialog
                open={deleting !== null}
                onClose={deleteBusy ? undefined : () => setDeleting(null)}
                maxWidth="xs"
                fullWidth
            >
                <DialogTitle>{t("deleteTitle")}</DialogTitle>
                <DialogContent>
                    <Typography variant="body2" sx={{ color: tokens.textSecondary }}>
                        {t("deleteBody", {
                            name: deleting
                                ? getLocalizedField(deleting.name, "ru")
                                : "",
                        })}
                    </Typography>
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2 }}>
                    <Button
                        onClick={() => setDeleting(null)}
                        disabled={deleteBusy}
                        color="inherit"
                    >
                        {tCommon("cancel")}
                    </Button>
                    <Button
                        onClick={() => void handleDelete()}
                        color="error"
                        variant="contained"
                        disabled={deleteBusy}
                        sx={{ fontWeight: 700 }}
                    >
                        {tCommon("delete")}
                    </Button>
                </DialogActions>
            </Dialog>
        </PageContainer>
    );
}
