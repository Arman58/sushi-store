"use client";

import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import HomeOutlinedIcon from "@mui/icons-material/HomeOutlined";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Chip from "@mui/material/Chip";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import IconButton from "@mui/material/IconButton";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";

import { handleSessionExpired } from "@/features/auth/handle-session-expired";
import { LoginDialog } from "@/features/auth/ui/login-dialog";
import {
    formatSavedAddressLine,
    type SavedAddressDto,
} from "@/lib/saved-address";
import { showAppToast } from "@/shared/lib/show-app-toast";
import { AppButton, AppInput } from "@/shared/ui";
import { tokens } from "@/shared/ui/theme";

type AddressFormState = {
    label: string;
    street: string;
    apartment: string;
    comment: string;
};

const emptyForm: AddressFormState = {
    label: "",
    street: "",
    apartment: "",
    comment: "",
};

export function ProfileSavedAddressesSection() {
    const t = useTranslations("profile");
    const tCommon = useTranslations("common");
    const [addresses, setAddresses] = useState<SavedAddressDto[]>([]);
    const [loading, setLoading] = useState(true);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [form, setForm] = useState<AddressFormState>(emptyForm);
    const [saving, setSaving] = useState(false);
    const [loginOpen, setLoginOpen] = useState(false);

    const loadAddresses = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch("/api/profile/addresses");
            if (res.status === 401) {
                await handleSessionExpired(() => setLoginOpen(true));
                setAddresses([]);
                return;
            }
            if (!res.ok) {
                showAppToast(t("addresses.loadFailed"), "error");
                return;
            }
            const data = (await res.json()) as { addresses?: SavedAddressDto[] };
            setAddresses(Array.isArray(data.addresses) ? data.addresses : []);
        } catch {
            showAppToast(tCommon("networkError"), "error");
        } finally {
            setLoading(false);
        }
    }, [t, tCommon]);

    useEffect(() => {
        void loadAddresses();
    }, [loadAddresses]);

    const openCreateDialog = () => {
        setEditingId(null);
        setForm({ ...emptyForm, label: t("label_home") });
        setDialogOpen(true);
    };

    const openEditDialog = (address: SavedAddressDto) => {
        setEditingId(address.id);
        setForm({
            label: address.label,
            street: address.street,
            apartment: address.apartment ?? "",
            comment: address.comment ?? "",
        });
        setDialogOpen(true);
    };

    const closeDialog = () => {
        if (saving) return;
        setDialogOpen(false);
        setEditingId(null);
        setForm(emptyForm);
    };

    const handleSave = async () => {
        if (!form.label.trim() || !form.street.trim()) {
            showAppToast(t("addresses.validation"), "error");
            return;
        }

        setSaving(true);
        try {
            const payload = {
                label: form.label.trim(),
                street: form.street.trim(),
                apartment: form.apartment.trim() || undefined,
                comment: form.comment.trim() || undefined,
            };

            const res = await fetch(
                editingId
                    ? `/api/profile/addresses/${editingId}`
                    : "/api/profile/addresses",
                {
                    method: editingId ? "PUT" : "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(payload),
                },
            );

            if (res.status === 401) {
                await handleSessionExpired(() => setLoginOpen(true));
                showAppToast(t("login.sessionExpired"), "error");
                return;
            }

            if (!res.ok) {
                showAppToast(t("addresses.saveFailed"), "error");
                return;
            }

            showAppToast(
                editingId ? t("addresses.updated") : t("addresses.created"),
            );
            closeDialog();
            await loadAddresses();
        } catch {
            showAppToast(tCommon("networkError"), "error");
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id: number) => {
        try {
            const res = await fetch(`/api/profile/addresses/${id}`, {
                method: "DELETE",
            });

            if (res.status === 401) {
                await handleSessionExpired(() => setLoginOpen(true));
                return;
            }

            if (!res.ok) {
                showAppToast(t("addresses.deleteFailed"), "error");
                return;
            }

            setAddresses((prev) => prev.filter((item) => item.id !== id));
            showAppToast(t("addresses.deleted"));
        } catch {
            showAppToast(tCommon("networkError"), "error");
        }
    };

    return (
        <>
            <Box sx={{ mb: 3 }}>
                <Stack
                    direction={{ xs: "column", sm: "row" }}
                    justifyContent="space-between"
                    alignItems={{ xs: "flex-start", sm: "center" }}
                    spacing={1.5}
                    sx={{ mb: 1.5 }}
                >
                    <Typography component="h2" variant="h6" sx={{ fontWeight: 700 }}>
                        {t("my_addresses")}
                    </Typography>
                    <AppButton variant="outlined" onClick={openCreateDialog}>
                        {t("add_address")}
                    </AppButton>
                </Stack>

                {loading ? (
                    <Typography variant="body2" color="text.secondary">
                        {tCommon("loading")}
                    </Typography>
                ) : addresses.length === 0 ? (
                    <Alert severity="info">{t("addresses.empty")}</Alert>
                ) : (
                    <Stack spacing={1.5}>
                        {addresses.map((address) => (
                            <Paper
                                key={address.id}
                                elevation={0}
                                sx={{
                                    p: 2,
                                    borderRadius: 2,
                                    border: `1px solid ${tokens.border}`,
                                    bgcolor: "#fff",
                                }}
                            >
                                <Stack
                                    direction="row"
                                    justifyContent="space-between"
                                    alignItems="flex-start"
                                    spacing={1}
                                >
                                    <Box sx={{ minWidth: 0, flex: 1 }}>
                                        <Stack
                                            direction="row"
                                            spacing={1}
                                            alignItems="center"
                                            sx={{ mb: 0.75 }}
                                        >
                                            <HomeOutlinedIcon
                                                fontSize="small"
                                                color="primary"
                                            />
                                            <Chip
                                                size="small"
                                                label={address.label}
                                                sx={{ fontWeight: 700 }}
                                            />
                                        </Stack>
                                        <Typography variant="body2" fontWeight={600}>
                                            {formatSavedAddressLine(
                                                address.street,
                                                address.apartment,
                                            )}
                                        </Typography>
                                        {address.comment ? (
                                            <Typography
                                                variant="caption"
                                                color="text.secondary"
                                                sx={{ display: "block", mt: 0.5 }}
                                            >
                                                {address.comment}
                                            </Typography>
                                        ) : null}
                                    </Box>
                                    <Stack direction="row" spacing={0.5}>
                                        <IconButton
                                            aria-label={t("addresses.edit")}
                                            onClick={() => openEditDialog(address)}
                                            size="small"
                                        >
                                            <EditOutlinedIcon fontSize="small" />
                                        </IconButton>
                                        <IconButton
                                            aria-label={t("addresses.delete")}
                                            onClick={() => void handleDelete(address.id)}
                                            size="small"
                                            color="error"
                                        >
                                            <DeleteOutlineIcon fontSize="small" />
                                        </IconButton>
                                    </Stack>
                                </Stack>
                            </Paper>
                        ))}
                    </Stack>
                )}
            </Box>

            <Dialog open={dialogOpen} onClose={closeDialog} fullWidth maxWidth="sm">
                <DialogTitle sx={{ fontWeight: 700 }}>
                    {editingId ? t("addresses.editTitle") : t("add_address")}
                </DialogTitle>
                <DialogContent>
                    <Stack spacing={2} sx={{ pt: 1 }}>
                        <Stack direction="row" spacing={1}>
                            <Chip
                                label={t("label_home")}
                                clickable
                                color={
                                    form.label === t("label_home")
                                        ? "primary"
                                        : "default"
                                }
                                onClick={() =>
                                    setForm((prev) => ({
                                        ...prev,
                                        label: t("label_home"),
                                    }))
                                }
                            />
                            <Chip
                                label={t("label_work")}
                                clickable
                                color={
                                    form.label === t("label_work")
                                        ? "primary"
                                        : "default"
                                }
                                onClick={() =>
                                    setForm((prev) => ({
                                        ...prev,
                                        label: t("label_work"),
                                    }))
                                }
                            />
                        </Stack>
                        <AppInput
                            label={t("addresses.labelField")}
                            value={form.label}
                            onChange={(e) =>
                                setForm((prev) => ({ ...prev, label: e.target.value }))
                            }
                            fullWidth
                        />
                        <AppInput
                            label={t("addresses.streetField")}
                            value={form.street}
                            onChange={(e) =>
                                setForm((prev) => ({ ...prev, street: e.target.value }))
                            }
                            fullWidth
                            required
                        />
                        <AppInput
                            label={t("addresses.apartmentField")}
                            value={form.apartment}
                            onChange={(e) =>
                                setForm((prev) => ({
                                    ...prev,
                                    apartment: e.target.value,
                                }))
                            }
                            fullWidth
                        />
                        <AppInput
                            label={t("addresses.commentField")}
                            value={form.comment}
                            onChange={(e) =>
                                setForm((prev) => ({ ...prev, comment: e.target.value }))
                            }
                            fullWidth
                            multiline
                            minRows={2}
                        />
                    </Stack>
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2 }}>
                    <AppButton variant="text" onClick={closeDialog} disabled={saving}>
                        {t("addresses.cancel")}
                    </AppButton>
                    <AppButton
                        variant="contained"
                        onClick={() => void handleSave()}
                        disabled={saving}
                    >
                        {saving ? tCommon("loading") : t("addresses.save")}
                    </AppButton>
                </DialogActions>
            </Dialog>

            <LoginDialog open={loginOpen} onClose={() => setLoginOpen(false)} />
        </>
    );
}
