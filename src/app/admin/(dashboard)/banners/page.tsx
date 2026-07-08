"use client";

import AddPhotoAlternateOutlinedIcon from "@mui/icons-material/AddPhotoAlternateOutlined";
import CampaignOutlinedIcon from "@mui/icons-material/CampaignOutlined";
import {
    Alert,
    Box,
    Button,
    Chip,
    CircularProgress,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Paper,
    Skeleton,
    Stack,
    TextField,
    Typography,
} from "@mui/material";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useRef, useState } from "react";

import { useAITranslation } from "@/features/admin/hooks/use-ai-translation";
import { AdminLocalizationSection } from "@/features/admin/ui/admin-localization-section";
import {
    type BannerHrefError,
    validateBannerHref,
} from "@/lib/banner-href";
import {
    emptyLocalizedJson,
    type LocalizedJson,
    mergeLocalizedTranslations,
    parseLocalizedJson,
} from "@/lib/i18n-utils";
import { IMAGE_UPLOAD_ACCEPT } from "@/lib/validate-image-upload";
import { PageContainer, SectionTitle } from "@/shared/ui";
import { LocalizedTextFields } from "@/shared/ui/localized-text-fields";
import { tokens } from "@/shared/ui/theme";

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

import { type BannerRow,BannerRowCard } from "./banner-row-card";

