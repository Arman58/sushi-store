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
    useMediaQuery,
    useTheme,
} from "@mui/material";
import { useEffect, useRef, useState } from "react";
import { useForm, useWatch } from "react-hook-form";

import {
    emptyLocalizedJson,
    getLocalizedField,
} from "@/lib/i18n-utils";
import {
    IMAGE_UPLOAD_ACCEPT,
    validateImageUpload,
} from "@/lib/validate-image-upload";
import ruMessages from "@/messages/ru.json";
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

    const { control, handleSubmit, reset, register, setValue, getValues } =
        useForm<ProductDialogFormValues>({
            defaultValues: productDialogDefaults(editingProduct),
            mode: "onBlur",
        });

    useEffect(() => {
        reset(productDialogDefaults(editingProduct));
    }, [editingProduct, formKey, reset]);

    const [categories, setCategories] = useState<AdminCategory[]>([]);
    const [newCategoryName, setNewCategoryName] = useState(emptyLocalizedJson);
    const [addCategoryLoading, setAddCategoryLoading] = useState(false);
    const [uploadLoading, setUploadLoading] = useState(false);
    const [uploadErrorOpen, setUploadErrorOpen] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const unsupportedImageFormatMessage =
        ruMessages.admin.imageUpload.unsupportedFormat;

    const categoryIdWatch = useWatch({ control, name: "categoryId" });
    const images = useWatch({ control, name: "images" }) ?? [];

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
                alert(err instanceof Error ? err.message : "Ошибка сети при загрузке файла");
            }
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
                if (categoryIdWatch === String(categoryId)) {
                    setValue("categoryId", "");
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
            const created = (await res.json()) as { id: number; name: unknown };
            setCategories((prev) => {
                const next = [...prev, { id: created.id, name: created.name }];
                next.sort((a, b) =>
                    getLocalizedField(a.name, "hy").localeCompare(
                        getLocalizedField(b.name, "hy"),
                        "hy",
                    ),
                );
                return next;
            });
            setValue("categoryId", String(created.id), { shouldDirty: true });
            setNewCategoryName(emptyLocalizedJson());
        } catch {
            alert("Ошибка сети при создании категории");
        } finally {
            setAddCategoryLoading(false);
        }
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
                alert("Укажите корректный вес");
                return;
            }
            weight = Math.round(w);
        }

        if (!name.hy.trim() && !name.ru.trim() && !name.en.trim()) {
            alert("Укажите название хотя бы на одном языке");
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

        const modParsed = buildModifierPayload(values.modifierGroups);
        if (!modParsed.ok) {
            alert(modParsed.message);
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
        };

        await onSave(payload);
    };

    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down("md"));

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
                        {isEdit ? "Редактирование товара" : "Новый товар"}
                    </DialogTitle>
                    <DialogContent sx={{ flex: 1, overflowY: "auto", minHeight: 0 }}>
                        <Stack spacing={2} sx={{ pt: 1 }}>
                            <ProductLocalizedFieldsSection
                                control={control}
                                disabled={submitLoading}
                            />
                            <TextField
                                {...register("price")}
                                required
                                fullWidth
                                type="number"
                                label="Цена"
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
                                label="Вес (г)"
                                disabled={submitLoading}
                                inputProps={{ min: 0, step: 1 }}
                                sx={TEXT_FIELD_FOCUS_SX}
                            />
                            <Autocomplete<AdminCategory, false, false, false>
                                size="small"
                                fullWidth
                                options={categories}
                                getOptionLabel={(option) =>
                                    getLocalizedField(option.name, "hy")
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
                                        label="Категория"
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
                                                {getLocalizedField(option.name, "hy")}
                                            </span>
                                            <IconButton
                                                type="button"
                                                size="small"
                                                tabIndex={-1}
                                                disabled={submitLoading}
                                                aria-label={`Удалить категорию ${getLocalizedField(option.name, "hy")}`}
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
                            <Stack
                                direction={{ xs: "column", md: "row" }}
                                spacing={1}
                                alignItems={{ xs: "stretch", md: "flex-end" }}
                            >
                                <Box sx={{ flex: 1 }}>
                                    <LocalizedTextFields
                                        label="Новая категория"
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
                                    aria-label="Добавить категорию"
                                    sx={{ mb: 0.5 }}
                                >
                                    +
                                </Button>
                            </Stack>

                            <ProductModifiersSection
                                control={control}
                                disabled={submitLoading}
                            />

                            <Box>
                                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                                    Фото
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
                                                        setValue(
                                                            "images",
                                                            images.filter((_, i) => i !== index),
                                                            { shouldDirty: true },
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
                    <DialogActions
                        sx={{
                            p: 2,
                            borderTop: "1px solid #eee",
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
                            Отмена
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
                                    ? "Сохраняем…"
                                    : "Создаём…"
                                : isEdit
                                  ? "Сохранить"
                                  : "Создать"}
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
                    {unsupportedImageFormatMessage}
                </Alert>
            </Snackbar>
        </>
    );
}
