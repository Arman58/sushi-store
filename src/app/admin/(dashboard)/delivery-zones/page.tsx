"use client";

import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import LocalShippingOutlinedIcon from "@mui/icons-material/LocalShippingOutlined";
import {
    Alert,
    Box,
    Button,
    Container,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
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
import { useCallback, useEffect, useMemo, useState } from "react";

import { PageContainer, SectionTitle } from "@/shared/ui";
import { tokens } from "@/shared/ui/theme";

type ZoneRow = {
    id: number;
    position: number;
    name: string;
    deliveryPrice: number;
    minOrderAmount: number;
    isActive: boolean;
};

const emptyCreate = () => ({
    name: "",
    deliveryPrice: "",
    minOrderAmount: "",
    isActive: true,
});

function formatRub(v: number) {
    return `${v.toLocaleString("ru-RU")} ֏`;
}

export default function AdminDeliveryZonesPage() {
    const [rows, setRows] = useState<ZoneRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editId, setEditId] = useState<number | null>(null);
    const [form, setForm] = useState(emptyCreate());
    const [saving, setSaving] = useState(false);
    const [deleteLoadingId, setDeleteLoadingId] = useState<number | null>(null);
    const [toggleLoadingId, setToggleLoadingId] = useState<number | null>(null);

    const isEditMode = editId !== null;
    const title = useMemo(
        () =>
            isEditMode ? `Редактировать зону №${editId}` : "Новая зона доставки",
        [isEditMode, editId],
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
                        ? "Нет доступа"
                        : "Не удалось загрузить зоны доставки",
                );
                return;
            }
            const data = await res.json();
            setRows(Array.isArray(data) ? data : []);
        } catch {
            setRows([]);
            setError("Не удалось загрузить зоны доставки");
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

    function openEdit(row: ZoneRow) {
        setEditId(row.id);
        setForm({
            name: row.name,
            deliveryPrice: String(row.deliveryPrice),
            minOrderAmount: String(row.minOrderAmount),
            isActive: row.isActive,
        });
        setDialogOpen(true);
    }

    async function submitForm() {
        const name = form.name.trim();
        const dp = Number(form.deliveryPrice);
        const minA = Number(form.minOrderAmount);
        if (
            !name ||
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
            !window.confirm(
                "Удалить зону? Старые заказы сохранят ссылку; новые клиенты не увидят зону.",
            )
        )
            return;
        setDeleteLoadingId(id);
        try {
            const res = await fetch(`/api/admin/delivery-zones/${id}`, {
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
                alert("Не удалось обновить статус");
            }
        } catch {
            setRows((prev) =>
                prev.map((r) =>
                    r.id === row.id ? { ...r, isActive: row.isActive } : r,
                ),
            );
            alert("Ошибка сети");
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
                        sx={{ mb: 2, flexWrap: "wrap" }}
                    >
                        <Button variant="text" component={Link} href="/admin/orders">
                            Заказы
                        </Button>
                        <Button variant="text" component={Link} href="/admin/products">
                            Товары
                        </Button>
                        <Button variant="text" component={Link} href="/admin/promocodes">
                            Промокоды
                        </Button>
                        <Button variant="contained" startIcon={<LocalShippingOutlinedIcon />}>
                            Зоны доставки
                        </Button>
                    </Stack>

                    <SectionTitle>Зоны доставки</SectionTitle>

                    {error ? (
                        <Alert severity="error" sx={{ mb: 2, borderRadius: tokens.radiusCardLg }}>
                            {error}
                        </Alert>
                    ) : null}

                    <Button
                        variant="contained"
                        onClick={openCreate}
                        sx={{ mb: 2 }}
                    >
                        Добавить зону
                    </Button>

                    <Paper
                        variant="outlined"
                        sx={{
                            borderRadius: `${tokens.radiusCardLg}px`,
                            overflow: "auto",
                            borderColor: tokens.border,
                        }}
                    >
                        <Table size="small">
                            <TableHead>
                                <TableRow>
                                    <TableCell>Название</TableCell>
                                    <TableCell>Доставка</TableCell>
                                    <TableCell>Мин. сумма</TableCell>
                                    <TableCell>Активна</TableCell>
                                    <TableCell align="right" />
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {loading ? (
                                    <TableRow>
                                        <TableCell colSpan={5}>Загрузка…</TableCell>
                                    </TableRow>
                                ) : rows.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={5}>Пока пусто</TableCell>
                                    </TableRow>
                                ) : (
                                    rows.map((r) => (
                                        <TableRow key={r.id} hover>
                                            <TableCell>
                                                <Typography fontWeight={600}>
                                                    {r.name}
                                                </Typography>
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
                                                <Switch
                                                    checked={r.isActive}
                                                    disabled={toggleLoadingId === r.id}
                                                    color="primary"
                                                    onChange={(_, checked) =>
                                                        void handleToggleActive(r, checked)
                                                    }
                                                    inputProps={{
                                                        "aria-label": `${r.isActive ? "Выключить" : "Включить"} зону ${r.name}`,
                                                    }}
                                                />
                                            </TableCell>
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
                    PaperProps={{
                        sx: {
                            borderRadius: `${tokens.radiusCardLg}px`,
                            border: `1px solid ${tokens.border}`,
                        },
                    }}
                >
                    <DialogTitle>{title}</DialogTitle>
                    <DialogContent>
                        <Stack spacing={2} sx={{ mt: 1 }}>
                            <TextField
                                label="Название"
                                required
                                value={form.name}
                                onChange={(e) =>
                                    setForm((f) => ({ ...f, name: e.target.value }))
                                }
                                fullWidth
                            />
                            <TextField
                                label="Стоимость доставки"
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
                                label="Минимальная сумма заказа"
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
                                label="Активна"
                            />
                        </Stack>
                    </DialogContent>
                    <DialogActions sx={{ px: 3, pb: 2 }}>
                        <Button onClick={() => setDialogOpen(false)}>Отмена</Button>
                        <Button
                            variant="contained"
                            color="primary"
                            onClick={() => void submitForm()}
                            disabled={
                                saving ||
                                !form.name.trim() ||
                                !Number.isInteger(Number(form.deliveryPrice)) ||
                                !Number.isInteger(Number(form.minOrderAmount))
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
