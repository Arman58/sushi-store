"use client";

import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import ImageIcon from "@mui/icons-material/Image";
import {
    Alert,
    Avatar,
    Box,
    Button,
    Chip,
    Container,
    IconButton,
    Paper,
    Skeleton,
    Snackbar,
    Switch,
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableRow,
    Typography,
} from "@mui/material";
import Image from "next/image";
import dynamic from "next/dynamic";
import { startTransition, useCallback, useEffect, useState } from "react";

import { getLocalizedField } from "@/lib/i18n-utils";
import { getProductCoverUrl, getProductImageUrls } from "@/shared/lib/product-cover";
import { PageContainer, SectionTitle } from "@/shared/ui";

import { ProductFormDialogShell } from "./product-form-dialog-shell";
import type { ProductSavePayload } from "./product-form-types";

const ProductFormDialog = dynamic(
    () =>
        import("./product-form-dialog").then((m) => m.ProductFormDialog),
    { ssr: false },
);

type ProductRow = {
    id: number;
    name: unknown;
    description: unknown;
    composition: unknown;
    price: number;
    weight: number | null;
    images?: unknown;
    mainImage?: string | null;
    isActive: boolean;
    categoryId: number | null;
    category: { name: unknown } | null;
    modifierGroups?: {
        id: number;
        name: string;
        required: boolean;
        maxChoices: number;
        position: number;
        modifiers: {
            id: number;
            name: string;
            priceDelta: number;
            position: number;
        }[];
    }[];
};

/** `null` - форма закрыта; `{}` - создание; `ProductRow` - редактирование */
type EditingProduct = null | Record<string, never> | ProductRow;

const MAX_COMP_LEN = 80;

function trimComposition(text: string | null): string {
    if (!text) return "-";
    const t = text.replace(/\s+/g, " ").trim();
    if (t.length <= MAX_COMP_LEN) return t;
    return `${t.slice(0, MAX_COMP_LEN).trimEnd()}…`;
}

function TableSkeleton() {
    return (
        <Table size="small">
            <TableHead>
                <TableRow>
                    {[
                        "ID",
                        "Картинка",
                        "Название",
                        "Состав",
                        "Категория",
                        "Цена",
                        "На витрине",
                        "",
                    ].map((h) => (
                        <TableCell key={h}>{h || <span />}</TableCell>
                    ))}
                </TableRow>
            </TableHead>
            <TableBody>
                {[0, 1, 2, 3, 4, 5].map((i) => (
                    <TableRow key={i}>
                        <TableCell>
                            <Skeleton width={32} />
                        </TableCell>
                        <TableCell>
                            <Skeleton variant="rectangular" width={50} height={50} />
                        </TableCell>
                        <TableCell>
                            <Skeleton width="80%" />
                        </TableCell>
                        <TableCell>
                            <Skeleton width="90%" />
                        </TableCell>
                        <TableCell>
                            <Skeleton width={100} />
                        </TableCell>
                        <TableCell>
                            <Skeleton width={100} />
                        </TableCell>
                        <TableCell>
                            <Skeleton width={52} />
                        </TableCell>
                        <TableCell>
                            <Box sx={{ display: "flex", justifyContent: "flex-end" }}>
                                <Skeleton variant="circular" width={32} height={32} />
                                <Skeleton variant="circular" width={32} height={32} sx={{ ml: 0.5 }} />
                            </Box>
                        </TableCell>
                    </TableRow>
                ))}
            </TableBody>
        </Table>
    );
}

function ShelfToggle(props: {
    product: ProductRow;
    disabled: boolean;
    onChange: (nextActive: boolean) => void;
}) {
    const { product, disabled, onChange } = props;
    return (
        <Box
            sx={{
                display: "flex",
                alignItems: "center",
                gap: 1,
                justifyContent: "flex-end",
            }}
        >
            {!product.isActive ? (
                <Chip
                    label="Снято"
                    size="small"
                    color="default"
                    variant="outlined"
                    sx={{ height: 20, fontSize: "11px" }}
                />
            ) : null}
            <Switch
                checked={product.isActive}
                onChange={(e) => onChange(e.target.checked)}
                disabled={disabled}
                size="small"
                inputProps={{
                    "aria-label": product.isActive ? "На витрине, выключить" : "Показать на витрине",
                }}
            />
        </Box>
    );
}

