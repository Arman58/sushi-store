"use client";

import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import LocalShippingOutlinedIcon from "@mui/icons-material/LocalShippingOutlined";
import {
    Alert,
    Box,
    Button,
    Card,
    CardContent,
    Container,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Fab,
    FormControlLabel,
    IconButton,
    InputAdornment,
    Paper,
    Stack,
    Switch,
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableRow,
    TextField,
    Typography,
} from "@mui/material";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useState } from "react";

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
import { showAppToast } from "@/shared/lib/show-app-toast";
import { useTabletDown } from "@/shared/lib/use-mobile-viewport";
import { PageContainer, SectionTitle } from "@/shared/ui";
import { LocalizedTextFields } from "@/shared/ui/localized-text-fields";
import { tokens } from "@/shared/ui/theme";

type ZoneRow = {
    id: number;
    position: number;
    name: unknown;
    deliveryPrice: number;
    minOrderAmount: number;
    description?: unknown;
    requiresManagerApproval: boolean;
    isActive: boolean;
};

type ZoneFormState = {
    name: LocalizedJson;
    deliveryPrice: string;
    minOrderAmount: string;
    description: LocalizedJson;
    requiresManagerApproval: boolean;
    isActive: boolean;
};

const emptyCreate = (): ZoneFormState => ({
    name: emptyLocalizedJson(),
    deliveryPrice: "",
    minOrderAmount: "",
    description: emptyLocalizedJson(),
    requiresManagerApproval: false,
    isActive: true,
});

function hasLocalizedText(value: LocalizedJson): boolean {
    return Boolean(value.hy.trim() || value.ru.trim() || value.en.trim());
}

function formatRub(v: number) {
    return `${v.toLocaleString("ru-RU")} ֏`;
}

