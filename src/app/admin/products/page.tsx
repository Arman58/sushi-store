"use client";

import AddIcon from "@mui/icons-material/Add";
import CloseIcon from "@mui/icons-material/Close";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import ImageIcon from "@mui/icons-material/Image";
import {
    Alert,
    Autocomplete,
    Avatar,
    Box,
    Button,
    Chip,
    Container,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    IconButton,
    InputAdornment,
    LinearProgress,
    Paper,
    Skeleton,
    Snackbar,
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
import Image from "next/image";
import { type SetStateAction, useCallback, useEffect, useRef, useState } from "react";

import { getProductCoverUrl, getProductImageUrls } from "@/shared/lib/product-cover";
import { PageContainer, SectionTitle } from "@/shared/ui";

type ProductRow = {
    id: number;
    name: string;
    description: string | null;
    composition: string | null;
    price: number;
    weight: number | null;
    images?: unknown;
    mainImage?: string | null;
    isActive: boolean;
    categoryId: number | null;
    category: { name: string } | null;
};

/** `null` — форма закрыта; `{}` — создание; `ProductRow` — редактирование */
type EditingProduct = null | Record<string, never> | ProductRow;

const MAX_COMP_LEN = 80;

const emptyCreateForm = {
    name: "",
    price: "",
    weight: "",
    categoryId: "",
    composition: "",
    description: "",
};

function trimComposition(text: string | null): string {
    if (!text) return "—";
    const t = text.replace(/\s+/g, " ").trim();
    if (t.length <= MAX_COMP_LEN) return t;
    return `${t.slice(0, MAX_COMP_LEN).trimEnd()}…`;
}

function TableSkeleton() {
    return (
        <Table size="small">
            <TableHead>
                <TableRow>
                    {["ID", "Картинка", "Название", "Состав", "Категория", "Цена", "Статус", ""].map(
                        (h) => (
                            <TableCell key={h}>{h || <span />}</TableCell>
                        ),
                    )}
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
                            <Skeleton width={48} />
                        </TableCell>
                        <TableCell>
                            <Skeleton width={64} />
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

function AvailabilityToggle(props: {
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
                    label="Скрыто"
                    size="small"
                    color="error"
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
                    "aria-label": product.isActive ? "Скрыть товар" : "Показать товар",
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
    const [formSession, setFormSession] = useState(0);
    const [form, setForm] = useState(emptyCreateForm);
    const [images, setImages] = useState<string[]>([]);
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

    useEffect(() => {
        if (editingProduct === null) {
            setImages([]);
            return;
        }
        if (isProductRowEdit(editingProduct)) {
            setForm({
                name: editingProduct.name,
                price: String(editingProduct.price),
                weight: editingProduct.weight != null ? String(editingProduct.weight) : "",
                categoryId: editingProduct.categoryId != null ? String(editingProduct.categoryId) : "",
                composition: editingProduct.composition ?? "",
                description: editingProduct.description ?? "",
            });
            setImages(
                Array.isArray(editingProduct.images)
                    ? (editingProduct.images as string[])
                    : [],
            );
        } else {
            setForm({ ...emptyCreateForm });
            setImages([]);
        }
    }, [editingProduct, formSession]);

    const closeProductDialog = () => {
        if (!saveLoading) setEditingProduct(null);
    };

    const handleProductSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (editingProduct === null) return;

        const name = form.name.trim();
        const price = Number.parseFloat(form.price);
        const categoryId = Number.parseInt(form.categoryId, 10);
        const weightStr = form.weight.trim();
        let weight: number | undefined;
        if (weightStr !== "") {
            const w = Number.parseFloat(weightStr);
            if (Number.isNaN(w) || !Number.isFinite(w) || w < 0) {
                alert("Укажите корректный вес");
                return;
            }
            weight = Math.round(w);
        }

        if (!name) {
            alert("Укажите название");
            return;
        }
        if (Number.isNaN(price) || !Number.isFinite(price) || price < 0) {
            alert("Укажите корректную цену");
            return;
        }
        if (Number.isNaN(categoryId) || !Number.isInteger(categoryId) || categoryId < 1) {
            alert("Выберите категорию");
            return;
        }

        const isEdit = isProductRowEdit(editingProduct);
        const composition = form.composition.trim();
        const description = form.description.trim();
        const body: Record<string, unknown> = {
            name,
            price,
            categoryId,
            images,
        };
        if (isEdit) {
            body.composition = composition || null;
            body.description = description || null;
            body.weight = weight === undefined ? null : weight;
        } else {
            if (composition) body.composition = composition;
            if (description) body.description = description;
            if (weight !== undefined) body.weight = weight;
        }

        setSaveLoading(true);
        try {
            const res = isEdit
                ? await fetch(`/api/admin/products/${editingProduct.id}`, {
                      method: "PUT",
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
                setForm({ ...emptyCreateForm });
                setImages([]);
                await load({ silent: true });
            } else {
                let msg = `Ошибка ${res.status}`;
                try {
                    const err = (await res.json()) as { error?: string };
                    if (err.error) msg = err.error;
                } catch {
                    /* keep msg */
                }
                console.error(isEdit ? "Update product failed" : "Create product failed", res.status, msg);
                alert(msg);
            }
        } catch (err) {
            console.error("Product save network error", err);
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
                        alert("Не удалось обновить доступность");
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
            <ProductFormDialog
                formKey={formSession}
                editingProduct={editingProduct}
                open={editingProduct !== null}
                isEdit={editingProduct !== null && isProductRowEdit(editingProduct)}
                onClose={closeProductDialog}
                form={form}
                onFormChange={setForm}
                images={images}
                onImagesChange={setImages}
                onSubmit={handleProductSubmit}
                submitLoading={saveLoading}
            />
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
                                            <TableCell>Статус</TableCell>
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
                                                                    alt={product.name}
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
                                                                    —
                                                                </Box>
                                                            )}
                                                        </Box>
                                                    </TableCell>
                                                    <TableCell>{product.name}</TableCell>
                                                    <TableCell
                                                        sx={{
                                                            maxWidth: 280,
                                                            whiteSpace: "normal",
                                                            wordBreak: "break-word",
                                                        }}
                                                    >
                                                        {trimComposition(product.composition)}
                                                    </TableCell>
                                                    <TableCell>
                                                        {product.category?.name ?? "—"}
                                                    </TableCell>
                                                    <TableCell align="right">
                                                        {product.price.toLocaleString("ru-RU")} ֏
                                                    </TableCell>
                                                    <TableCell align="right">
                                                        <AvailabilityToggle
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
                                                    alt={product.name}
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
                                                    {product.name}
                                                </Typography>
                                                <Typography
                                                    sx={{
                                                        fontSize: "0.75rem",
                                                        color: "text.secondary",
                                                    }}
                                                    noWrap
                                                >
                                                    {product.category?.name ?? "—"}
                                                </Typography>
                                            </Box>
                                            <Box sx={{ textAlign: "right", flexShrink: 0 }}>
                                                <Typography sx={{ fontWeight: 700 }}>
                                                    {product.price.toLocaleString("ru-RU")} ֏
                                                </Typography>
                                                <Box sx={{ mt: -0.5 }}>
                                                    <AvailabilityToggle
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

type CreateForm = typeof emptyCreateForm;

type AdminCategory = { id: number; name: string };

function ProductFormDialog(props: {
    formKey: number;
    editingProduct: EditingProduct;
    open: boolean;
    isEdit: boolean;
    onClose: () => void;
    form: CreateForm;
    onFormChange: (v: CreateForm) => void;
    images: string[];
    onImagesChange: (value: SetStateAction<string[]>) => void;
    onSubmit: (e: React.FormEvent) => void | Promise<void>;
    submitLoading: boolean;
}) {
    const {
        formKey,
        editingProduct,
        form,
        isEdit,
        onFormChange,
        onClose,
        onSubmit,
        open,
        submitLoading,
        images,
        onImagesChange,
    } = props;

    const [categories, setCategories] = useState<AdminCategory[]>([]);
    const [newCategoryName, setNewCategoryName] = useState("");
    const [addCategoryLoading, setAddCategoryLoading] = useState(false);
    const [uploadLoading, setUploadLoading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const setField = (field: keyof CreateForm) => (e: React.ChangeEvent<HTMLInputElement>) => {
        onFormChange({ ...form, [field]: e.target.value });
    };

    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const res = await fetch("/api/admin/categories", { credentials: "same-origin" });
                if (!res.ok) return;
                const data = (await res.json()) as unknown;
                if (!cancelled && Array.isArray(data)) {
                    setCategories(
                        data
                            .filter(
                                (c): c is AdminCategory & { name: string } =>
                                    c !== null &&
                                    typeof c === "object" &&
                                    "id" in c &&
                                    "name" in c &&
                                    typeof (c as { id: unknown }).id === "number" &&
                                    typeof (c as { name: unknown }).name === "string"
                            )
                            .map((c) => ({ id: c.id, name: c.name })),
                    );
                }
            } catch {
                /* ignore */
            }
        })();
        return () => {
            cancelled = true;
        };
    }, []);

    const handleImageFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;

        setUploadLoading(true);
        try {
            const uploadPromises = Array.from(files).map(async (file) => {
                const formData = new FormData();
                formData.append("file", file);
                const res = await fetch("/api/upload", { method: "POST", body: formData });
                if (!res.ok) throw new Error("Upload failed");
                const data = (await res.json()) as { url: string };
                return data.url;
            });
            const newUrls = await Promise.all(uploadPromises);
            onImagesChange((prev) => [...prev, ...newUrls]);
        } catch (err) {
            alert(err instanceof Error ? err.message : "Ошибка сети при загрузке файла");
        } finally {
            setUploadLoading(false);
            e.target.value = "";
        }
    };

    const CATEGORY_DELETE_BLOCKED =
        "Нельзя удалить эту категорию, так как к ней привязаны товары!";

    const handleDeleteCategory = async (categoryId: number) => {
        try {
            const res = await fetch(`/api/admin/categories/${categoryId}`, {
                method: "DELETE",
                credentials: "same-origin",
            });
            if (res.ok) {
                setCategories((prev) => prev.filter((c) => c.id !== categoryId));
                if (form.categoryId === String(categoryId)) {
                    onFormChange({ ...form, categoryId: "" });
                }
                return;
            }
            if (res.status === 409) {
                try {
                    const body = (await res.json()) as { error?: string };
                    if (body.error) {
                        alert(body.error);
                    } else {
                        alert(CATEGORY_DELETE_BLOCKED);
                    }
                } catch {
                    alert(CATEGORY_DELETE_BLOCKED);
                }
                return;
            }
            let msg = `Ошибка ${res.status}`;
            try {
                const err = (await res.json()) as { error?: string };
                if (err.error) msg = err.error;
            } catch {
                /* keep */
            }
            alert(msg);
        } catch {
            alert("Ошибка сети при удалении категории.");
        }
    };

    const productNameDefault =
        editingProduct !== null && "id" in editingProduct && typeof (editingProduct as ProductRow).id === "number"
            ? (editingProduct as ProductRow).name
            : "";

    const textFieldFocusSx = {
        "& .MuiOutlinedInput-root": {
            "&.Mui-focused:not(.Mui-error) fieldset": { borderColor: "primary.main" },
        },
    } as const;

    const handleAddCategory = async () => {
        const name = newCategoryName.trim();
        if (!name || addCategoryLoading) return;
        setAddCategoryLoading(true);
        try {
            const res = await fetch("/api/admin/categories", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "same-origin",
                body: JSON.stringify({ name }),
            });
            if (!res.ok) {
                let msg = `Ошибка ${res.status}`;
                try {
                    const err = (await res.json()) as { error?: string };
                    if (err.error) msg = err.error;
                } catch {
                    /* keep */
                }
                alert(msg);
                return;
            }
            const created = (await res.json()) as { id: number; name: string };
            setCategories((prev) => {
                const next = [...prev, { id: created.id, name: created.name }];
                next.sort((a, b) => a.name.localeCompare(b.name, "ru"));
                return next;
            });
            onFormChange({ ...form, categoryId: String(created.id) });
            setNewCategoryName("");
        } catch {
            alert("Ошибка сети при создании категории");
        } finally {
            setAddCategoryLoading(false);
        }
    };

    return (
        <Dialog
            key={formKey}
            open={open}
            onClose={() => {
                if (!submitLoading) onClose();
            }}
            fullWidth
            maxWidth="md"
            disableScrollLock={false}
            sx={{
                "& .MuiDialog-container": {
                    alignItems: { xs: "stretch", md: "center" },
                },
                "& .MuiDialog-paper": {
                    display: "flex",
                    flexDirection: "column",
                    height: { xs: "100%", md: "auto" },
                    m: { xs: 0, md: 3 },
                    borderRadius: { xs: 0, md: 4 },
                },
            }}
        >
            <Box
                component="form"
                onSubmit={onSubmit}
                noValidate
                sx={{
                    display: "flex",
                    flexDirection: "column",
                    flex: 1,
                    minHeight: 0,
                    overflow: "hidden",
                }}
            >
                <DialogTitle sx={{ flexShrink: 0 }}>
                    {isEdit ? "Редактирование товара" : "Новый товар"}
                </DialogTitle>
                <DialogContent sx={{ flex: 1, overflowY: "auto", minHeight: 0 }}>
                    <Stack spacing={2} sx={{ pt: 1 }}>
                        <TextField
                            required
                            fullWidth
                            label="Название"
                            defaultValue={productNameDefault || ""}
                            onChange={setField("name")}
                            disabled={submitLoading}
                            sx={textFieldFocusSx}
                        />
                        <TextField
                            required
                            fullWidth
                            type="number"
                            label="Цена"
                            value={form.price}
                            onChange={setField("price")}
                            inputProps={{ min: 0, step: 1 }}
                            disabled={submitLoading}
                            slotProps={{
                                input: {
                                    endAdornment: (
                                        <InputAdornment position="end">֏</InputAdornment>
                                    ),
                                },
                            }}
                            sx={textFieldFocusSx}
                        />
                        <TextField
                            fullWidth
                            type="number"
                            label="Вес (г)"
                            value={form.weight}
                            onChange={setField("weight")}
                            inputProps={{ min: 0, step: 1 }}
                            disabled={submitLoading}
                            sx={textFieldFocusSx}
                        />
                        <Autocomplete<AdminCategory, false, false, false>
                            size="small"
                            fullWidth
                            options={categories}
                            getOptionLabel={(option) => option.name}
                            value={
                                form.categoryId
                                    ? (categories.find((c) => String(c.id) === form.categoryId) ??
                                        null)
                                    : null
                            }
                            onChange={(_, newValue) => {
                                onFormChange({
                                    ...form,
                                    categoryId: newValue ? String(newValue.id) : "",
                                });
                            }}
                            isOptionEqualToValue={(a, b) => {
                                if (a == null || b == null) return a === b;
                                return a.id === b.id;
                            }}
                            disabled={submitLoading}
                            renderInput={(params) => (
                                <TextField
                                    {...params}
                                    required
                                    label="Категория"
                                    sx={textFieldFocusSx}
                                />
                            )}
                            renderOption={(props, option) => {
                                const { key, ...other } = props;
                                return (
                                    <Box
                                        key={key}
                                        component="li"
                                        {...other}
                                        sx={{
                                            display: "flex",
                                            justifyContent: "space-between",
                                            alignItems: "center",
                                            width: "100%",
                                        }}
                                    >
                                        <span>{option.name}</span>
                                        <IconButton
                                            type="button"
                                            size="small"
                                            tabIndex={-1}
                                            disabled={submitLoading}
                                            aria-label={`Удалить категорию ${option.name}`}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                e.preventDefault();
                                                void handleDeleteCategory(option.id);
                                            }}
                                        >
                                            <CloseIcon fontSize="small" />
                                        </IconButton>
                                    </Box>
                                );
                            }}
                        />
                        <Stack direction="row" spacing={1} alignItems="center">
                            <TextField
                                size="small"
                                fullWidth
                                placeholder="Новая категория"
                                value={newCategoryName}
                                onChange={(e) => setNewCategoryName(e.target.value)}
                                disabled={submitLoading || addCategoryLoading}
                                onKeyDown={(e) => {
                                    if (e.key === "Enter") {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        void handleAddCategory();
                                    }
                                }}
                                sx={textFieldFocusSx}
                            />
                            <Button
                                type="button"
                                size="small"
                                variant="outlined"
                                onClick={() => void handleAddCategory()}
                                disabled={submitLoading || addCategoryLoading}
                                aria-label="Добавить категорию"
                            >
                                +
                            </Button>
                        </Stack>
                        <TextField
                            multiline
                            rows={2}
                            fullWidth
                            label="Состав"
                            value={form.composition}
                            onChange={setField("composition")}
                            disabled={submitLoading}
                            sx={textFieldFocusSx}
                        />
                        <TextField
                            multiline
                            rows={2}
                            fullWidth
                            label="Описание"
                            value={form.description}
                            onChange={setField("description")}
                            disabled={submitLoading}
                            sx={textFieldFocusSx}
                        />
                        <Box>
                            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                                Фото
                            </Typography>
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/*"
                                multiple
                                hidden
                                onChange={(e) => void handleImageFile(e)}
                            />
                            <Button
                                type="button"
                                variant="outlined"
                                startIcon={<CloudUploadIcon />}
                                onClick={() => fileInputRef.current?.click()}
                                disabled={submitLoading || uploadLoading}
                                fullWidth
                            >
                                {uploadLoading ? "Загружаем…" : "Выбрать изображения"}
                            </Button>
                            {uploadLoading ? (
                                <LinearProgress sx={{ mt: 1, borderRadius: 1 }} />
                            ) : null}
                            {images.length > 0 ? (
                                <Box
                                    sx={{
                                        mt: 1.5,
                                        display: "flex",
                                        gap: 1,
                                        flexWrap: "wrap",
                                    }}
                                >
                                    {images.map((url, index) => (
                                        <Box
                                            key={`${url}-${String(index)}`}
                                            sx={{
                                                display: "flex",
                                                alignItems: "center",
                                                gap: 0.5,
                                            }}
                                        >
                                            <Avatar
                                                src={url}
                                                alt=""
                                                variant="rounded"
                                                sx={{ width: 60, height: 60 }}
                                            />
                                            <IconButton
                                                size="small"
                                                onClick={() => {
                                                    onImagesChange((prev) =>
                                                        prev.filter((_, i) => i !== index),
                                                    );
                                                }}
                                                disabled={submitLoading}
                                                aria-label="Удалить фото"
                                            >
                                                <CloseIcon fontSize="small" />
                                            </IconButton>
                                        </Box>
                                    ))}
                                </Box>
                            ) : null}
                        </Box>
                    </Stack>
                </DialogContent>
                <DialogActions sx={{ p: 2, borderTop: "1px solid #eee", flexShrink: 0 }}>
                    <Button onClick={onClose} disabled={submitLoading}>
                        Отмена
                    </Button>
                    <Button type="submit" variant="contained" color="primary" disabled={submitLoading}>
                        {submitLoading
                            ? isEdit
                                ? "Сохраняем…"
                                : "Создаём…"
                            : isEdit
                              ? "Сохранить"
                              : "Создать"}
                    </Button>
                </DialogActions>
            </Box>
        </Dialog>
    );
}
