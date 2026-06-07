"use client";

import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import LocalOfferOutlinedIcon from "@mui/icons-material/LocalOfferOutlined";
import {
    Alert,
    Box,
    Button,
    Checkbox,
    Container,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
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
import { useCallback, useEffect, useMemo, useState } from "react";

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
        () =>
            isEditMode ? `Редактировать промокод №${editId}` : "Новый промокод",
        [isEditMode, editId],
    );

    const load = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch("/api/admin/promocodes", { credentials: "same-origin" });
            if (!res.ok) {
                setRows([]);
                setError(
                    res.status === 401 ? "Нет доступа" : "Не удалось загрузить промокоды",
                );
                return;
            }
            const data = await res.json();
            setRows(Array.isArray(data) ? data : []);
        } catch {
            setRows([]);
            setError("Не удалось загрузить промокоды");
        } finally {
            setLoading(false);
        }
    }, []);

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
                let msg = "Ошибка сохранения";
                try {
                    const j = (await res.json()) as { error?: string };
                    if (j?.error && typeof j.error === "string") msg = j.error;
                } catch {
                    /* ignore */
                }
                alert(msg);
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
            !window.confirm("Удалить этот промокод? Заказы с этим промо сохранятся.")
        )
            return;
        setDeleteLoadingId(id);
        try {
            const res = await fetch(`/api/admin/promocodes/${id}`, {
                method: "DELETE",
                credentials: "same-origin",
            });
            if (!res.ok) {
                alert("Не удалось удалить");
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
                <Stack direction="row" spacing={1} sx={{ mb: 2, flexWrap: "wrap" }}>
                    <Button variant="text" component={Link} href="/admin/orders">
                        Заказы
                    </Button>
                    <Button variant="text" component={Link} href="/admin/products">
                        Товары
                    </Button>
                    <Button variant="text" component={Link} href="/admin/delivery-zones">
                        Зоны
                    </Button>
                    <Button variant="contained" startIcon={<LocalOfferOutlinedIcon />}>
                        Промокоды
                    </Button>
                </Stack>

                <SectionTitle>Промокоды</SectionTitle>

                {error ? (
                    <Alert severity="error" sx={{ mb: 2 }}>
                        {error}
                    </Alert>
                ) : null}

                <Button
                    variant="contained"
                    onClick={openCreate}
                    sx={{ mb: 2, textTransform: "none" }}
                >
                    Добавить промокод
                </Button>

                <Paper variant="outlined" sx={{ overflow: "auto" }}>
                    <Table size="small">
                        <TableHead>
                            <TableRow>
                                <TableCell>Код</TableCell>
                                <TableCell>Тип</TableCell>
                                <TableCell>Значение</TableCell>
                                <TableCell>Мин. сумма</TableCell>
                                <TableCell>Лимит / учтено</TableCell>
                                <TableCell>Истечение</TableCell>
                                <TableCell>Активен</TableCell>
                                <TableCell align="right" />
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={8}>Загрузка…</TableCell>
                                </TableRow>
                            ) : rows.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={8}>Пока пусто</TableCell>
                                </TableRow>
                            ) : (
                                rows.map((r) => (
                                    <TableRow key={r.id} hover>
                                        <TableCell>
                                            <Typography fontWeight={600}>{r.code}</Typography>
                                        </TableCell>
                                        <TableCell>
                                            {r.discountType === "PERCENTAGE" ? "%" : "Фикс."}
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
                                        <TableCell>{r.isActive ? "Да" : "Нет"}</TableCell>
                                        <TableCell align="right">
                                            <IconButton
                                                aria-label="Редактировать"
                                                size="small"
                                                onClick={() => openEdit(r)}
                                            >
                                                <EditIcon fontSize="small" />
                                            </IconButton>
                                            <IconButton
                                                aria-label="Удалить"
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
                </Paper>
            </Container>

            <Dialog
                open={dialogOpen}
                onClose={() => setDialogOpen(false)}
                maxWidth="sm"
                fullWidth
            >
                <DialogTitle>{title}</DialogTitle>
                <DialogContent>
                    <Stack spacing={2} sx={{ mt: 1 }}>
                        <TextField
                            label="Код"
                            required
                            value={form.code}
                            onChange={(e) =>
                                setForm((f) => ({
                                    ...f,
                                    code: e.target.value.toUpperCase(),
                                }))
                            }
                            helperText="Хранится в верхнем регистре без пробелов"
                            fullWidth
                        />
                        <TextField
                            select
                            label="Тип скидки"
                            value={form.discountType}
                            onChange={(e) =>
                                setForm((f) => ({
                                    ...f,
                                    discountType: e.target.value as DiscountTypeLite,
                                }))
                            }
                            fullWidth
                        >
                            <MenuItem value="PERCENTAGE">Процент (%)</MenuItem>
                            <MenuItem value="FIXED">Фикс. сумма (֏)</MenuItem>
                        </TextField>
                        <TextField
                            label={
                                form.discountType === "PERCENTAGE"
                                    ? "Процент (целое)"
                                    : "Сумма (֏)"
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
                            label="Мин. сумма заказа (товары); пусто - нет порога"
                            type="number"
                            value={form.minOrderAmount}
                            onChange={(e) =>
                                setForm((f) => ({ ...f, minOrderAmount: e.target.value }))
                            }
                            fullWidth
                            inputProps={{ step: 1, min: 0 }}
                        />
                        <TextField
                            label="Макс. использований; пусто - без лимита"
                            type="number"
                            value={form.maxUsages}
                            onChange={(e) =>
                                setForm((f) => ({ ...f, maxUsages: e.target.value }))
                            }
                            fullWidth
                            inputProps={{ step: 1, min: 1 }}
                        />
                        <TextField
                            label="Истечение"
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
                            label="Активен"
                        />
                    </Stack>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setDialogOpen(false)}>Отмена</Button>
                    <Button
                        variant="contained"
                        onClick={() => void submitForm()}
                        disabled={
                            saving ||
                            !form.code.trim() ||
                            !Number.isInteger(Number(form.discountValue))
                        }
                    >
                        Сохранить
                    </Button>
                </DialogActions>
            </Dialog>
            </Box>
        </PageContainer>
    );
}
