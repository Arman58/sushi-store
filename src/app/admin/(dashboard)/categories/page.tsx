"use client";

import CategoryOutlinedIcon from "@mui/icons-material/CategoryOutlined";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import {
    Alert,
    Box,
    Button,
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

import { useLocalizedFieldFn } from "@/features/admin/hooks/use-admin-content-locale";
import { useAITranslation } from "@/features/admin/hooks/use-ai-translation";
import { AdminLocalizationSection } from "@/features/admin/ui/admin-localization-section";
import { LocalizedStatusChips } from "@/features/admin/ui/localized-status-chips";
import {
    emptyLocalizedJson,
    type LocalizedJson,
    mergeLocalizedTranslations,
    parseLocalizedJson,
} from "@/lib/i18n-utils";
import { useTabletDown } from "@/shared/lib/use-mobile-viewport";
import { PageContainer, SectionTitle } from "@/shared/ui";
import { LocalizedTextFields } from "@/shared/ui/localized-text-fields";
import { tokens } from "@/shared/ui/theme";

import {
    CategoryImageCell,
    type CategoryRow,
} from "./category-image-cell";
import { CategoryRowCard } from "./category-row-card";

export default function AdminCategoriesPage() {
    const t = useTranslations("admin.categories");
    const tCommon = useTranslations("admin.common");
    const lf = useLocalizedFieldFn();
    const isMobile = useTabletDown();
    const [categories, setCategories] = useState<CategoryRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [pageError, setPageError] = useState<string | null>(null);
    const [savingId, setSavingId] = useState<number | null>(null);

    const [editing, setEditing] = useState<CategoryRow | null>(null);
    const [editName, setEditName] = useState<LocalizedJson>(emptyLocalizedJson());
    const [saveBusy, setSaveBusy] = useState(false);

    const { translate, isTranslating } = useAITranslation();

    const handleTranslate = async (): Promise<boolean> => {
        if (!editName.ru) return false;
        const res = await translate({ name: editName.ru });
        if (!res) return false;
        setEditName((prev) =>
            mergeLocalizedTranslations(prev, {
                en: res.en.name,
                hy: res.hy.name,
            }),
        );
        return true;
    };

    const [deleting, setDeleting] = useState<CategoryRow | null>(null);
    const [deleteBusy, setDeleteBusy] = useState(false);
    const tRef = useRef(t);
    tRef.current = t;

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
            setPageError(tRef.current("loadFailed"));
        } finally {
            setLoading(false);
        }
    }, []);

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

            {pageError ? (
                <Alert severity="error" sx={{ mb: 2 }} onClose={() => setPageError(null)}>
                    {pageError}
                </Alert>
            ) : null}

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
                <>
                    <Box sx={{ display: { xs: "none", md: "block" }, overflowX: "auto" }}>
                        <Table size="small" sx={{ minWidth: 640 }}>
                            <TableHead>
                                <TableRow>
                                    <TableCell sx={{ fontWeight: 700 }}>
                                        {tCommon("photo")}
                                    </TableCell>
                                    <TableCell sx={{ fontWeight: 700 }}>
                                        {tCommon("name")}
                                    </TableCell>
                                    <TableCell sx={{ fontWeight: 700 }}>
                                        {tCommon("slug")}
                                    </TableCell>
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
                                            <Box
                                                sx={{
                                                    display: "flex",
                                                    flexDirection: "column",
                                                    gap: 0.75,
                                                }}
                                            >
                                                <Typography
                                                    variant="body2"
                                                    fontWeight={600}
                                                >
                                                    {lf(category.name)}
                                                </Typography>
                                                <LocalizedStatusChips
                                                    value={category.name}
                                                />
                                            </Box>
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
                                                        name: lf(category.name),
                                                    }),
                                                }}
                                            />
                                        </TableCell>
                                        <TableCell align="right">
                                            <Tooltip title={tCommon("rename")}>
                                                <IconButton
                                                    size="small"
                                                    onClick={() => openRename(category)}
                                                    aria-label={t("renameCategory")}
                                                >
                                                    <EditIcon sx={{ fontSize: 18 }} />
                                                </IconButton>
                                            </Tooltip>
                                            <Tooltip title={tCommon("delete")}>
                                                <IconButton
                                                    size="small"
                                                    onClick={() => setDeleting(category)}
                                                    aria-label={t("deleteCategory")}
                                                    sx={{ color: "#E74C3C" }}
                                                >
                                                    <DeleteIcon sx={{ fontSize: 18 }} />
                                                </IconButton>
                                            </Tooltip>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </Box>

                    <Stack
                        spacing={1.5}
                        sx={{ display: { xs: "flex", md: "none" }, pb: 2 }}
                    >
                        {categories.map((category) => (
                            <CategoryRowCard
                                key={category.id}
                                category={category}
                                savingId={savingId}
                                onImageChange={handleImageChange}
                                onPatch={patchCategory}
                                onRename={openRename}
                                onDelete={setDeleting}
                            />
                        ))}
                    </Stack>
                </>
            )}

            <Dialog
                open={editing !== null}
                onClose={saveBusy ? undefined : () => setEditing(null)}
                fullWidth
                maxWidth="sm"
                fullScreen={isMobile}
            >
                <DialogTitle>{t("renameCategory")}</DialogTitle>
                <DialogContent>
                    <Box sx={{ pt: 1 }}>
                        <AdminLocalizationSection
                            fieldValues={[editName]}
                            onTranslate={handleTranslate}
                            translating={isTranslating}
                            disabled={saveBusy}
                        >
                            <LocalizedTextFields
                                label={tCommon("name")}
                                value={editName}
                                onChange={setEditName}
                                required
                            />
                        </AdminLocalizationSection>
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
                            name: deleting ? lf(deleting.name) : "",
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
