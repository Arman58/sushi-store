"use client";

import AddIcon from "@mui/icons-material/Add";
import {
    Alert,
    Box,
    Button,
    Container,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Fab,
    Paper,
    Snackbar,
    Typography,
} from "@mui/material";
import dynamic from "next/dynamic";
import { useTranslations } from "next-intl";
import {
    startTransition,
    useCallback,
    useEffect,
    useMemo,
    useState,
} from "react";

import { useAdminContentLocale } from "@/features/admin/hooks/use-admin-content-locale";
import { getLocalizedField } from "@/lib/i18n-utils";
import { getProductCoverUrl, getProductImageUrls } from "@/shared/lib/product-cover";
import { showAppToast } from "@/shared/lib/show-app-toast";
import { PageContainer, SectionTitle } from "@/shared/ui";

import { ProductFormDialogShell } from "./product-form-dialog-shell";
import type { ProductSavePayload } from "./product-form-types";
import type {
    EditingProduct,
    ProductRow,
    ProductRowActions,
} from "./product-row-types";
import { ProductsDesktopTable } from "./products-desktop-table";
import { ProductsMobileList } from "./products-mobile-list";
import { MobileListSkeleton, TableSkeleton } from "./products-skeletons";
import {
    countActiveFilters,
    DEFAULT_PRODUCT_VIEW,
    filterAndSortProducts,
    type ProductSortBy,
    ProductsToolbar,
    type ProductTableView,
} from "./products-table-controls";
import { ProductsTablePagination } from "./products-table-pagination";

const ProductFormDialog = dynamic(
    () =>
        import("./product-form-dialog").then((m) => m.ProductFormDialog),
    { ssr: false },
);