export default function AdminDeliveryZonesPage() {
    const t = useTranslations("admin.deliveryZones");
    const tCommon = useTranslations("admin.common");
    const lf = useLocalizedFieldFn();
    const tNav = useTranslations("admin.nav");
    const isMobile = useTabletDown();
    const [rows, setRows] = useState<ZoneRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editId, setEditId] = useState<number | null>(null);
    const [form, setForm] = useState(emptyCreate());
    const [saving, setSaving] = useState(false);
    const [deleteLoadingId, setDeleteLoadingId] = useState<number | null>(null);
    const [toggleLoadingId, setToggleLoadingId] = useState<number | null>(null);

    const { translate, isTranslating } = useAITranslation();

    const handleTranslate = async (): Promise<boolean> => {
        const fieldsToTranslate: Record<string, string> = {};
        if (form.name?.ru) fieldsToTranslate.name = form.name.ru;
        if (form.description?.ru) fieldsToTranslate.description = form.description.ru;
        if (Object.keys(fieldsToTranslate).length === 0) return false;

        const res = await translate(fieldsToTranslate);
        if (!res) return false;

        setForm((f) => ({
            ...f,
            name: mergeLocalizedTranslations(f.name, {
                en: res.en.name,
                hy: res.hy.name,
            }),
            description: mergeLocalizedTranslations(f.description, {
                en: res.en.description,
                hy: res.hy.description,
            }),
        }));
        return true;
    };

    const isEditMode = editId !== null;
    const title = useMemo(
        () => (isEditMode ? t("editTitle", { id: editId! }) : t("newTitle")),
        [isEditMode, editId, t],
    );

    const load = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch("/api/admin/delivery-zones", {
                credentials: "same-origin",
            });
            if (!res.ok) {
                setRows([]);
                setError(
                    res.status === 401
                        ? tCommon("accessDeniedShort")
                        : t("loadFailed"),
                );
                return;
            }
            const data = await res.json();
            setRows(Array.isArray(data) ? data : []);
        } catch {
            setRows([]);
            setError(t("loadFailed"));
        } finally {
            setLoading(false);
        }
    }, [t, tCommon]);

    useEffect(() => {
        void load();
    }, [load]);

    function openCreate() {
        setEditId(null);
        setForm(emptyCreate());
        setDialogOpen(true);
    }

    function openEdit(row: ZoneRow) {
        setEditId(row.id);
        setForm({
            name: parseLocalizedJson(row.name),
            deliveryPrice: String(row.deliveryPrice),
            minOrderAmount: String(row.minOrderAmount),
            description: parseLocalizedJson(row.description),
            requiresManagerApproval: row.requiresManagerApproval,
            isActive: row.isActive,
        });
        setDialogOpen(true);
    }

    async function submitForm() {
        const name = form.name;
        const dp = Number(form.deliveryPrice);
        const minA = Number(form.minOrderAmount);
        if (
            !hasLocalizedText(name) ||
            !Number.isInteger(dp) ||
            dp < 0 ||
            !Number.isInteger(minA) ||
            minA < 0
        ) {
            return;
        }

        const body = {
            name,
            deliveryPrice: dp,
            minOrderAmount: minA,
            description: form.description,
            requiresManagerApproval: form.requiresManagerApproval,
            isActive: form.isActive,
        };

        setSaving(true);
        try {
            const res = editId
                ? await fetch(`/api/admin/delivery-zones/${editId}`, {
                      method: "PATCH",
                      headers: { "Content-Type": "application/json" },
                      credentials: "same-origin",
                      body: JSON.stringify(body),
                  })
                : await fetch("/api/admin/delivery-zones", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      credentials: "same-origin",
                      body: JSON.stringify(body),
                  });

            if (!res.ok) {
                let msg = t("saveFailed");
                try {
                    const j = (await res.json()) as { error?: string };
                    if (j?.error && typeof j.error === "string") msg = j.error;
                } catch {
                    /* ignore */
                }
                showAppToast(msg, "error");
                return;
            }
            setDialogOpen(false);
            void load();
        } finally {
            setSaving(false);
        }
    }

    async function handleDelete(id: number) {
        if (
            typeof window !== "undefined" &&
            !window.confirm(t("deleteConfirm"))
        )
            return;
        setDeleteLoadingId(id);
        try {
            const res = await fetch(`/api/admin/delivery-zones/${id}`, {
                method: "DELETE",
                credentials: "same-origin",
            });
            if (!res.ok) {
                showAppToast(t("deleteFailed"), "error");
                return;
            }
            void load();
        } finally {
            setDeleteLoadingId(null);
        }
    }

    async function handleToggleActive(row: ZoneRow, next: boolean) {
        setToggleLoadingId(row.id);
        setRows((prev) =>
            prev.map((r) => (r.id === row.id ? { ...r, isActive: next } : r)),
        );
        try {
            const res = await fetch(`/api/admin/delivery-zones/${row.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                credentials: "same-origin",
                body: JSON.stringify({ isActive: next }),
            });
            if (!res.ok) {
                setRows((prev) =>
                    prev.map((r) =>
                        r.id === row.id ? { ...r, isActive: row.isActive } : r,
                    ),
                );
                showAppToast(t("statusUpdateFailed"), "error");
            }
        } catch {
            setRows((prev) =>
                prev.map((r) =>
                    r.id === row.id ? { ...r, isActive: row.isActive } : r,
                ),
            );
            showAppToast(tCommon("networkError"), "error");
        } finally {
            setToggleLoadingId(null);
        }
    }

    return (
        <PageContainer>
            <Box sx={{ pb: 4 }}>
                <Container maxWidth="lg" disableGutters>
                    <Stack
                        direction="row"
                        spacing={1}
                        sx={{ mb: 2, flexWrap: "wrap", display: { xs: "none", md: "flex" } }}
                    >
                        <Button variant="text" component={Link} href="/admin/orders">
                            {tNav("orders")}
                        </Button>
                        <Button variant="text" component={Link} href="/admin/products">
                            {tNav("products")}
                        </Button>
                        <Button variant="text" component={Link} href="/admin/promocodes">
                            {tNav("promocodes")}
                        </Button>
                        <Button variant="contained" startIcon={<LocalShippingOutlinedIcon />}>
                            {t("title")}
                        </Button>
                    </Stack>

                    <SectionTitle>{t("title")}</SectionTitle>

                    {error ? (
                        <Alert severity="error" sx={{ mb: 2, borderRadius: tokens.radiusCardLg }}>
                            {error}
                        </Alert>
                    ) : null}

                    <Button
                        variant="contained"
                        onClick={openCreate}
                        sx={{ mb: 2, display: { xs: "none", md: "inline-flex" } }}
                    >
                        {t("addZone")}
                    </Button>

                    <Fab
                        color="primary"
                        aria-label={t("addZone")}
                        onClick={openCreate}
                        sx={{
                            display: { xs: "flex", md: "none" },
                            position: "fixed",
                            right: 16,
                            bottom: "calc(16px + env(safe-area-inset-bottom))",
                            zIndex: 1100,
                        }}
                    >
                        <LocalShippingOutlinedIcon />
                    </Fab>

                    <Paper
                        variant="outlined"
                        sx={{
                            borderRadius: `${tokens.radiusCardLg}px`,
                            overflow: "auto",
                            borderColor: tokens.border,
                            pb: { xs: 10, md: 0 },
                        }}
                    >
                        <Box sx={{ display: { xs: "none", md: "block" } }}>
                        <Table size="small">
                            <TableHead>
                                <TableRow>
                                    <TableCell>{tCommon("name")}</TableCell>
                                    <TableCell>{tCommon("delivery")}</TableCell>
                                    <TableCell>{t("minOrderShort")}</TableCell>
                                    <TableCell>{tCommon("confirmation")}</TableCell>
                                    <TableCell>{tCommon("active")}</TableCell>
                                    <TableCell align="right" />
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {loading ? (
                                    <TableRow>
                                        <TableCell colSpan={6}>{tCommon("loading")}</TableCell>
                                    </TableRow>
                                ) : rows.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={6}>{tCommon("empty")}</TableCell>
                                    </TableRow>
                                ) : (
                                    rows.map((r) => (
                                        <TableRow key={r.id} hover>
                                            <TableCell>
                                                <Box
                                                    sx={{
                                                        display: "flex",
                                                        flexDirection: "column",
                                                        gap: 0.75,
                                                    }}
                                                >
                                                    <Typography fontWeight={600}>
                                                        {lf(r.name)}
                                                    </Typography>
                                                    <LocalizedStatusChips value={r.name} />
                                                </Box>
                                            </TableCell>
                                            <TableCell>
                                                <Typography sx={{ fontVariantNumeric: "tabular-nums" }}>
                                                    {formatRub(r.deliveryPrice)}
                                                </Typography>
                                            </TableCell>
                                            <TableCell>
                                                <Typography sx={{ fontVariantNumeric: "tabular-nums" }}>
                                                    {formatRub(r.minOrderAmount)}
                                                </Typography>
                                            </TableCell>
                                            <TableCell>
                                                <Typography
                                                    variant="body2"
                                                    color={
                                                        r.requiresManagerApproval
                                                            ? "warning.main"
                                                            : "text.secondary"
                                                    }
                                                >
                                                    {r.requiresManagerApproval ? tCommon("yes") : tCommon("no")}
                                                </Typography>
                                            </TableCell>
                                            <TableCell>
                                                <Switch
                                                    checked={r.isActive}
                                                    disabled={toggleLoadingId === r.id}
                                                    color="primary"
                                                    onChange={(_, checked) =>
                                                        void handleToggleActive(r, checked)
                                                    }
                                                    inputProps={{
                                                        "aria-label": `${r.isActive ? tCommon("disableZone") : tCommon("enableZone")} ${lf(r.name)}`,
                                                    }}
                                                />
                                            </TableCell>
                                            <TableCell align="right">
                                                <IconButton
                                                    aria-label={tCommon("edit")}
                                                    size="small"
                                                    onClick={() => openEdit(r)}
                                                >
                                                    <EditIcon fontSize="small" />
                                                </IconButton>
                                                <IconButton
                                                    aria-label={tCommon("delete")}
                                                    size="small"
                                                    color="error"
                                                    disabled={deleteLoadingId === r.id}
                                                    onClick={() => void handleDelete(r.id)}
                                                >
                                                    <DeleteIcon fontSize="small" />
                                                </IconButton>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                        </Box>

                        <Stack spacing={1.5} sx={{ display: { xs: "flex", md: "none" }, p: 1.5 }}>
                            {loading ? (
                                <Typography color="text.secondary" sx={{ p: 2 }}>
                                    {tCommon("loading")}
                                </Typography>
                            ) : rows.length === 0 ? (
                                <Typography color="text.secondary" sx={{ p: 2 }}>
                                    {tCommon("empty")}
                                </Typography>
                            ) : (
                                rows.map((r) => (
                                    <Card key={r.id} variant="outlined" sx={{ borderRadius: 2 }}>
                                        <CardContent sx={{ p: 2, "&:last-child": { pb: 2 } }}>
                                            <Stack spacing={1.25}>
                                                <Typography fontWeight={800}>
                                                    {lf(r.name)}
                                                </Typography>
                                                <LocalizedStatusChips value={r.name} />
                                                <Typography variant="body2">
                                                    {tCommon("delivery")}: {formatRub(r.deliveryPrice)}
                                                </Typography>
                                                <Typography variant="body2">
                                                    {t("minOrderShort")}: {formatRub(r.minOrderAmount)}
                                                </Typography>
                                                <Stack
                                                    direction="row"
                                                    alignItems="center"
                                                    justifyContent="space-between"
                                                >
                                                    <Typography variant="body2" color="text.secondary">
                                                        {tCommon("active")}
                                                    </Typography>
                                                    <Switch
                                                        checked={r.isActive}
                                                        disabled={toggleLoadingId === r.id}
                                                        color="primary"
                                                        onChange={(_, checked) =>
                                                            void handleToggleActive(r, checked)
                                                        }
                                                    />
                                                </Stack>
                                                <Stack direction="row" justifyContent="flex-end" spacing={0.5}>
                                                    <IconButton
                                                        aria-label={tCommon("edit")}
                                                        color="primary"
                                                        onClick={() => openEdit(r)}
                                                    >
                                                        <EditIcon />
                                                    </IconButton>
                                                    <IconButton
                                                        aria-label={tCommon("delete")}
                                                        color="error"
                                                        disabled={deleteLoadingId === r.id}
                                                        onClick={() => void handleDelete(r.id)}
                                                    >
                                                        <DeleteIcon />
                                                    </IconButton>
                                                </Stack>
                                            </Stack>
                                        </CardContent>
                                    </Card>
                                ))
                            )}
                        </Stack>
                    </Paper>
                </Container>

                <Dialog
                    open={dialogOpen}
                    onClose={() => setDialogOpen(false)}
                    maxWidth="sm"
                    fullWidth
                    fullScreen={isMobile}
                    PaperProps={{
                        sx: {
                            borderRadius: isMobile ? 0 : `${tokens.radiusCardLg}px`,
                            border: isMobile ? "none" : `1px solid ${tokens.border}`,
                        },
                    }}
                >
                    <DialogTitle>{title}</DialogTitle>
                    <DialogContent>
                        <Stack spacing={2} sx={{ mt: 1 }}>
                            <AdminLocalizationSection
                                fieldValues={[form.name, form.description]}
                                onTranslate={handleTranslate}
                                translating={isTranslating}
                                disabled={saving}
                            >
                                <LocalizedTextFields
                                    label={tCommon("name")}
                                    required
                                    value={form.name}
                                    onChange={(name) => setForm((f) => ({ ...f, name }))}
                                />
                                <LocalizedTextFields
                                    label={tCommon("description")}
                                    value={form.description}
                                    onChange={(description) =>
                                        setForm((f) => ({ ...f, description }))
                                    }
                                    multiline
                                    minRows={2}
                                />
                            </AdminLocalizationSection>
                            <TextField
                                label={t("deliveryFee")}
                                type="number"
                                required
                                value={form.deliveryPrice}
                                onChange={(e) =>
                                    setForm((f) => ({
                                        ...f,
                                        deliveryPrice: e.target.value,
                                    }))
                                }
                                fullWidth
                                InputProps={{
                                    endAdornment: (
                                        <InputAdornment position="end">֏</InputAdornment>
                                    ),
                                }}
                                inputProps={{ step: 1, min: 0 }}
                            />
                            <TextField
                                label={t("minOrder")}
                                type="number"
                                required
                                value={form.minOrderAmount}
                                onChange={(e) =>
                                    setForm((f) => ({
                                        ...f,
                                        minOrderAmount: e.target.value,
                                    }))
                                }
                                fullWidth
                                InputProps={{
                                    endAdornment: (
                                        <InputAdornment position="end">֏</InputAdornment>
                                    ),
                                }}
                                inputProps={{ step: 1, min: 0 }}
                            />
                            <FormControlLabel
                                control={
                                    <Switch
                                        checked={form.requiresManagerApproval}
                                        onChange={(e) =>
                                            setForm((f) => ({
                                                ...f,
                                                requiresManagerApproval: e.target.checked,
                                            }))
                                        }
                                        color="warning"
                                    />
                                }
                                label={t("requiresManagerApproval")}
                            />
                            <FormControlLabel
                                control={
                                    <Switch
                                        checked={form.isActive}
                                        onChange={(e) =>
                                            setForm((f) => ({
                                                ...f,
                                                isActive: e.target.checked,
                                            }))
                                        }
                                        color="primary"
                                    />
                                }
                                label={tCommon("active")}
                            />
                        </Stack>
                    </DialogContent>
                    <DialogActions
                        sx={{
                            px: 3,
                            pb: 2,
                            flexDirection: isMobile ? "column-reverse" : "row",
                            gap: isMobile ? 1 : 0,
                            "& .MuiButton-root": isMobile ? { width: "100%", m: 0 } : undefined,
                        }}
                    >
                        <Button onClick={() => setDialogOpen(false)} size={isMobile ? "large" : "medium"}>
                            {tCommon("cancel")}
                        </Button>
                        <Button
                            variant="contained"
                            color="primary"
                            onClick={() => void submitForm()}
                            disabled={
                                saving ||
                                !hasLocalizedText(form.name) ||
                                !Number.isInteger(Number(form.deliveryPrice)) ||
                                !Number.isInteger(Number(form.minOrderAmount))
                            }
                            size={isMobile ? "large" : "medium"}
                        >
                            {tCommon("save")}
                        </Button>
                    </DialogActions>
                </Dialog>
            </Box>
        </PageContainer>
    );
}