export default function AdminProductsPage() {
    const [products, setProducts] = useState<ProductRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [deletingId, setDeletingId] = useState<number | null>(null);
    const [editingProduct, setEditingProduct] = useState<EditingProduct>(null);
    const [shouldRenderForm, setShouldRenderForm] = useState(false);
    const [formSession, setFormSession] = useState(0);
    const [saveLoading, setSaveLoading] = useState(false);
    const [saveSuccessOpen, setSaveSuccessOpen] = useState(false);
    const [saveSuccessIsEdit, setSaveSuccessIsEdit] = useState(false);
    const [hideUndoOpen, setHideUndoOpen] = useState(false);
    const [hideUndoProductId, setHideUndoProductId] = useState<number | null>(null);
    const [rotatingMainId, setRotatingMainId] = useState<number | null>(null);

    const load = useCallback(async (options?: { silent?: boolean }) => {
        const silent = options?.silent === true;
        if (!silent) {
            setError(null);
            setLoading(true);
        }
        try {
            const res = await fetch("/api/admin/products", { credentials: "same-origin" });
            if (!res.ok) {
                if (res.status === 401) {
                    setError("Нет доступа. Войдите в админку.");
                } else {
                    setError("Не удалось загрузить товары.");
                }
                setProducts([]);
                return;
            }
            const data = (await res.json()) as ProductRow[];
            setProducts(Array.isArray(data) ? data : []);
        } catch {
            if (!silent) {
                setError("Ошибка сети.");
            }
            setProducts([]);
        } finally {
            if (!silent) setLoading(false);
        }
    }, []);

    useEffect(() => {
        void load();
    }, [load]);

    const isDialogOpen = editingProduct !== null;

    useEffect(() => {
        if (!isDialogOpen) {
            setShouldRenderForm(false);
            return;
        }

        setShouldRenderForm(false);
        const frame = window.requestAnimationFrame(() => {
            startTransition(() => {
                setShouldRenderForm(true);
            });
        });

        return () => {
            window.cancelAnimationFrame(frame);
        };
    }, [isDialogOpen, formSession]);

    const isProductRowEdit = (e: NonNullable<EditingProduct>): e is ProductRow =>
        "id" in e && typeof (e as ProductRow).id === "number";

    const handleAddClick = () => {
        setFormSession((n) => n + 1);
        setEditingProduct({} as Record<string, never>);
    };

    const handleEditClick = (product: ProductRow) => {
        setFormSession((n) => n + 1);
        setEditingProduct(product);
    };

    const closeProductDialog = () => {
        if (!saveLoading) {
            setEditingProduct(null);
            setShouldRenderForm(false);
        }
    };

    const handleSaveProduct = async (payload: ProductSavePayload) => {
        if (editingProduct === null) return;

        const isEdit = isProductRowEdit(editingProduct);
        const body: Record<string, unknown> = {
            name: payload.name,
            price: payload.price,
            categoryId: payload.categoryId,
            images: payload.images,
            modifierGroups: payload.modifierGroups,
        };
        if (isEdit) {
            body.composition = payload.composition;
            body.description = payload.description;
            body.weight = payload.weight;
        } else {
            if (payload.composition) body.composition = payload.composition;
            if (payload.description) body.description = payload.description;
            if (payload.weight !== null) body.weight = payload.weight;
        }

        setSaveLoading(true);
        try {
            const res = isEdit
                ? await fetch(`/api/admin/products/${editingProduct.id}`, {
                      method: "PATCH",
                      headers: { "Content-Type": "application/json" },
                      credentials: "same-origin",
                      body: JSON.stringify(body),
                  })
                : await fetch("/api/admin/products", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      credentials: "same-origin",
                      body: JSON.stringify(body),
                  });
            if (res.ok) {
                setSaveSuccessIsEdit(isEdit);
                setSaveSuccessOpen(true);
                setEditingProduct(null);
                await load({ silent: true });
            } else {
                let msg = `Ошибка ${res.status}`;
                try {
                    const err = (await res.json()) as { error?: string };
                    if (err.error) msg = err.error;
                } catch {
                    /* keep msg */
                }
                alert(msg);
            }
        } catch {
            alert(isEdit ? "Ошибка сети при сохранении товара" : "Ошибка сети при создании товара");
        } finally {
            setSaveLoading(false);
        }
    };

    const handleDelete = async (id: number) => {
        if (!window.confirm("Точно удалить?")) return;
        setDeletingId(id);
        try {
            const res = await fetch(`/api/admin/products/${id}`, {
                method: "DELETE",
                credentials: "same-origin",
            });
            if (res.ok) {
                setProducts((prev) => prev.filter((p) => p.id !== id));
            } else {
                alert("Не удалось удалить товар");
            }
        } catch {
            alert("Ошибка сети");
        } finally {
            setDeletingId(null);
        }
    };

    const handleCycleMainCover = useCallback(async (product: ProductRow) => {
        const urls = getProductImageUrls(product.images);
        if (urls.length < 2) return;
        const current = getProductCoverUrl(product);
        if (!current) return;
        const i = urls.indexOf(current);
        const next = urls[(i + 1) % urls.length];
        const body = next === urls[0] ? { mainImage: null } : { mainImage: next };

        setRotatingMainId(product.id);
        try {
            const res = await fetch(`/api/admin/products/${product.id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                credentials: "same-origin",
                body: JSON.stringify(body),
            });
            if (!res.ok) {
                let msg = "Не удалось сменить обложку";
                try {
                    const err = (await res.json()) as { error?: string };
                    if (err.error) msg = err.error;
                } catch {
                    /* keep msg */
                }
                alert(msg);
                return;
            }
            const updated = (await res.json()) as ProductRow;
            setProducts((prev) =>
                prev.map((p) => (p.id === updated.id ? { ...p, ...updated } : p)),
            );
        } catch {
            alert("Ошибка сети");
        } finally {
            setRotatingMainId(null);
        }
    }, []);

    const persistProductActive = useCallback(async (id: number, isActive: boolean) => {
        const res = await fetch(`/api/admin/products/${id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            credentials: "same-origin",
            body: JSON.stringify({ isActive }),
        });
        return res.ok;
    }, []);

    const handleAvailabilityChange = useCallback(
        (id: number, nextActive: boolean) => {
            setProducts((prev) =>
                prev.map((p) => (p.id === id ? { ...p, isActive: nextActive } : p)),
            );

            if (!nextActive) {
                setHideUndoProductId(id);
                setHideUndoOpen(true);
            }

            void (async () => {
                try {
                    const ok = await persistProductActive(id, nextActive);
                    if (!ok) {
                        setProducts((prev) =>
                            prev.map((p) =>
                                p.id === id ? { ...p, isActive: !nextActive } : p,
                            ),
                        );
                        if (!nextActive) {
                            setHideUndoOpen(false);
                            setHideUndoProductId(null);
                        }
                        alert("Не удалось сохранить «На витрине»");
                    }
                } catch {
                    setProducts((prev) =>
                        prev.map((p) =>
                            p.id === id ? { ...p, isActive: !nextActive } : p,
                        ),
                    );
                    if (!nextActive) {
                        setHideUndoOpen(false);
                        setHideUndoProductId(null);
                    }
                    alert("Ошибка сети");
                }
            })();
        },
        [persistProductActive],
    );

    const handleUndoHide = useCallback(() => {
        if (hideUndoProductId === null) return;
        const id = hideUndoProductId;
        setProducts((prev) =>
            prev.map((p) => (p.id === id ? { ...p, isActive: true } : p)),
        );
        setHideUndoOpen(false);
        setHideUndoProductId(null);
        void (async () => {
            try {
                const ok = await persistProductActive(id, true);
                if (!ok) {
                    setProducts((prev) =>
                        prev.map((p) => (p.id === id ? { ...p, isActive: false } : p)),
                    );
                    alert("Не удалось вернуть товар на витрину");
                }
            } catch {
                setProducts((prev) =>
                    prev.map((p) => (p.id === id ? { ...p, isActive: false } : p)),
                );
                alert("Ошибка сети");
            }
        })();
    }, [hideUndoProductId, persistProductActive]);

    return (
        <PageContainer>
            {isDialogOpen && !shouldRenderForm ? (
                <ProductFormDialogShell
                    open
                    isEdit={editingProduct !== null && isProductRowEdit(editingProduct)}
                    onClose={closeProductDialog}
                />
            ) : null}
            {isDialogOpen && shouldRenderForm ? (
                <ProductFormDialog
                    formKey={formSession}
                    editingProduct={editingProduct}
                    open
                    isEdit={editingProduct !== null && isProductRowEdit(editingProduct)}
                    onClose={closeProductDialog}
                    onSave={handleSaveProduct}
                    submitLoading={saveLoading}
                />
            ) : null}
            <Snackbar
                open={saveSuccessOpen}
                autoHideDuration={4000}
                onClose={() => setSaveSuccessOpen(false)}
                anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
            >
                <Alert
                    onClose={() => setSaveSuccessOpen(false)}
                    severity="success"
                    variant="filled"
                >
                    {saveSuccessIsEdit ? "Товар сохранён" : "Товар создан"}
                </Alert>
            </Snackbar>
            <Snackbar
                open={hideUndoOpen}
                autoHideDuration={4000}
                onClose={() => {
                    setHideUndoOpen(false);
                    setHideUndoProductId(null);
                }}
                anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
                message="Товар скрыт с витрины"
                action={
                    <Button color="inherit" size="small" onClick={handleUndoHide}>
                        Отмена
                    </Button>
                }
            />
            <Container maxWidth="lg" disableGutters>
                <SectionTitle>Товары (admin)</SectionTitle>

                {error && !loading ? (
                    <Box sx={{ mb: 2 }}>
                        <Button variant="outlined" onClick={() => void load()}>
                            Повторить
                        </Button>
                    </Box>
                ) : null}

                <Button
                    variant="outlined"
                    onClick={handleAddClick}
                    sx={{
                        mb: 2,
                        textTransform: "none",
                        fontWeight: 600,
                        borderColor: "rgba(0,0,0,0.2)",
                        color: "text.primary",
                        "&:hover": {
                            borderColor: "primary.main",
                            bgcolor: "primary.main",
                            color: "#fff",
                        },
                    }}
                >
                    <AddIcon fontSize="small" sx={{ mr: 1 }} />
                    Добавить товар
                </Button>

                <Paper elevation={0} variant="outlined" sx={{ overflow: "auto" }}>
                    {loading ? (
                        <>
                            <Box sx={{ display: { xs: "none", md: "block" } }}>
                                <TableSkeleton />
                            </Box>
                            <Box sx={{ display: { xs: "block", md: "none" }, mt: 2 }}>
                                {[0, 1, 2, 3].map((i) => (
                                    <Paper
                                        key={i}
                                        elevation={0}
                                        sx={{
                                            display: "flex",
                                            alignItems: "center",
                                            gap: 2,
                                            p: 1.5,
                                            mb: 1.5,
                                            borderRadius: 3,
                                        }}
                                    >
                                        <Skeleton variant="rounded" width={56} height={56} />
                                        <Box sx={{ flex: 1, minWidth: 0 }}>
                                            <Skeleton width="70%" />
                                            <Skeleton width="40%" sx={{ mt: 0.5 }} />
                                        </Box>
                                        <Box sx={{ textAlign: "right", flexShrink: 0 }}>
                                            <Skeleton width={64} sx={{ ml: "auto" }} />
                                            <Box
                                                sx={{
                                                    display: "flex",
                                                    justifyContent: "flex-end",
                                                    gap: 0.5,
                                                    mt: 0.5,
                                                }}
                                            >
                                                <Skeleton variant="circular" width={20} height={20} />
                                                <Skeleton variant="circular" width={20} height={20} />
                                            </Box>
                                        </Box>
                                    </Paper>
                                ))}
                            </Box>
                        </>
                    ) : error ? (
                        <Box sx={{ p: 2 }}>
                            <Typography color="error">{error}</Typography>
                        </Box>
                    ) : products.length === 0 ? (
                        <Box sx={{ p: 2 }}>
                            <Typography color="text.secondary">Список пуст.</Typography>
                        </Box>
                    ) : (
                        <>
                            <Box sx={{ display: { xs: "none", md: "block" } }}>
                                <Table size="small" stickyHeader>
                                    <TableHead>
                                        <TableRow>
                                            <TableCell>ID</TableCell>
                                            <TableCell>Картинка</TableCell>
                                            <TableCell>Название</TableCell>
                                            <TableCell>Состав</TableCell>
                                            <TableCell>Категория</TableCell>
                                            <TableCell align="right">Цена</TableCell>
                                            <TableCell align="right">На витрине</TableCell>
                                            <TableCell align="right" width={100} />
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {products.map((product) => {
                                            const thumb = getProductCoverUrl(product);
                                            const canCycleMain =
                                                getProductImageUrls(product.images).length >= 2;
                                            return (
                                                <TableRow
                                                    key={product.id}
                                                    hover
                                                    sx={{
                                                        transition: "all 0.3s ease",
                                                        opacity: product.isActive ? 1 : 0.6,
                                                        filter: product.isActive
                                                            ? "none"
                                                            : "grayscale(80%)",
                                                    }}
                                                >
                                                    <TableCell>{product.id}</TableCell>
                                                    <TableCell>
                                                        <Box
                                                            sx={{
                                                                position: "relative",
                                                                width: 50,
                                                                height: 50,
                                                                bgcolor: "action.hover",
                                                            }}
                                                        >
                                                            {thumb ? (
                                                                <Image
                                                                    src={thumb}
                                                                    alt={getLocalizedField(product.name, "hy")}
                                                                    width={50}
                                                                    height={50}
                                                                    style={{ objectFit: "cover" }}
                                                                    unoptimized
                                                                />
                                                            ) : (
                                                                <Box
                                                                    sx={{
                                                                        width: 50,
                                                                        height: 50,
                                                                        display: "flex",
                                                                        alignItems: "center",
                                                                        justifyContent: "center",
                                                                        typography: "caption",
                                                                        color: "text.disabled",
                                                                    }}
                                                                >
                                                                    -
                                                                </Box>
                                                            )}
                                                        </Box>
                                                    </TableCell>
                                                    <TableCell>
                                                        {getLocalizedField(product.name, "hy")}
                                                    </TableCell>
                                                    <TableCell
                                                        sx={{
                                                            maxWidth: 280,
                                                            whiteSpace: "normal",
                                                            wordBreak: "break-word",
                                                        }}
                                                    >
                                                        {trimComposition(
                                                            getLocalizedField(
                                                                product.composition,
                                                                "hy",
                                                            ) || null,
                                                        )}
                                                    </TableCell>
                                                    <TableCell>
                                                        {product.category
                                                            ? getLocalizedField(
                                                                  product.category.name,
                                                                  "hy",
                                                              )
                                                            : "-"}
                                                    </TableCell>
                                                    <TableCell align="right">
                                                        {product.price.toLocaleString("ru-RU")} ֏
                                                    </TableCell>
                                                    <TableCell align="right">
                                                        <ShelfToggle
                                                            product={product}
                                                            disabled={
                                                                deletingId === product.id || saveLoading
                                                            }
                                                            onChange={(next) =>
                                                                handleAvailabilityChange(
                                                                    product.id,
                                                                    next,
                                                                )
                                                            }
                                                        />
                                                    </TableCell>
                                                    <TableCell align="right">
                                                        <Box
                                                            sx={{
                                                                display: "flex",
                                                                flexDirection: "column",
                                                                alignItems: "flex-end",
                                                                gap: 0.75,
                                                            }}
                                                        >
                                                            <Box
                                                                sx={{
                                                                    display: "inline-flex",
                                                                    alignItems: "center",
                                                                    justifyContent: "flex-end",
                                                                }}
                                                            >
                                                                <IconButton
                                                                    size="small"
                                                                    color="primary"
                                                                    onClick={() => handleEditClick(product)}
                                                                    disabled={
                                                                        deletingId === product.id ||
                                                                        saveLoading
                                                                    }
                                                                    aria-label="Редактировать"
                                                                >
                                                                    <EditIcon fontSize="small" />
                                                                </IconButton>
                                                                <IconButton
                                                                    size="small"
                                                                    color="error"
                                                                    disabled={deletingId === product.id}
                                                                    onClick={() => void handleDelete(product.id)}
                                                                    aria-label="Удалить"
                                                                >
                                                                    <DeleteIcon fontSize="small" />
                                                                </IconButton>
                                                            </Box>
                                                            {canCycleMain ? (
                                                                <Button
                                                                    variant="outlined"
                                                                    size="small"
                                                                    onClick={() =>
                                                                        void handleCycleMainCover(product)
                                                                    }
                                                                    disabled={
                                                                        deletingId === product.id ||
                                                                        saveLoading ||
                                                                        rotatingMainId === product.id
                                                                    }
                                                                    sx={{
                                                                        fontSize: "0.7rem",
                                                                        px: 1,
                                                                        py: 0.25,
                                                                        minWidth: 0,
                                                                        whiteSpace: "nowrap",
                                                                    }}
                                                                >
                                                                    Сделать главной
                                                                </Button>
                                                            ) : null}
                                                        </Box>
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        })}
                                    </TableBody>
                                </Table>
                            </Box>
                            <Box sx={{ display: { xs: "block", md: "none" }, mt: 2 }}>
                                {products.map((product) => {
                                    const imageUrl = getProductCoverUrl(product);
                                    const showImage = Boolean(imageUrl);
                                    const canCycleMain =
                                        getProductImageUrls(product.images).length >= 2;

                                    return (
                                        <Paper
                                            key={product.id}
                                            elevation={0}
                                            sx={{
                                                display: "flex",
                                                alignItems: "center",
                                                gap: 2,
                                                p: 1.5,
                                                mb: 1.5,
                                                borderRadius: 3,
                                                transition: "all 0.3s ease",
                                                opacity: product.isActive ? 1 : 0.6,
                                                filter: product.isActive
                                                    ? "none"
                                                    : "grayscale(80%)",
                                            }}
                                        >
                                            {showImage ? (
                                                <Avatar
                                                    src={imageUrl ?? undefined}
                                                    variant="rounded"
                                                    sx={{ width: 56, height: 56 }}
                                                    alt={getLocalizedField(product.name, "hy")}
                                                />
                                            ) : (
                                                <Avatar
                                                    variant="rounded"
                                                    sx={{
                                                        width: 56,
                                                        height: 56,
                                                        bgcolor: "#f5f5f5",
                                                    }}
                                                >
                                                    <ImageIcon />
                                                </Avatar>
                                            )}
                                            <Box sx={{ flex: 1, minWidth: 0 }}>
                                                <Typography noWrap sx={{ fontWeight: 600 }}>
                                                    {getLocalizedField(product.name, "hy")}
                                                </Typography>
                                                <Typography
                                                    sx={{
                                                        fontSize: "0.75rem",
                                                        color: "text.secondary",
                                                    }}
                                                    noWrap
                                                >
                                                    {product.category
                                                        ? getLocalizedField(
                                                              product.category.name,
                                                              "hy",
                                                          )
                                                        : "-"}
                                                </Typography>
                                            </Box>
                                            <Box sx={{ textAlign: "right", flexShrink: 0 }}>
                                                <Typography sx={{ fontWeight: 700 }}>
                                                    {product.price.toLocaleString("ru-RU")} ֏
                                                </Typography>
                                                <Box sx={{ mt: -0.5 }}>
                                                    <Typography
                                                        component="span"
                                                        variant="caption"
                                                        color="text.secondary"
                                                        sx={{
                                                            fontSize: "0.65rem",
                                                            lineHeight: 1,
                                                            display: "block",
                                                            textAlign: "right",
                                                        }}
                                                    >
                                                        На витрине
                                                    </Typography>
                                                    <ShelfToggle
                                                        product={product}
                                                        disabled={
                                                            deletingId === product.id || saveLoading
                                                        }
                                                        onChange={(next) =>
                                                            handleAvailabilityChange(
                                                                product.id,
                                                                next,
                                                            )
                                                        }
                                                    />
                                                </Box>
                                                <Box
                                                    sx={{
                                                        display: "flex",
                                                        flexDirection: "column",
                                                        alignItems: "flex-end",
                                                        gap: 0.5,
                                                        mt: 0.25,
                                                    }}
                                                >
                                                    <Box
                                                        sx={{
                                                            display: "flex",
                                                            justifyContent: "flex-end",
                                                            gap: 0,
                                                        }}
                                                    >
                                                        <IconButton
                                                            size="small"
                                                            color="primary"
                                                            onClick={() => handleEditClick(product)}
                                                            disabled={
                                                                deletingId === product.id || saveLoading
                                                            }
                                                            aria-label="Редактировать"
                                                        >
                                                            <EditIcon sx={{ fontSize: 20 }} />
                                                        </IconButton>
                                                        <IconButton
                                                            size="small"
                                                            color="error"
                                                            disabled={deletingId === product.id}
                                                            onClick={() =>
                                                                void handleDelete(product.id)
                                                            }
                                                            aria-label="Удалить"
                                                        >
                                                            <DeleteIcon sx={{ fontSize: 20 }} />
                                                        </IconButton>
                                                    </Box>
                                                    {canCycleMain ? (
                                                        <Button
                                                            variant="outlined"
                                                            size="small"
                                                            onClick={() =>
                                                                void handleCycleMainCover(product)
                                                            }
                                                            disabled={
                                                                deletingId === product.id ||
                                                                saveLoading ||
                                                                rotatingMainId === product.id
                                                            }
                                                            sx={{
                                                                fontSize: "0.7rem",
                                                                px: 1,
                                                                py: 0.25,
                                                                minWidth: 0,
                                                            }}
                                                        >
                                                            Сделать главной
                                                        </Button>
                                                    ) : null}
                                                </Box>
                                            </Box>
                                        </Paper>
                                    );
                                })}
                            </Box>
                        </>
                    )}
                </Paper>
            </Container>
        </PageContainer>
    );
}

