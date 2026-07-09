"use client";

import CloseIcon from "@mui/icons-material/Close";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import {
    Alert,
    Autocomplete,
    Avatar,
    Box,
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    IconButton,
    InputAdornment,
    LinearProgress,
    Snackbar,
    Stack,
    TextField,
    Typography,
} from "@mui/material";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { useForm, useWatch } from "react-hook-form";

import {
    useAdminContentLocale,
    useLocalizedFieldFn,
} from "@/features/admin/hooks/use-admin-content-locale";
import { useAITranslation } from "@/features/admin/hooks/use-ai-translation";
import { AdminLocalizationSection } from "@/features/admin/ui/admin-localization-section";
import {
    emptyLocalizedJson,
    getLocalizedField,
    mergeLocalizedTranslations,
} from "@/lib/i18n-utils";
import {
    IMAGE_UPLOAD_ACCEPT,
    validateImageUpload,
} from "@/lib/validate-image-upload";
import { showAppToast } from "@/shared/lib/show-app-toast";
import { useTabletDown } from "@/shared/lib/use-mobile-viewport";
import { LocalizedTextFields } from "@/shared/ui/localized-text-fields";

import {
    buildModifierPayload,
    type EditingProduct,
    productDialogDefaults,
    type ProductDialogFormValues,
    type ProductSavePayload,
    TEXT_FIELD_FOCUS_SX,
} from "./product-form-types";
import { ProductLocalizedFieldsSection } from "./product-localized-fields-section";
import { ProductModifiersSection } from "./product-modifiers-section";

export type { ProductSavePayload } from "./product-form-types";

type AdminCategory = { id: number; name: unknown };