export default function AdminBannersPage() {
    const t = useTranslations("admin.banners");
    const [banners, setBanners] = useState<BannerRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [info, setInfo] = useState<string | null>(null);
    const [busyId, setBusyId] = useState<number | null>(null);
    const [uploading, setUploading] = useState(false);
    const [deleting, setDeleting] = useState<BannerRow | null>(null);
    // Черновик ссылки для нового баннера
    const [newHref, setNewHref] = useState("/menu");
    // Редактирование подписи (заголовок поверх фото, 3 локали)
    const [editingTitle, setEditingTitle] = useState<BannerRow | null>(null);
    const [titleDraft, setTitleDraft] = useState<LocalizedJson>(
        emptyLocalizedJson(),
    );
    const [ctaDraft, setCtaDraft] = useState<LocalizedJson>(
        emptyLocalizedJson(),
    );

    const { translate, isTranslating } = useAITranslation();

    const handleTranslate = async (): Promise<boolean> => {
        const fieldsToTranslate: Record<string, string> = {};
        if (titleDraft.ru) fieldsToTranslate.title = titleDraft.ru;
        if (ctaDraft.ru) fieldsToTranslate.cta = ctaDraft.ru;
        if (Object.keys(fieldsToTranslate).length === 0) return false;

        const res = await translate(fieldsToTranslate);
        if (!res) return false;

        setTitleDraft((prev) =>
            mergeLocalizedTranslations(prev, {
                en: res.en.title,
                hy: res.hy.title,
            }),
        );
        setCtaDraft((prev) =>
            mergeLocalizedTranslations(prev, {
                en: res.en.cta,
                hy: res.hy.cta,
            }),
        );
        return true;
    };
    const fileRef = useRef<HTMLInputElement>(null);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch("/api/admin/banners", {
                credentials: "same-origin",
            });
            if (!res.ok) throw new Error();
            setBanners((await res.json()) as BannerRow[]);
        } catch {
            setError(t("loadError"));
        } finally {
            setLoading(false);
        }
    }, [t]);

    useEffect(() => {
        void load();
    }, [load]);

    const patch = useCallback(
        async (id: number, body: Record<string, unknown>) => {
            setBusyId(id);
            setError(null);
            try {
                const res = await fetch(`/api/admin/banners/${id}`, {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    credentials: "same-origin",
                    body: JSON.stringify(body),
                });
                if (!res.ok) throw new Error();
                const updated = (await res.json()) as BannerRow;
                setBanners((prev) =>
                    prev.map((b) => (b.id === id ? updated : b)),
                );
            } catch {
                setError(t("saveError"));
            } finally {
                setBusyId(null);
            }
        },
        [t],
    );

    const hrefErrorMsg = (code: BannerHrefError) =>
        code === "forbidden" ? t("errForbidden") : t("errFormat");

    const newHrefCheck = validateBannerHref(newHref);
    const newHrefError = newHrefCheck.ok
        ? null
        : hrefErrorMsg(newHrefCheck.code);

    const handleCreate = async (file: File | null) => {
        if (!file) return;
        setError(null);
        setInfo(null);
        if (newHrefError) {
            setError(newHrefError);
            return;
        }
        if (file.size > MAX_IMAGE_BYTES) {
            setError(t("fileTooBig"));
            return;
        }
        setUploading(true);
        try {
            const formData = new FormData();
            formData.append("file", file);
            const up = await fetch("/api/upload", {
                method: "POST",
                body: formData,
                credentials: "same-origin",
            });
            const json = (await up.json()) as { url?: string; error?: string };
            if (!up.ok || !json.url) {
                setError(json.error || t("uploadError"));
                return;
            }
            const res = await fetch("/api/admin/banners", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "same-origin",
                body: JSON.stringify({
                    image: json.url,
                    href: newHref.trim() || null,
                    position: banners.length,
                    // Draft-first: новый баннер скрыт, пока админ не настроит и не включит.
                    isActive: false,
                }),
            });
            if (!res.ok) throw new Error();
            await load();
            setInfo(t("draftCreated"));
        } catch {
            setError(t("createError"));
        } finally {
            setUploading(false);
            if (fileRef.current) fileRef.current.value = "";
        }
    };

    /** Перестановка местами с соседом (порядок = position). */
    const move = async (index: number, dir: -1 | 1) => {
        const a = banners[index];
        const b = banners[index + dir];
        if (!a || !b) return;
        setBanners((prev) => {
            const next = [...prev];
            next[index] = b;
            next[index + dir] = a;
            return next;
        });
        await Promise.all([
            patch(a.id, { position: index + dir }),
            patch(b.id, { position: index }),
        ]);
    };

    const handleDelete = async () => {
        if (!deleting) return;
        setBusyId(deleting.id);
        try {
            const res = await fetch(`/api/admin/banners/${deleting.id}`, {
                method: "DELETE",
                credentials: "same-origin",
            });
            if (!res.ok) throw new Error();
            setBanners((prev) => prev.filter((b) => b.id !== deleting.id));
        } catch {
            setError(t("deleteError"));
        } finally {
            setBusyId(null);
            setDeleting(null);
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
                <CampaignOutlinedIcon sx={{ color: tokens.brand }} />
                <SectionTitle pageTitle>{t("title")}</SectionTitle>
            </Stack>
            <Typography
                variant="body2"
                sx={{ color: tokens.textMuted, mb: 3, mt: -2 }}
            >
                {t("subtitle")}
            </Typography>

            {error && (
                <Alert
                    severity="error"
                    sx={{ mb: 2 }}
                    onClose={() => setError(null)}
                >
                    {error}
                </Alert>
            )}
            {info && (
                <Alert
                    severity="success"
                    sx={{ mb: 2 }}
                    onClose={() => setInfo(null)}
                >
                    {info}
                </Alert>
            )}

            {/* Создание */}
            <Paper variant="outlined" sx={{ p: 2, mb: 3, borderRadius: 2 }}>
                <Stack
                    direction={{ xs: "column", sm: "row" }}
                    spacing={1.5}
                    alignItems={{ sm: "flex-start" }}
                >
                    <Box sx={{ flex: 1, minWidth: 220, width: "100%" }}>
                        <TextField
                            size="small"
                            fullWidth
                            label={t("linkClickLabel")}
                            value={newHref}
                            onChange={(e) => setNewHref(e.target.value)}
                            placeholder={t("linkPlaceholder")}
                            error={Boolean(newHrefError)}
                            helperText={newHrefError ?? t("linkHelp")}
                        />
                        <Stack
                            direction="row"
                            spacing={0.75}
                            alignItems="center"
                            sx={{ mt: 1, flexWrap: "wrap", gap: 0.75 }}
                        >
                            <Typography
                                variant="caption"
                                sx={{ color: tokens.textMuted }}
                            >
                                {t("presets")}:
                            </Typography>
                            <Chip
                                size="small"
                                label={t("presetHome")}
                                onClick={() => setNewHref("/")}
                                variant="outlined"
                            />
                            <Chip
                                size="small"
                                label={t("presetMenu")}
                                onClick={() => setNewHref("/menu")}
                                variant="outlined"
                            />
                        </Stack>
                    </Box>
                    <input
                        ref={fileRef}
                        type="file"
                        accept={IMAGE_UPLOAD_ACCEPT}
                        hidden
                        onChange={(e) =>
                            void handleCreate(e.target.files?.[0] ?? null)
                        }
                    />
                    <Button
                        variant="contained"
                        startIcon={
                            uploading ? (
                                <CircularProgress size={16} color="inherit" />
                            ) : (
                                <AddPhotoAlternateOutlinedIcon />
                            )
                        }
                        disabled={uploading || Boolean(newHrefError)}
                        onClick={() => fileRef.current?.click()}
                        sx={{ fontWeight: 700, flexShrink: 0, mt: { sm: 0.25 } }}
                    >
                        {uploading ? t("creating") : t("uploadCreate")}
                    </Button>
                </Stack>
            </Paper>

            {loading ? (
                <Stack spacing={1.5}>
                    {[0, 1].map((i) => (
                        <Skeleton
                            key={i}
                            variant="rounded"
                            height={120}
                            sx={{ borderRadius: 2 }}
                        />
                    ))}
                </Stack>
            ) : banners.length === 0 ? (
                <Box
                    sx={{
                        textAlign: "center",
                        py: 6,
                        border: `1px dashed ${tokens.borderHi}`,
                        borderRadius: 2,
                    }}
                >
                    <Typography fontWeight={700}>{t("emptyTitle")}</Typography>
                    <Typography variant="body2" sx={{ color: tokens.textMuted }}>
                        {t("emptyHint")}
                    </Typography>
                </Box>
            ) : (
                <Stack spacing={1.5}>
                    {banners.map((banner, index) => (
                        <BannerRowCard
                            key={banner.id}
                            banner={banner}
                            index={index}
                            total={banners.length}
                            busyId={busyId}
                            onPatch={patch}
                            onMove={(i, dir) => void move(i, dir)}
                            onEditCaption={(b) => {
                                setEditingTitle(b);
                                setTitleDraft(parseLocalizedJson(b.title));
                                setCtaDraft(parseLocalizedJson(b.ctaText));
                            }}
                            onDelete={setDeleting}
                        />
                    ))}
                </Stack>
            )}

            {/* Подпись баннера (заголовок + CTA поверх фото) */}
            <Dialog
                open={editingTitle !== null}
                onClose={() => setEditingTitle(null)}
                fullWidth
                maxWidth="sm"
            >
                <DialogTitle>{t("captionDialogTitle")}</DialogTitle>
                <DialogContent>
                    <Typography
                        variant="body2"
                        color="text.secondary"
                        sx={{ mb: 2 }}
                    >
                        {t("captionDialogHint")}
                    </Typography>
                    <AdminLocalizationSection
                        fieldValues={[titleDraft, ctaDraft]}
                        onTranslate={handleTranslate}
                        translating={isTranslating}
                    >
                        <LocalizedTextFields
                            label={t("captionField")}
                            value={titleDraft}
                            onChange={setTitleDraft}
                        />
                        <LocalizedTextFields
                            label={t("ctaField")}
                            value={ctaDraft}
                            onChange={setCtaDraft}
                        />
                    </AdminLocalizationSection>
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2 }}>
                    <Button
                        onClick={() => setEditingTitle(null)}
                        color="inherit"
                    >
                        {t("cancel")}
                    </Button>
                    <Button
                        variant="contained"
                        sx={{ fontWeight: 700 }}
                        onClick={() => {
                            if (editingTitle) {
                                void patch(editingTitle.id, {
                                    title: titleDraft,
                                    ctaText: ctaDraft,
                                });
                            }
                            setEditingTitle(null);
                        }}
                    >
                        {t("save")}
                    </Button>
                </DialogActions>
            </Dialog>

            <Dialog
                open={deleting !== null}
                onClose={() => setDeleting(null)}
                maxWidth="xs"
                fullWidth
            >
                <DialogTitle>{t("deleteTitle")}</DialogTitle>
                <DialogContent>
                    <Typography variant="body2" color="text.secondary">
                        {t("deleteHint")}
                    </Typography>
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2 }}>
                    <Button onClick={() => setDeleting(null)} color="inherit">
                        {t("cancel")}
                    </Button>
                    <Button
                        onClick={() => void handleDelete()}
                        color="error"
                        variant="contained"
                        sx={{ fontWeight: 700 }}
                    >
                        {t("delete")}
                    </Button>
                </DialogActions>
            </Dialog>
        </PageContainer>
    );
}