export default function AdminProductsPage() {
    const t = useTranslations("admin.products");
    const tCommon = useTranslations("admin.common");
    const contentLocale = useAdminContentLocale();
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
    const [view, setView] = useState<ProductTableView>(DEFAULT_PRODUCT_VIEW);
    const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);

    const patchView = useCallback((patch: Partial<ProductTableView>) => {
        setView((prev) => ({ ...prev, ...patch }));
    }, []);

    const handleSort = useCallback((column: ProductSortBy) => {
        setView((prev) => ({
            ...prev,
            sortBy: column,
            sortDir:
                prev.sortBy === column && prev.sortDir === "asc"
                    ? "desc"
                    : "asc",
            page: 0,
        }));
    }, []);

    const categoryOptions = useMemo(() => {
        const map = new Map<number, string>();
        for (const p of products) {
            if (p.categoryId !== null && p.category) {
                map.set(
                    p.categoryId,
                    getLocalizedField(p.category.name, contentLocale),
                );
            }
        }
        return [...map.entries()]
            .map(([id, label]) => ({ id, label }))
            .sort((a, b) => a.label.localeCompare(b.label, contentLocale));
    }, [products, contentLocale]);

    const filteredProducts = useMemo(
        () => filterAndSortProducts(products, view, contentLocale),
        [products, view, contentLocale],
    );

    /** Страница не выходит за пределы после сужения фильтра/удаления. */
    const safePage = Math.min(
        view.page,
        Math.max(0, Math.ceil(filteredProducts.length / view.rowsPerPage) - 1),
    );

    const pagedProducts = useMemo(() => {
        const start = safePage * view.rowsPerPage;
        return filteredProducts.slice(start, start + view.rowsPerPage);
    }, [filteredProducts, safePage, view.rowsPerPage]);

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
                    setError(tCommon("accessDenied"));
                } else {
                    setError(t("loadFailed"));
                }
                setProducts([]);
                return;
            }
            const data = (await res.json()) as ProductRow[];
            setProducts(Array.isArray(data) ? data : []);
        } catch {
            if (!silent) {
                setError(tCommon("networkError"));
            }
            setProducts([]);
        } finally {
            if (!silent) setLoading(false);
        }
    }, [t, tCommon]);

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

    const handleEditClick = useCallback(async (product: ProductRow) => {
        try {
            const res = await fetch(`/api/admin/products/${product.id}`, {
                credentials: "same-origin",
            });
            if (res.ok) {
                const detail = (await res.json()) as ProductRow;
                setFormSession((n) => n + 1);
                setEditingProduct({ ...product, ...detail });
                return;
            }
        } catch {
            // Fall through to list-row edit without modifiers.
        }
        setFormSession((n) => n + 1);
        setEditingProduct(product);
    }, []);

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
            minQty: payload.minQty,
            maxQty: payload.maxQty,
            upsellIds: payload.upsellIds,
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
                let msg = `${tCommon("errorPrefix")} ${res.status}`;
                try {
                    const err = (await res.json()) as { error?: string };
                    if (err.error) msg = err.error;
                } catch {
                    /* keep msg */
                }
                showAppToast(msg, "error");
            }
        } catch {
            showAppToast(isEdit ? t("saveNetworkError") : t("createNetworkError"), "error");
        } finally {
            setSaveLoading(false);
        }
    };

    const handleDelete = useCallback(async (id: number) => {
        setConfirmDeleteId(null);
        setDeletingId(id);
        try {
            const res = await fetch(`/api/admin/products/${id}`, {
                method: "DELETE",
                credentials: "same-origin",
            });
            if (res.ok) {
                setProducts((prev) => prev.filter((p) => p.id !== id));
            } else {
                showAppToast(t("deleteFailed"), "error");
            }
        } catch {
            showAppToast(tCommon("networkError"), "error");
        } finally {
            setDeletingId(null);
        }
    }, [t, tCommon]);

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
                let msg = t("coverChangeFailed");
                try {
                    const err = (await res.json()) as { error?: string };
                    if (err.error) msg = err.error;
                } catch {
                    /* keep msg */
                }
                showAppToast(msg, "error");
                return;
            }
            const updated = (await res.json()) as ProductRow;
            setProducts((prev) =>
                prev.map((p) => (p.id === updated.id ? { ...p, ...updated } : p)),
            );
        } catch {
            showAppToast(tCommon("networkError"), "error");
        } finally {
            setRotatingMainId(null);
        }
    }, [t, tCommon]);

    const handleAvailableChange = useCallback(
        (id: number, isAvailable: boolean) => {
            setProducts((prev) =>
                prev.map((p) => (p.id === id ? { ...p, isAvailable } : p)),
            );
            void (async () => {
                try {
                    const res = await fetch(`/api/admin/products/${id}`, {
                        method: "PUT",
                        headers: { "Content-Type": "application/json" },
                        credentials: "same-origin",
                        body: JSON.stringify({ isAvailable }),
                    });
                    if (!res.ok) throw new Error();
                } catch {
                    setProducts((prev) =>
                        prev.map((p) =>
                            p.id === id ? { ...p, isAvailable: !isAvailable } : p,
                        ),
                    );
                    showAppToast(t("inStockSaveFailed"), "error");
                }
            })();
        },
        [t],
    );

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
                        showAppToast(t("onShelfSaveFailed"), "error");
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
                    showAppToast(tCommon("networkError"), "error");
                }
            })();
        },
        [persistProductActive, t, tCommon],
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
                    showAppToast(t("restoreShelfFailed"), "error");
                }
            } catch {
                setProducts((prev) =>
                    prev.map((p) => (p.id === id ? { ...p, isActive: false } : p)),
                );
                showAppToast(tCommon("networkError"), "error");
            }
        })();
    }, [hideUndoProductId, persistProductActive, t, tCommon]);

    const rowActions: ProductRowActions = useMemo(
        () => ({
            deletingId,
            saveLoading,
            rotatingMainId,
            onEdit: handleEditClick,
            onRequestDelete: setConfirmDeleteId,
            onDeleteNow: (id) => void handleDelete(id),
            onCycleMainCover: (product) => void handleCycleMainCover(product),
            onShelfChange: handleAvailabilityChange,
            onStockChange: handleAvailableChange,
        }),
        [
            deletingId,
            saveLoading,
            rotatingMainId,
            handleEditClick,
            handleDelete,
            handleCycleMainCover,
            handleAvailabilityChange,
            handleAvailableChange,
        ],
    );

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
                    {saveSuccessIsEdit ? t("saved") : t("created")}
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
                message={t("hiddenFromShelf")}
                action={
                    <Button color="inherit" size="small" onClick={handleUndoHide}>
                        {tCommon("cancel")}
                    </Button>
                }
            />
            <Dialog
                open={confirmDeleteId !== null}
                onClose={() => setConfirmDeleteId(null)}
                maxWidth="xs"
                fullWidth
            >
                <DialogTitle>{t("deleteTitle")}</DialogTitle>
                <DialogContent>
                    <Typography variant="body2" color="text.secondary">
                        {t("deleteBody")}
                    </Typography>
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2 }}>
                    <Button onClick={() => setConfirmDeleteId(null)} color="inherit">
                        {tCommon("cancel")}
                    </Button>
                    <Button
                        color="error"
                        variant="contained"
                        sx={{ fontWeight: 700 }}
                        onClick={() => {
                            if (confirmDeleteId !== null)
                                void handleDelete(confirmDeleteId);
                        }}
                    >
                        {tCommon("delete")}
                    </Button>
                </DialogActions>
            </Dialog>

            <Container maxWidth="lg" disableGutters>
                <SectionTitle>{t("title")}</SectionTitle>

                {error && !loading ? (
                    <Box sx={{ mb: 2 }}>
                        <Button variant="outlined" onClick={() => void load()}>
                            {tCommon("retry")}
                        </Button>
                    </Box>
                ) : null}

                <Button
                    variant="outlined"
                    onClick={handleAddClick}
                    sx={{
                        mb: 2,
                        display: { xs: "none", md: "inline-flex" },
                        textTransform: "none",
                        fontWeight: 600,
                        borderColor: "divider",
                        color: "text.primary",
                        "&:hover": {
                            borderColor: "primary.main",
                            bgcolor: "primary.main",
                            color: "primary.contrastText",
                        },
                    }}
                >
                    <AddIcon fontSize="small" sx={{ mr: 1 }} />
                    {t("addProduct")}
                </Button>

                <Fab
                    color="primary"
                    aria-label={t("addProduct")}
                    onClick={handleAddClick}
                    sx={{
                        display: { xs: "flex", md: "none" },
                        position: "fixed",
                        right: 16,
                        bottom: "calc(16px + env(safe-area-inset-bottom))",
                        zIndex: 1100,
                    }}
                >
                    <AddIcon />
                </Fab>

                {!loading && !error && products.length > 0 ? (
                    <ProductsToolbar
                        view={view}
                        categories={categoryOptions}
                        totalCount={products.length}
                        filteredCount={filteredProducts.length}
                        onChange={patchView}
                        contentLocale={contentLocale}
                    />
                ) : null}

                <Paper
                    elevation={0}
                    variant="outlined"
                    sx={{
                        overflow: "auto",
                        pb: { xs: 10, md: 0 },
                    }}
                >
                    {loading ? (
                        <>
                            <Box sx={{ display: { xs: "none", md: "block" } }}>
                                <TableSkeleton />
                            </Box>
                            <MobileListSkeleton />
                        </>
                    ) : error ? (
                        <Box sx={{ p: 2 }}>
                            <Typography color="error">{error}</Typography>
                        </Box>
                    ) : products.length === 0 ? (
                        <Box sx={{ p: 2 }}>
                            <Typography color="text.secondary">{t("emptyList")}</Typography>
                        </Box>
                    ) : filteredProducts.length === 0 ? (
                        <Box sx={{ p: 3, textAlign: "center" }}>
                            <Typography color="text.secondary" sx={{ mb: 1 }}>
                                {t("emptyFiltered")}
                            </Typography>
                            <Button
                                size="small"
                                onClick={() =>
                                    patchView({
                                        ...DEFAULT_PRODUCT_VIEW,
                                        rowsPerPage: view.rowsPerPage,
                                    })
                                }
                            >
                                {t("resetFiltersChip", {
                                    count: countActiveFilters(view),
                                })}
                            </Button>
                        </Box>
                    ) : (
                        <>
                            <ProductsDesktopTable
                                products={pagedProducts}
                                view={view}
                                onSort={handleSort}
                                actions={rowActions}
                            />
                            <ProductsMobileList
                                products={pagedProducts}
                                actions={rowActions}
                            />
                            <ProductsTablePagination
                                count={filteredProducts.length}
                                page={safePage}
                                rowsPerPage={view.rowsPerPage}
                                onPatchView={patchView}
                            />
                        </>
                    )}
                </Paper>
            </Container>
        </PageContainer>
    );
}