export function ProductFormDialog(props: {
    formKey: number;
    editingProduct: EditingProduct;
    open: boolean;
    isEdit: boolean;
    onClose: () => void;
    onSave: (payload: ProductSavePayload) => Promise<void>;
    submitLoading: boolean;
}) {
    const { formKey, editingProduct, isEdit, onClose, onSave, open, submitLoading } = props;

    const t = useTranslations("admin.products");
    const tCommon = useTranslations("admin.common");
    const tImage = useTranslations("admin.imageUpload");
    const contentLocale = useAdminContentLocale();
    const lf = useLocalizedFieldFn();

    const { control, handleSubmit, reset, register, setValue, getValues } =
        useForm<ProductDialogFormValues>({
            defaultValues: productDialogDefaults(editingProduct),
            mode: "onBlur",
        });

    useEffect(() => {
        reset(productDialogDefaults(editingProduct));
    }, [editingProduct, formKey, reset]);

    const { translate, isTranslating } = useAITranslation();

    const handleAITranslate = async (): Promise<boolean> => {
        const values = getValues();
        const fieldsToTranslate: Record<string, string> = {};

        if (values.name?.ru) fieldsToTranslate.name = values.name.ru;
        if (values.composition?.ru) fieldsToTranslate.composition = values.composition.ru;
        if (values.description?.ru) fieldsToTranslate.description = values.description.ru;

        values.modifierGroups?.forEach((group, groupIdx) => {
            if (group.name?.ru) {
                fieldsToTranslate[`modifierGroups.${groupIdx}.name`] = group.name.ru;
            }
            group.modifiers?.forEach((modifier, modIdx) => {
                if (modifier.name?.ru) {
                    fieldsToTranslate[`modifierGroups.${groupIdx}.modifiers.${modIdx}.name`] =
                        modifier.name.ru;
                }
            });
        });

        if (Object.keys(fieldsToTranslate).length === 0) return false;

        const translated = await translate(fieldsToTranslate);
        if (!translated) return false;

        const setLocalizedField = (
            field: "name" | "composition" | "description",
            en?: string,
            hy?: string,
        ) => {
            setValue(
                field,
                mergeLocalizedTranslations(getValues(field), { en, hy }),
                { shouldDirty: true, shouldTouch: true, shouldValidate: true },
            );
        };

        setLocalizedField("name", translated.en.name, translated.hy.name);
        setLocalizedField(
            "composition",
            translated.en.composition,
            translated.hy.composition,
        );
        setLocalizedField(
            "description",
            translated.en.description,
            translated.hy.description,
        );

        const nextModifierGroups = (values.modifierGroups ?? []).map(
            (group, groupIdx) => ({
                ...group,
                name: mergeLocalizedTranslations(group.name, {
                    en: translated.en[`modifierGroups.${groupIdx}.name`],
                    hy: translated.hy[`modifierGroups.${groupIdx}.name`],
                }),
                modifiers: group.modifiers.map((modifier, modIdx) => ({
                    ...modifier,
                    name: mergeLocalizedTranslations(modifier.name, {
                        en: translated.en[
                            `modifierGroups.${groupIdx}.modifiers.${modIdx}.name`
                        ],
                        hy: translated.hy[
                            `modifierGroups.${groupIdx}.modifiers.${modIdx}.name`
                        ],
                    }),
                })),
            }),
        );
        setValue("modifierGroups", nextModifierGroups, {
            shouldDirty: true,
            shouldTouch: true,
        });

        return true;
    };

    const [categories, setCategories] = useState<AdminCategory[]>([]);
    const [newCategoryName, setNewCategoryName] = useState(emptyLocalizedJson);
    const [addCategoryLoading, setAddCategoryLoading] = useState(false);
    const [uploadLoading, setUploadLoading] = useState(false);
    const [uploadErrorOpen, setUploadErrorOpen] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const categoryIdWatch = useWatch({ control, name: "categoryId" });
    const images = useWatch({ control, name: "images" }) ?? [];
    const upsellIdsWatch = useWatch({ control, name: "upsellIds" }) ?? [];

    // Список товаров для выбора кросс-селла «с этим берут»
    const [allProducts, setAllProducts] = useState<
        { id: number; name: unknown }[]
    >([]);
    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const res = await fetch("/api/admin/products", {
                    credentials: "same-origin",
                });
                if (!res.ok) return;
                const data = (await res.json()) as unknown;
                if (!cancelled && Array.isArray(data)) {
                    setAllProducts(
                        data
                            .filter(
                                (p): p is { id: number; name: unknown } =>
                                    p !== null &&
                                    typeof p === "object" &&
                                    typeof (p as { id: unknown }).id ===
                                        "number",
                            )
                            .map((p) => ({ id: p.id, name: p.name })),
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
                                (c): c is AdminCategory =>
                                    c !== null &&
                                    typeof c === "object" &&
                                    "id" in c &&
                                    "name" in c &&
                                    typeof (c as { id: unknown }).id === "number",
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

    const showUploadFormatError = () => {
        setUploadErrorOpen(true);
    };

    const handleImageFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;

        const fileList = Array.from(files);
        const invalidFile = fileList.find((file) => !validateImageUpload(file).ok);
        if (invalidFile) {
            showUploadFormatError();
            e.target.value = "";
            return;
        }

        setUploadLoading(true);
        try {
            const uploadPromises = fileList.map(async (file) => {
                const formData = new FormData();
                formData.append("file", file);
                const res = await fetch("/api/upload", { method: "POST", body: formData });
                if (!res.ok) {
                    const body = (await res.json().catch(() => null)) as { error?: string } | null;
                    if (body?.error === "unsupported_image_format") {
                        throw new Error("unsupported_image_format");
                    }
                    throw new Error("Upload failed");
                }
                const data = (await res.json()) as { url: string };
                return data.url;
            });
            const newUrls = await Promise.all(uploadPromises);
            const cur = getValues("images");
            setValue("images", [...cur, ...newUrls], { shouldDirty: true });
        } catch (err) {
            if (err instanceof Error && err.message === "unsupported_image_format") {
                showUploadFormatError();
            } else {
                showAppToast(err instanceof Error ? err.message : t("uploadNetworkError"), "error");
            }
        } finally {
            setUploadLoading(false);
            e.target.value = "";
        }
    };

    const handleDeleteCategory = async (categoryId: number) => {
        try {
            const res = await fetch(`/api/admin/categories/${categoryId}`, {
                method: "DELETE",
                credentials: "same-origin",
            });
            if (res.ok) {
                setCategories((prev) => prev.filter((c) => c.id !== categoryId));
                if (categoryIdWatch === String(categoryId)) {
                    setValue("categoryId", "");
                }
                return;
            }
            if (res.status === 409) {
                try {
                    const body = (await res.json()) as { error?: string };
                    if (body.error) {
                        showAppToast(body.error, "error");
                    } else {
                        showAppToast(t("categoryDeleteBlocked"), "error");
                    }
                } catch {
                    showAppToast(t("categoryDeleteBlocked"), "error");
                }
                return;
            }
            let msg = `${tCommon("errorPrefix")} ${res.status}`;
            try {
                const err = (await res.json()) as { error?: string };
                if (err.error) msg = err.error;
            } catch {
                /* keep */
            }
            showAppToast(msg, "error");
        } catch {
            showAppToast(t("categoryDeleteNetworkError"), "error");
        }
    };

    const handleAddCategory = async () => {
        const name = newCategoryName;
        const hasName =
            name.hy.trim() || name.ru.trim() || name.en.trim();
        if (!hasName || addCategoryLoading) return;
        setAddCategoryLoading(true);
        try {
            const res = await fetch("/api/admin/categories", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "same-origin",
                body: JSON.stringify({ name }),
            });
            if (!res.ok) {
                let msg = `${tCommon("errorPrefix")} ${res.status}`;
                try {
                    const err = (await res.json()) as { error?: string };
                    if (err.error) msg = err.error;
                } catch {
                    /* keep */
                }
                showAppToast(msg, "error");
                return;
            }
            const created = (await res.json()) as { id: number; name: unknown };
            setCategories((prev) => {
                const next = [...prev, { id: created.id, name: created.name }];
                next.sort((a, b) =>
                    getLocalizedField(a.name, contentLocale).localeCompare(
                        getLocalizedField(b.name, contentLocale),
                        "hy",
                    ),
                );
                return next;
            });
            setValue("categoryId", String(created.id), { shouldDirty: true });
            setNewCategoryName(emptyLocalizedJson());
        } catch {
            showAppToast(t("categoryCreateNetworkError"), "error");
        } finally {
            setAddCategoryLoading(false);
        }
    };

    const handleNewCategoryTranslate = async (): Promise<boolean> => {
        if (!newCategoryName.ru?.trim()) return false;
        const translated = await translate({ name: newCategoryName.ru });
        if (!translated) return false;
        setNewCategoryName((prev) =>
            mergeLocalizedTranslations(prev, {
                en: translated.en.name,
                hy: translated.hy.name,
            }),
        );
        return true;
    };

    const onValid = async (values: ProductDialogFormValues) => {
        const name = values.name;
        const price = Number.parseFloat(values.price);
        const categoryId = Number.parseInt(values.categoryId, 10);
        const weightStr = values.weight.trim();
        let weight: number | null = null;
        if (weightStr !== "") {
            const w = Number.parseFloat(weightStr);
            if (Number.isNaN(w) || !Number.isFinite(w) || w < 0) {
                showAppToast(t("invalidWeight"), "error");
                return;
            }
            weight = Math.round(w);
        }

        if (!name.hy.trim() && !name.ru.trim() && !name.en.trim()) {
            showAppToast(t("nameRequired"), "error");
            return;
        }
        if (Number.isNaN(price) || !Number.isFinite(price) || price < 0) {
            showAppToast(t("invalidPrice"), "error");
            return;
        }
        if (Number.isNaN(categoryId) || !Number.isInteger(categoryId) || categoryId < 1) {
            showAppToast(t("categoryRequired"), "error");
            return;
        }

        const minQty = Number.parseInt(values.minQty || "1", 10);
        if (Number.isNaN(minQty) || minQty < 1 || minQty > 999) {
            showAppToast(t("invalidMinQty"), "error");
            return;
        }
        let maxQty: number | null = null;
        if (values.maxQty.trim() !== "") {
            maxQty = Number.parseInt(values.maxQty, 10);
            if (Number.isNaN(maxQty) || maxQty < 1 || maxQty > 999) {
                showAppToast(t("invalidMaxQty"), "error");
                return;
            }
            if (maxQty < minQty) {
                showAppToast(t("maxQtyLessThanMin"), "error");
                return;
            }
        }

        const modParsed = buildModifierPayload(values.modifierGroups);
        if (!modParsed.ok) {
            showAppToast(t("modifierGroupNameRequired", { n: modParsed.groupIndex }), "error");
            return;
        }

        const composition = values.composition;
        const description = values.description;
        const compositionPayload =
            !composition.hy.trim() &&
            !composition.ru.trim() &&
            !composition.en.trim()
                ? null
                : composition;
        const descriptionPayload =
            !description.hy.trim() &&
            !description.ru.trim() &&
            !description.en.trim()
                ? null
                : description;

        const payload: ProductSavePayload = {
            name,
            price: Math.round(price),
            categoryId,
            composition: compositionPayload,
            description: descriptionPayload,
            weight,
            images: values.images,
            modifierGroups: modParsed.modifierGroups,
            minQty,
            maxQty,
            upsellIds: values.upsellIds ?? [],
        };

        await onSave(payload);
    };

    const isMobile = useTabletDown();

    return (
        <>
            <Dialog
                key={formKey}
                open={open}
                onClose={() => {
                    if (!submitLoading) onClose();
                }}
                fullWidth
                fullScreen={isMobile}
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
                    onSubmit={(e) => void handleSubmit(onValid)(e)}
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
                        {isEdit ? t("editProduct") : t("newProduct")}
                    </DialogTitle>
                    <DialogContent sx={{ flex: 1, overflowY: "auto", minHeight: 0 }}>
                        <Stack spacing={2} sx={{ pt: 1 }}>
                             <ProductLocalizedFieldsSection
                                control={control}
                                disabled={submitLoading}
                                onTranslate={handleAITranslate}
                                translating={isTranslating}
                            />
                            <TextField
                                {...register("price")}
                                required
                                fullWidth
                                type="number"
                                label={tCommon("price")}
                                disabled={submitLoading}
                                inputProps={{ min: 0, step: 1 }}
                                slotProps={{
                                    input: {
                                        endAdornment: (
                                            <InputAdornment position="end">֏</InputAdornment>
                                        ),
                                    },
                                }}
                                sx={TEXT_FIELD_FOCUS_SX}
                            />
                            <TextField
                                {...register("weight")}
                                fullWidth
                                type="number"
                                label={t("weightGrams")}
                                disabled={submitLoading}
                                inputProps={{ min: 0, step: 1 }}
                                sx={TEXT_FIELD_FOCUS_SX}
                            />
                            <TextField
                                {...register("minQty")}
                                fullWidth
                                type="number"
                                label={t("minQty")}
                                disabled={submitLoading}
                                inputProps={{ min: 1, max: 999, step: 1 }}
                                helperText={t("minQtyHint")}
                                sx={TEXT_FIELD_FOCUS_SX}
                            />
                            <TextField
                                {...register("maxQty")}
                                fullWidth
                                type="number"
                                label={t("maxQty")}
                                disabled={submitLoading}
                                inputProps={{ min: 1, max: 999, step: 1 }}
                                helperText={t("maxQtyHint")}
                                sx={TEXT_FIELD_FOCUS_SX}
                            />
                            <Autocomplete
                                multiple
                                size="small"
                                options={allProducts.filter(
                                    (p) =>
                                        !isEdit ||
                                        !editingProduct ||
                                        !("id" in editingProduct) ||
                                        p.id !==
                                            (editingProduct as { id: number })
                                                .id,
                                )}
                                getOptionLabel={(option) =>
                                    lf(option.name)
                                }
                                isOptionEqualToValue={(o, v) => o.id === v.id}
                                value={upsellIdsWatch
                                    .map((id) =>
                                        allProducts.find((p) => p.id === id),
                                    )
                                    .filter(
                                        (
                                            p,
                                        ): p is { id: number; name: unknown } =>
                                            Boolean(p),
                                    )}
                                onChange={(_, value) =>
                                    setValue(
                                        "upsellIds",
                                        value.map((p) => p.id).slice(0, 12),
                                        { shouldDirty: true },
                                    )
                                }
                                disabled={submitLoading}
                                renderInput={(params) => (
                                    <TextField
                                        {...params}
                                        label={t("upsellLabel")}
                                        helperText={t("upsellHint")}
                                        sx={TEXT_FIELD_FOCUS_SX}
                                    />
                                )}
                            />
                            <Autocomplete<AdminCategory, false, false, false>
                                size="small"
                                fullWidth
                                options={categories}
                                getOptionLabel={(option) =>
                                    lf(option.name)
                                }
                                value={
                                    categoryIdWatch
                                        ? (categories.find((c) => String(c.id) === categoryIdWatch) ??
                                          null)
                                        : null
                                }
                                onChange={(_, newValue) => {
                                    setValue("categoryId", newValue ? String(newValue.id) : "", {
                                        shouldDirty: true,
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
                                        label={tCommon("category")}
                                        sx={TEXT_FIELD_FOCUS_SX}
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
                                            <span>
                                                {lf(option.name)}
                                            </span>
                                            <IconButton
                                                type="button"
                                                size="small"
                                                tabIndex={-1}
                                                disabled={submitLoading}
                                                aria-label={t("deleteCategoryAria", {
                                                    name: lf(option.name),
                                                })}
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
                            <AdminLocalizationSection
                                fieldValues={[newCategoryName]}
                                onTranslate={handleNewCategoryTranslate}
                                translating={isTranslating}
                                disabled={submitLoading || addCategoryLoading}
                            >
                                <Stack
                                    direction={{ xs: "column", md: "row" }}
                                    spacing={1}
                                    alignItems={{ xs: "stretch", md: "flex-end" }}
                                >
                                    <Box sx={{ flex: 1 }}>
                                        <LocalizedTextFields
                                            label={t("newCategory")}
                                            value={newCategoryName}
                                            onChange={setNewCategoryName}
                                            disabled={submitLoading || addCategoryLoading}
                                        />
                                    </Box>
                                    <Button
                                        type="button"
                                        size="small"
                                        variant="outlined"
                                        onClick={() => void handleAddCategory()}
                                        disabled={submitLoading || addCategoryLoading}
                                        aria-label={t("addCategory")}
                                        sx={{ mb: 0.5 }}
                                    >
                                        +
                                    </Button>
                                </Stack>
                            </AdminLocalizationSection>

                            <ProductModifiersSection
                                control={control}
                                disabled={submitLoading}
                                onTranslate={handleAITranslate}
                                translating={isTranslating}
                            />

                            <Box>
                                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                                    {t("photos")}
                                </Typography>
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept={IMAGE_UPLOAD_ACCEPT}
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
                                    {uploadLoading ? tCommon("uploading") : tCommon("chooseImages")}
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
                                                        setValue(
                                                            "images",
                                                            images.filter((_, i) => i !== index),
                                                            { shouldDirty: true },
                                                        );
                                                    }}
                                                    disabled={submitLoading}
                                                    aria-label={tCommon("removePhoto")}
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
                    <DialogActions
                        sx={{
                            p: 2,
                            borderTop: 1,
                            borderColor: "divider",
                            flexShrink: 0,
                            flexDirection: isMobile ? "column-reverse" : "row",
                            gap: isMobile ? 1 : 0,
                            "& .MuiButton-root": isMobile
                                ? { width: "100%", m: 0 }
                                : undefined,
                        }}
                    >
                        <Button
                            onClick={onClose}
                            disabled={submitLoading}
                            size={isMobile ? "large" : "medium"}
                        >
                            {tCommon("cancel")}
                        </Button>
                        <Button
                            type="submit"
                            variant="contained"
                            color="primary"
                            disabled={submitLoading}
                            size={isMobile ? "large" : "medium"}
                        >
                            {submitLoading
                                ? isEdit
                                    ? tCommon("saving")
                                    : tCommon("creating")
                                : isEdit
                                  ? tCommon("save")
                                  : tCommon("create")}
                        </Button>
                    </DialogActions>
                </Box>
            </Dialog>
            <Snackbar
                open={uploadErrorOpen}
                autoHideDuration={6000}
                onClose={() => setUploadErrorOpen(false)}
                anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
            >
                <Alert
                    onClose={() => setUploadErrorOpen(false)}
                    severity="error"
                    variant="filled"
                    sx={{ width: "100%" }}
                >
                    {tImage("unsupportedFormat")}
                </Alert>
            </Snackbar>
        </>
    );
}
