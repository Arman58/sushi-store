"use client";

import AddPhotoAlternateOutlinedIcon from "@mui/icons-material/AddPhotoAlternateOutlined";
import ArrowDownwardIcon from "@mui/icons-material/ArrowDownward";
import ArrowUpwardIcon from "@mui/icons-material/ArrowUpward";
import CampaignOutlinedIcon from "@mui/icons-material/CampaignOutlined";
import DeleteIcon from "@mui/icons-material/Delete";
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
    Paper,
    Skeleton,
    Stack,
    Switch,
    TextField,
    Tooltip,
    Typography,
} from "@mui/material";
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

type BannerRow = {
    id: number;
    image: string;
    title: unknown;
    ctaText?: unknown;
    href: string | null;
    position: number;
    isActive: boolean;
    startsAt: string | null;
    endsAt: string | null;
};

export default function AdminBannersPage() {
    const [banners, setBanners] = useState<BannerRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
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
            setError("Не удалось загрузить баннеры.");
        } finally {
            setLoading(false);
        }
    }, []);

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
                if (!res.ok) {
                    const json = (await res.json().catch(() => null)) as {
                        error?: string;
                    } | null;
                    throw new Error(json?.error || "Не удалось сохранить.");
                }
                const updated = (await res.json()) as BannerRow;
                setBanners((prev) =>
                    prev.map((b) => (b.id === id ? updated : b)),
                );
            } catch {
                setError("Не удалось сохранить.");
            } finally {
                setBusyId(null);
            }
        },
        [],
    );

    const handleCreate = async (file: File | null) => {
        if (!file) return;
        setError(null);
        if (file.size > MAX_IMAGE_BYTES) {
            setError("Файл больше 5 МБ");
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
                setError(json.error || "Не удалось загрузить фото");
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
                }),
            });
            if (!res.ok) throw new Error();
            await load();
        } catch {
            setError("Не удалось создать баннер");
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
        // Оптимистично меняем местами
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

    /** Статус показа с учётом дат. */
    const statusOf = (b: BannerRow): { label: string; color: string } => {
        if (!b.isActive) return { label: "Скрыт", color: tokens.textMuted };
        const now = Date.now();
        if (b.startsAt && new Date(b.startsAt).getTime() > now)
            return { label: "Запланирован", color: "#F59E0B" };
        if (b.endsAt && new Date(b.endsAt).getTime() < now)
            return { label: "Истёк", color: "#E74C3C" };
        return { label: "На витрине", color: tokens.brand };
    };

    /** ISO → значение для input type=date. */
    const toDateInput = (iso: string | null) =>
        iso ? iso.slice(0, 10) : "";

    const patchDate = (
        id: number,
        field: "startsAt" | "endsAt",
        value: string,
    ) => {
        void patch(id, {
            [field]: value
                ? new Date(
                      field === "endsAt"
                          ? `${value}T23:59:59`
                          : `${value}T00:00:00`,
                  ).toISOString()
                : null,
        });
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
            setError("Не удалось удалить");
        } finally {
            setBusyId(null);
            setDeleting(null);
        }
    };

    return (
        <PageContainer>
            <Stack direction="row" alignItems="center" spacing={1.25} sx={{ mb: 0.5 }}>
                <CampaignOutlinedIcon sx={{ color: tokens.brand }} />
                <SectionTitle pageTitle>Баннеры</SectionTitle>
            </Stack>
            <Typography variant="body2" sx={{ color: tokens.textMuted, mb: 3, mt: -2 }}>
                Карусель на главной под шапкой. Рекомендуемое фото 1200×480.
                Ссылка — внутренний путь (например /menu?category=sets).
            </Typography>

            {error && (
                <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
                    {error}
                </Alert>
            )}

            {/* Создание */}
            <Paper variant="outlined" sx={{ p: 2, mb: 3, borderRadius: 2 }}>
                <Stack
                    direction={{ xs: "column", sm: "row" }}
                    spacing={1.5}
                    alignItems={{ sm: "center" }}
                >
                    <TextField
                        size="small"
                        label="Ссылка баннера"
                        value={newHref}
                        onChange={(e) => setNewHref(e.target.value)}
                        placeholder="/menu?category=sets"
                        sx={{ flex: 1, minWidth: 220 }}
                    />
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
                        disabled={uploading}
                        onClick={() => fileRef.current?.click()}
                        sx={{ fontWeight: 700, flexShrink: 0 }}
                    >
                        Загрузить фото и создать
                    </Button>
                </Stack>
            </Paper>

            {loading ? (
                <Stack spacing={1.5}>
                    {[0, 1].map((i) => (
                        <Skeleton key={i} variant="rounded" height={120} sx={{ borderRadius: 2 }} />
                    ))}
                </Stack>
            ) : banners.length === 0 ? (
                <Box sx={{ textAlign: "center", py: 6, border: `1px dashed ${tokens.borderHi}`, borderRadius: 2 }}>
                    <Typography fontWeight={700}>Баннеров пока нет</Typography>
                    <Typography variant="body2" sx={{ color: tokens.textMuted }}>
                        Загрузите фото выше — баннер сразу появится на главной.
                    </Typography>
                </Box>
            ) : (
                <Stack spacing={1.5}>
                    {banners.map((banner, index) => (
                        <Paper
                            key={banner.id}
                            variant="outlined"
                            sx={{ p: 1.5, borderRadius: 2 }}
                        >
                            <Stack
                                direction={{ xs: "column", sm: "row" }}
                                spacing={1.5}
                                alignItems={{ sm: "center" }}
                            >
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                    src={banner.image}
                                    alt=""
                                    style={{
                                        width: 200,
                                        maxWidth: "100%",
                                        aspectRatio: "5 / 2",
                                        objectFit: "cover",
                                        borderRadius: 8,
                                        flexShrink: 0,
                                    }}
                                />
                                <Box sx={{ flex: 1, minWidth: 0 }}>
                                    <TextField
                                        size="small"
                                        label="Ссылка"
                                        defaultValue={banner.href ?? ""}
                                        onBlur={(e) => {
                                            const v = e.target.value.trim();
                                            if (v !== (banner.href ?? "")) {
                                                void patch(banner.id, {
                                                    href: v || null,
                                                });
                                            }
                                        }}
                                        fullWidth
                                        sx={{ mb: 1 }}
                                    />
                                    <Typography
                                        variant="caption"
                                        onClick={() => {
                                            setEditingTitle(banner);
                                            setTitleDraft(
                                                parseLocalizedJson(banner.title),
                                            );
                                            setCtaDraft(
                                                parseLocalizedJson(
                                                    banner.ctaText,
                                                ),
                                            );
                                        }}
                                        sx={{
                                            color: tokens.brand,
                                            cursor: "pointer",
                                            fontWeight: 600,
                                            "&:hover": { textDecoration: "underline" },
                                        }}
                                    >
                                        {getLocalizedField(banner.title, "ru") ||
                                            "Добавить подпись (заголовок на фото)"}{" "}
                                        ✎
                                    </Typography>
                                    <Stack direction="row" spacing={1} sx={{ mt: 1.25 }}>
                                        <TextField
                                            size="small"
                                            type="date"
                                            label="Показ с"
                                            InputLabelProps={{ shrink: true }}
                                            defaultValue={toDateInput(banner.startsAt)}
                                            onBlur={(e) =>
                                                patchDate(banner.id, "startsAt", e.target.value)
                                            }
                                            sx={{ width: 160 }}
                                        />
                                        <TextField
                                            size="small"
                                            type="date"
                                            label="по (включительно)"
                                            InputLabelProps={{ shrink: true }}
                                            defaultValue={toDateInput(banner.endsAt)}
                                            onBlur={(e) =>
                                                patchDate(banner.id, "endsAt", e.target.value)
                                            }
                                            sx={{ width: 170 }}
                                        />
                                    </Stack>
                                </Box>
                                <Stack
                                    alignItems="flex-end"
                                    spacing={0.75}
                                    sx={{ flexShrink: 0 }}
                                >
                                    <Typography
                                        variant="caption"
                                        sx={{
                                            fontWeight: 700,
                                            color: statusOf(banner).color,
                                        }}
                                    >
                                        ● {statusOf(banner).label}
                                    </Typography>
                                    <Stack direction="row" alignItems="center" spacing={0.25}>
                                        <Tooltip title="Выше">
                                            <span>
                                                <IconButton
                                                    size="small"
                                                    disabled={index === 0 || busyId !== null}
                                                    onClick={() => void move(index, -1)}
                                                    aria-label="Переместить выше"
                                                >
                                                    <ArrowUpwardIcon sx={{ fontSize: 16 }} />
                                                </IconButton>
                                            </span>
                                        </Tooltip>
                                        <Tooltip title="Ниже">
                                            <span>
                                                <IconButton
                                                    size="small"
                                                    disabled={
                                                        index === banners.length - 1 ||
                                                        busyId !== null
                                                    }
                                                    onClick={() => void move(index, 1)}
                                                    aria-label="Переместить ниже"
                                                >
                                                    <ArrowDownwardIcon sx={{ fontSize: 16 }} />
                                                </IconButton>
                                            </span>
                                        </Tooltip>
                                        <Tooltip title={banner.isActive ? "Показывается" : "Скрыт"}>
                                            <Switch
                                                size="small"
                                                checked={banner.isActive}
                                                disabled={busyId === banner.id}
                                                onChange={(e) =>
                                                    void patch(banner.id, {
                                                        isActive: e.target.checked,
                                                    })
                                                }
                                                inputProps={{ "aria-label": "Активен" }}
                                            />
                                        </Tooltip>
                                        <IconButton
                                            size="small"
                                            sx={{ color: "#E74C3C" }}
                                            disabled={busyId === banner.id}
                                            onClick={() => setDeleting(banner)}
                                            aria-label="Удалить баннер"
                                        >
                                            <DeleteIcon sx={{ fontSize: 18 }} />
                                        </IconButton>
                                    </Stack>
                                </Stack>
                            </Stack>
                        </Paper>
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
                <DialogTitle>Подпись баннера</DialogTitle>
                <DialogContent>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                        Показывается поверх фото с затемнением; если есть ссылка —
                        появится кнопка «Смотреть». Пусто — просто фото.
                    </Typography>
                    <LocalizedTextFields
                        label="Заголовок"
                        value={titleDraft}
                        onChange={setTitleDraft}
                    />
                    <Box sx={{ mt: 2 }}>
                        <LocalizedTextFields
                            label="Текст кнопки (пусто - «Смотреть»)"
                            value={ctaDraft}
                            onChange={setCtaDraft}
                        />
                    </Box>
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2 }}>
                    <Button onClick={() => setEditingTitle(null)} color="inherit">
                        Отмена
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
                        Сохранить
                    </Button>
                </DialogActions>
            </Dialog>

            <Dialog open={deleting !== null} onClose={() => setDeleting(null)} maxWidth="xs" fullWidth>
                <DialogTitle>Удалить баннер?</DialogTitle>
                <DialogContent>
                    <Typography variant="body2" color="text.secondary">
                        Баннер исчезнет с главной страницы.
                    </Typography>
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2 }}>
                    <Button onClick={() => setDeleting(null)} color="inherit">
                        Отмена
                    </Button>
                    <Button
                        onClick={() => void handleDelete()}
                        color="error"
                        variant="contained"
                        sx={{ fontWeight: 700 }}
                    >
                        Удалить
                    </Button>
                </DialogActions>
            </Dialog>
        </PageContainer>
    );
}
