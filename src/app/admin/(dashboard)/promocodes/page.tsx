"use client";

import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import LocalOfferOutlinedIcon from "@mui/icons-material/LocalOfferOutlined";
import {
    Alert,
    Box,
    Button,
    Card,
    CardContent,
    Checkbox,
    Chip,
    Container,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Fab,
    FormControlLabel,
    IconButton,
    MenuItem,
    Paper,
    Stack,
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

import { showAppToast } from "@/shared/lib/show-app-toast";
import { useTabletDown } from "@/shared/lib/use-mobile-viewport";
import { PageContainer, SectionTitle } from "@/shared/ui";

type DiscountTypeLite = "PERCENTAGE" | "FIXED";

type PromoRow = {
    id: number;
    code: string;
    discountType: DiscountTypeLite;
    discountValue: number;
    minOrderAmount: number | null;
    maxUsages: number | null;
    timesUsed: number;
    expiresAt: string | null;
    isActive: boolean;
};

function toLocalInput(iso: string | null): string {
    if (!iso) return "";
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "";
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

const emptyCreate = () => ({
    code: "",
    discountType: "PERCENTAGE" as DiscountTypeLite,
    discountValue: "",
    minOrderAmount: "",
    maxUsages: "",
    expiresLocal: "",
    isActive: true,
});

export default function AdminPromoCodesPage() {
    const t = useTranslations("admin.promocodes");
    const tCommon = useTranslations("admin.common");
    const tNav = useTranslations("admin.nav");
    const isMobile = useTabletDown();
    const [rows, setRows] = useState<PromoRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editId, setEditId] = useState<number | null>(null);
    const [form, setForm] = useState(emptyCreate());
    const [saving, setSaving] = useState(false);
    const [deleteLoadingId, setDeleteLoadingId] = useState<number | null>(null);

    const isEditMode = editId !== null;

    const title = useMemo(
        () => (isEditMode ? t("editTitle", { id: editId! }) : t("newTitle")),
        [isEditMode, editId, t],
    );

    const load = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch("/api/admin/promocodes", { credentials: "same-origin" });
            if (!res.ok) {
                setRows([]);
                setError(
                    res.status === 401 ? tCommon("accessDeniedShort") : t("loadFailed"),
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

    function openEdit(row: PromoRow) {
        setEditId(row.id);
        setForm({
            code: row.code,
            discountType: row.discountType,
            discountValue: String(row.discountValue),
            minOrderAmount:
                row.minOrderAmount != null ? String(row.minOrderAmount) : "",
            maxUsages: row.maxUsages != null ? String(row.maxUsages) : "",
            expiresLocal: toLocalInput(row.expiresAt),
            isActive: row.isActive,
        });
        setDialogOpen(true);
    }

    async function submitForm() {
        const code = form.code.trim();
        const dv = Number(form.discountValue);
        if (!code || !Number.isInteger(dv)) {
            return;
        }

        let minOA: number | null = null;
        if (form.minOrderAmount.trim() !== "") {
            const n = Number(form.minOrderAmount);
            if (!Number.isInteger(n) || n < 0) return;
            minOA = n;
        }

        let maxU: number | null = null;
        if (form.maxUsages.trim() !== "") {
            const n = Number(form.maxUsages);
            if (!Number.isInteger(n) || n < 1) return;
            maxU = n;
        }

        let expiresAt: string | null = null;
        if (form.expiresLocal) {
            const d = new Date(form.expiresLocal);
            if (Number.isNaN(d.getTime())) return;
            expiresAt = d.toISOString();
        }

        const body: Record<string, unknown> = {
            code,
            discountType: form.discountType,
            discountValue: dv,
            minOrderAmount: minOA,
            maxUsages: maxU,
            expiresAt,
            isActive: form.isActive,
        };

        setSaving(true);
        try {
            const res = editId
                ? await fetch(`/api/admin/promocodes/${editId}`, {
                      method: "PATCH",
                      headers: { "Content-Type": "application/json" },
                      credentials: "same-origin",
                      body: JSON.stringify(body),
                  })
                : await fetch("/api/admin/promocodes", {
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
            const res = await fetch(`/api/admin/promocodes/${id}`, {
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
                    <Button variant="text" component={Link} href="/admin/delivery-zones">
                        {t("zonesShort")}
                    </Button>
                    <Button variant="contained" startIcon={<LocalOfferOutlinedIcon />}>
                        {t("title")}
                    </Button>
                </Stack>

                <SectionTitle>{t("title")}</SectionTitle>

                {error ? (
                    <Alert severity="error" sx={{ mb: 2 }}>
                        {error}
                    </Alert>
                ) : null}

                <Button
                    variant="contained"
                    onClick={openCreate}
                    sx={{ mb: 2, textTransform: "none", display: { xs: "none", md: "inline-flex" } }}
                >
                    {t("addPromocode")}
                </Button>

                <Fab
                    color="primary"
                    aria-label={t("addPromocode")}
                    onClick={openCreate}
                    sx={{
                        display: { xs: "flex", md: "none" },
                        position: "fixed",
                        right: 16,
                        bottom: "calc(16px + env(safe-area-inset-bottom))",
                        zIndex: 1100,
                    }}
                >
                    <LocalOfferOutlinedIcon />
                </Fab>

                <Paper variant="outlined" sx={{ overflow: "auto", pb: { xs: 10, md: 0 } }}>
                    <Box sx={{ display: { xs: "none", md: "block" } }}>
                    <Table size="small">
                        <TableHead>
                            <TableRow>
                                <TableCell>{t("code")}</TableCell>
                                <TableCell>{t("typeColumn")}</TableCell>
                                <TableCell>{t("valueColumn")}</TableCell>
                                <TableCell>{t("minAmountColumn")}</TableCell>
                                <TableCell>{t("limitUsed")}</TableCell>
                                <TableCell>{t("expiresColumn")}</TableCell>
                                <TableCell>{t("activeColumn")}</TableCell>
                                <TableCell align="right" />
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={8}>{tCommon("loading")}</TableCell>
                                </TableRow>
                            ) : rows.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={8}>{tCommon("empty")}</TableCell>
                                </TableRow>
                            ) : (
                                rows.map((r) => (
                                    <TableRow key={r.id} hover>
                                        <TableCell>
                                            <Typography fontWeight={600}>{r.code}</Typography>
                                        </TableCell>
                                        <TableCell>
                                            {r.discountType === "PERCENTAGE" ? tCommon("percent") : tCommon("fixed")}
                                        </TableCell>
                                        <TableCell>
                                            {r.discountType === "PERCENTAGE"
                                                ? `${r.discountValue}%`
                                                : `${r.discountValue.toLocaleString("ru-RU")} ֏`}
                                        </TableCell>
                                        <TableCell>
                                            {r.minOrderAmount != null
                                                ? `${r.minOrderAmount.toLocaleString("ru-RU")} ֏`
                                                : "-"}
                                        </TableCell>
                                        <TableCell>
                                            {r.maxUsages != null
                                                ? `${r.timesUsed} / ${r.maxUsages}`
                                                : `${r.timesUsed} / ∞`}
                                        </TableCell>
                                        <TableCell>
                                            {r.expiresAt
                                                ? new Date(r.expiresAt).toLocaleString("ru-RU")
                                                : "-"}
                                        </TableCell>
                                        <TableCell>{r.isActive ? tCommon("yes") : tCommon("no")}</TableCell>
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
                                            <Stack
                                                direction="row"
                                                justifyContent="space-between"
                                                alignItems="center"
                                            >
                                                <Typography fontWeight={800}>{r.code}</Typography>
                                                <Chip
                                                    label={r.isActive ? t("activeColumn") : t("disabled")}
                                                    size="small"
                                                    color={r.isActive ? "success" : "default"}
                                                />
                                            </Stack>
                                            <Typography variant="body2" color="text.secondary">
                                                {r.discountType === "PERCENTAGE"
                                                    ? t("discountPercentShort", { value: r.discountValue })
                                                    : t("discountFixedShort", {
                                                          value: `${r.discountValue.toLocaleString("ru-RU")} ֏`,
                                                      })}
                                            </Typography>
                                            <Typography variant="body2">
                                                {r.maxUsages != null
                                                    ? t("usedCount", {
                                                          used: r.timesUsed,
                                                          max: r.maxUsages,
                                                      })
                                                    : t("usedCountUnlimited", { used: r.timesUsed })}
                                            </Typography>
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
            >
                <DialogTitle>{title}</DialogTitle>
                <DialogContent>
                    <Stack spacing={2} sx={{ mt: 1 }}>
                        <TextField
                            label={t("code")}
                            required
                            value={form.code}
                            onChange={(e) =>
                                setForm((f) => ({
                                    ...f,
                                    code: e.target.value.toUpperCase(),
                                }))
                            }
                            helperText={t("codeHelper")}
                            fullWidth
                        />
                        <TextField
                            select
                            label={t("discountType")}
                            value={form.discountType}
                            onChange={(e) =>
                                setForm((f) => ({
                                    ...f,
                                    discountType: e.target.value as DiscountTypeLite,
                                }))
                            }
                            fullWidth
                        >
                            <MenuItem value="PERCENTAGE">{t("discountPercent")}</MenuItem>
                            <MenuItem value="FIXED">{t("discountFixed")}</MenuItem>
                        </TextField>
                        <TextField
                            label={
                                form.discountType === "PERCENTAGE"
                                    ? t("percentValue")
                                    : t("amountValue")
                            }
                            type="number"
                            required
                            value={form.discountValue}
                            onChange={(e) =>
                                setForm((f) => ({ ...f, discountValue: e.target.value }))
                            }
                            fullWidth
                            inputProps={{
                                step: 1,
                                min: 0,
                                max: form.discountType === "PERCENTAGE" ? 100 : undefined,
                            }}
                        />
                        <TextField
                            label={t("minOrderOptional")}
                            type="number"
                            value={form.minOrderAmount}
                            onChange={(e) =>
                                setForm((f) => ({ ...f, minOrderAmount: e.target.value }))
                            }
                            fullWidth
                            inputProps={{ step: 1, min: 0 }}
                        />
                        <TextField
                            label={t("maxUsagesOptional")}
                            type="number"
                            value={form.maxUsages}
                            onChange={(e) =>
                                setForm((f) => ({ ...f, maxUsages: e.target.value }))
                            }
                            fullWidth
                            inputProps={{ step: 1, min: 1 }}
                        />
                        <TextField
                            label={t("expiresAt")}
                            type="datetime-local"
                            value={form.expiresLocal}
                            onChange={(e) =>
                                setForm((f) => ({ ...f, expiresLocal: e.target.value }))
                            }
                            fullWidth
                            InputLabelProps={{ shrink: true }}
                        />
                        <FormControlLabel
                            control={
                                <Checkbox
                                    checked={form.isActive}
                                    onChange={(e) =>
                                        setForm((f) => ({ ...f, isActive: e.target.checked }))
                                    }
                                />
                            }
                            label={t("activeColumn")}
                        />
                    </Stack>
                </DialogContent>
                <DialogActions
                    sx={{
                        flexDirection: isMobile ? "column-reverse" : "row",
                        gap: isMobile ? 1 : 0,
                        px: isMobile ? 2 : 3,
                        pb: 2,
                        "& .MuiButton-root": isMobile ? { width: "100%", m: 0 } : undefined,
                    }}
                >
                    <Button onClick={() => setDialogOpen(false)} size={isMobile ? "large" : "medium"}>
                        {tCommon("cancel")}
                    </Button>
                    <Button
                        variant="contained"
                        onClick={() => void submitForm()}
                        disabled={
                            saving ||
                            !form.code.trim() ||
                            !Number.isInteger(Number(form.discountValue))
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
