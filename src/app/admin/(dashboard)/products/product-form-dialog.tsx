"use client";

import AddIcon from "@mui/icons-material/Add";
import ArrowDownwardIcon from "@mui/icons-material/ArrowDownward";
import ArrowUpwardIcon from "@mui/icons-material/ArrowUpward";
import CloseIcon from "@mui/icons-material/Close";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import DeleteIcon from "@mui/icons-material/Delete";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import {
    Accordion,
    AccordionDetails,
    AccordionSummary,
    Autocomplete,
    Avatar,
    Box,
    Button,
    Chip,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    FormControlLabel,
    IconButton,
    InputAdornment,
    LinearProgress,
    Stack,
    Switch,
    TextField,
    Typography,
} from "@mui/material";
import { useEffect, useRef, useState } from "react";
import {
    type Control,
    Controller,
    useFieldArray,
    useForm,
    useWatch,
} from "react-hook-form";

import type { AdminModifierGroupInput } from "@/lib/admin-product-modifiers";
import {
    emptyLocalizedJson,
    getLocalizedField,
    type LocalizedJson,
    parseLocalizedJson,
} from "@/lib/i18n-utils";
import { LocalizedTextFields } from "@/shared/ui/localized-text-fields";

export type ProductSavePayload = {
    name: LocalizedJson;
    price: number;
    categoryId: number;
    composition: LocalizedJson | null;
    description: LocalizedJson | null;
    weight: number | null;
    images: string[];
    modifierGroups: AdminModifierGroupInput[];
};

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
        name: unknown;
        required: boolean;
        maxChoices: number;
        position: number;
        modifiers: {
            id: number;
            name: unknown;
            priceDelta: number;
            position: number;
        }[];
    }[];
};

type EditingProduct = null | Record<string, never> | ProductRow;

type ProductDialogFormValues = {
    name: LocalizedJson;
    price: string;
    weight: string;
    categoryId: string;
    composition: LocalizedJson;
    description: LocalizedJson;
    images: string[];
    modifierGroups: {
        /** id присутствует для существующих групп; undefined для новых, добавленных в UI. */
        id?: number;
        name: LocalizedJson;
        required: boolean;
        maxChoices: number;
        modifiers: {
            id?: number;
            name: LocalizedJson;
            priceDelta: number;
        }[];
    }[];
};

function hasLocalizedText(value: LocalizedJson): boolean {
    return Boolean(value.hy.trim() || value.ru.trim() || value.en.trim());
}

function toLocalizedPayload(value: LocalizedJson): {
    hy: string;
    ru: string;
    en: string;
} {
    return {
        hy: value.hy ?? "",
        ru: value.ru ?? "",
        en: value.en ?? "",
    };
}

const TEXT_FIELD_FOCUS_SX = {
    "& .MuiOutlinedInput-root": {
        "&.Mui-focused:not(.Mui-error) fieldset": { borderColor: "primary.main" },
    },
} as const;

function emptyProductDialogForm(): ProductDialogFormValues {
    return {
        name: emptyLocalizedJson(),
        price: "",
        weight: "",
        categoryId: "",
        composition: emptyLocalizedJson(),
        description: emptyLocalizedJson(),
        images: [],
        modifierGroups: [],
    };
}

function productDialogDefaults(editingProduct: EditingProduct): ProductDialogFormValues {
    if (editingProduct === null || !("id" in editingProduct)) {
        return emptyProductDialogForm();
    }
    const p = editingProduct as ProductRow;
    // Сортируем группы и опции по position. Бэк уже сортирует, но это страхует
    // от случаев, когда товар приходит из другого источника (импорт, тесты).
    const sortedGroups = [...(p.modifierGroups ?? [])].sort(
        (a, b) => a.position - b.position || a.id - b.id,
    );
    return {
        name: parseLocalizedJson(p.name),
        price: String(p.price),
        weight: p.weight != null ? String(p.weight) : "",
        categoryId: p.categoryId != null ? String(p.categoryId) : "",
        composition: parseLocalizedJson(p.composition),
        description: parseLocalizedJson(p.description),
        images: Array.isArray(p.images) ? (p.images as string[]) : [],
        modifierGroups: sortedGroups.map((g) => ({
            id: g.id,
            name: parseLocalizedJson(g.name),
            required: g.required,
            maxChoices: g.maxChoices,
            modifiers: [...(g.modifiers ?? [])]
                .sort((a, b) => a.position - b.position || a.id - b.id)
                .map((m) => ({
                    id: m.id,
                    name: parseLocalizedJson(m.name),
                    priceDelta: m.priceDelta,
                })),
        })),
    };
}

function buildModifierPayload(
    groups: ProductDialogFormValues["modifierGroups"],
): { ok: true; modifierGroups: AdminModifierGroupInput[] } | { ok: false; message: string } {
    const modifierGroups: AdminModifierGroupInput[] = [];
    for (let gi = 0; gi < groups.length; gi++) {
        const g = groups[gi];
        const name = g.name;
        const modifiers = g.modifiers
            .filter((m) => hasLocalizedText(m.name))
            .map((m, mi) => ({
                ...(typeof m.id === "number" ? { id: m.id } : {}),
                name: toLocalizedPayload(m.name),
                priceDelta: Math.round(Number(m.priceDelta)) || 0,
                position: mi,
            }));
        if (!hasLocalizedText(name) && modifiers.length === 0) continue;
        if (!hasLocalizedText(name)) {
            return {
                ok: false,
                message: `Группа ${String(gi + 1)}: укажите название (или удалите опции).`,
            };
        }
        let maxChoices = Number.parseInt(String(g.maxChoices), 10);
        if (Number.isNaN(maxChoices) || maxChoices < 0) {
            maxChoices = 1;
        }
        modifierGroups.push({
            ...(typeof g.id === "number" ? { id: g.id } : {}),
            name: toLocalizedPayload(name),
            required: Boolean(g.required),
            maxChoices,
            position: gi,
            modifiers,
        });
    }
    return { ok: true, modifierGroups };
}

type AdminCategory = { id: number; name: unknown };

function ModifierGroupAccordion(props: {
    control: Control<ProductDialogFormValues>;
    groupIndex: number;
    removeGroup: () => void;
    disabled: boolean;
}) {
    const { control, groupIndex, removeGroup, disabled } = props;
    const groupName = useWatch({
        control,
        name: `modifierGroups.${groupIndex}.name`,
    });
    const groupRequired = useWatch({
        control,
        name: `modifierGroups.${groupIndex}.required`,
    });
    const groupMaxChoices = useWatch({
        control,
        name: `modifierGroups.${groupIndex}.maxChoices`,
    });

    const {
        fields: optionFields,
        append: appendOption,
        remove: removeOption,
        move: moveOption,
    } = useFieldArray({
        control,
        name: `modifierGroups.${groupIndex}.modifiers`,
    });

    const summaryTitle =
        groupName != null && hasLocalizedText(groupName)
            ? getLocalizedField(groupName, "hy") || getLocalizedField(groupName, "ru")
            : `Группа ${String(groupIndex + 1)}`;

    const maxN =
        typeof groupMaxChoices === "number" && Number.isFinite(groupMaxChoices)
            ? Math.max(0, Math.floor(groupMaxChoices))
            : 0;

    return (
        <Accordion
            defaultExpanded
            disableGutters
            elevation={0}
            sx={{
                border: 1,
                borderColor: "divider",
                borderRadius: 2,
                "&:before": { display: "none" },
                overflow: "hidden",
            }}
        >
            <AccordionSummary
                sx={{
                    px: 1.5,
                    "& .MuiAccordionSummary-content": {
                        mr: 1,
                        alignItems: "center",
                        gap: 1,
                        flexWrap: "wrap",
                    },
                }}
            >
                <Typography variant="subtitle2" sx={{ flex: "1 1 auto", minWidth: 120 }}>
                    {summaryTitle}
                </Typography>
                <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap>
                    {groupRequired ? (
                        <Chip size="small" label="Обязательно" color="primary" variant="outlined" />
                    ) : (
                        <Chip size="small" label="Необязательно" variant="outlined" />
                    )}
                    {maxN === 0 ? (
                        <Chip size="small" label="Без лимита" variant="outlined" />
                    ) : (
                        <Chip
                            size="small"
                            label={`До ${String(maxN)} ${maxN === 1 ? "выбора" : "выборов"}`}
                            variant="outlined"
                        />
                    )}
                </Stack>
                <IconButton
                    type="button"
                    size="small"
                    aria-label="Удалить группу"
                    disabled={disabled}
                    onClick={(e) => {
                        e.stopPropagation();
                        removeGroup();
                    }}
                    color="error"
                    sx={{ ml: "auto" }}
                >
                    <DeleteOutlineIcon fontSize="small" />
                </IconButton>
            </AccordionSummary>
            <AccordionDetails sx={{ pt: 0, px: 1.5, pb: 2 }}>
                <Stack spacing={2}>
                    <input
                        type="hidden"
                        {...control.register(`modifierGroups.${groupIndex}.id`, {
                            setValueAs: (v) =>
                                v === "" || v == null ? undefined : Number(v),
                        })}
                    />
                    <Controller
                        name={`modifierGroups.${groupIndex}.name`}
                        control={control}
                        render={({ field }) => (
                            <LocalizedTextFields
                                label="Название группы"
                                value={field.value}
                                onChange={field.onChange}
                                disabled={disabled}
                                required
                            />
                        )}
                    />
                    <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap" useFlexGap>
                        <Controller
                            name={`modifierGroups.${groupIndex}.required`}
                            control={control}
                            render={({ field }) => (
                                <FormControlLabel
                                    control={
                                        <Switch
                                            checked={Boolean(field.value)}
                                            onChange={(e) => field.onChange(e.target.checked)}
                                            disabled={disabled}
                                            size="small"
                                        />
                                    }
                                    label={field.value ? "Обязательно" : "Необязательно"}
                                />
                            )}
                        />
                        <TextField
                            {...control.register(`modifierGroups.${groupIndex}.maxChoices`, {
                                valueAsNumber: true,
                            })}
                            type="number"
                            size="small"
                            label="Макс. выбор"
                            disabled={disabled}
                            sx={{ width: 128, ...TEXT_FIELD_FOCUS_SX }}
                            inputProps={{ min: 0, step: 1 }}
                            helperText="0 - без лимита"
                        />
                    </Stack>
                    <Stack spacing={1}>
                        {optionFields.map((optField, optIndex) => (
                            <Stack
                                key={optField.id}
                                direction="row"
                                alignItems="center"
                                spacing={1}
                            >
                                <input
                                    type="hidden"
                                    {...control.register(
                                        `modifierGroups.${groupIndex}.modifiers.${optIndex}.id`,
                                        {
                                            setValueAs: (v) =>
                                                v === "" || v == null
                                                    ? undefined
                                                    : Number(v),
                                        },
                                    )}
                                />
                                <Box sx={{ flex: 1, minWidth: 0 }}>
                                    <Controller
                                        name={`modifierGroups.${groupIndex}.modifiers.${optIndex}.name`}
                                        control={control}
                                        render={({ field }) => (
                                            <LocalizedTextFields
                                                label="Название"
                                                value={field.value}
                                                onChange={field.onChange}
                                                disabled={disabled}
                                                required
                                            />
                                        )}
                                    />
                                </Box>
                                <TextField
                                    {...control.register(
                                        `modifierGroups.${groupIndex}.modifiers.${optIndex}.priceDelta`,
                                        { valueAsNumber: true },
                                    )}
                                    size="small"
                                    type="number"
                                    label="Доплата"
                                    disabled={disabled}
                                    sx={{ width: 120, flexShrink: 0, ...TEXT_FIELD_FOCUS_SX }}
                                    inputProps={{ step: 1 }}
                                    slotProps={{
                                        input: {
                                            endAdornment: (
                                                <InputAdornment position="end">֏</InputAdornment>
                                            ),
                                        },
                                    }}
                                />
                                <IconButton
                                    type="button"
                                    size="small"
                                    aria-label="Выше"
                                    disabled={disabled || optIndex === 0}
                                    onClick={() => moveOption(optIndex, optIndex - 1)}
                                >
                                    <ArrowUpwardIcon fontSize="small" />
                                </IconButton>
                                <IconButton
                                    type="button"
                                    size="small"
                                    aria-label="Ниже"
                                    disabled={
                                        disabled || optIndex >= optionFields.length - 1
                                    }
                                    onClick={() => moveOption(optIndex, optIndex + 1)}
                                >
                                    <ArrowDownwardIcon fontSize="small" />
                                </IconButton>
                                <IconButton
                                    type="button"
                                    size="small"
                                    aria-label="Удалить опцию"
                                    disabled={disabled}
                                    color="error"
                                    onClick={() => removeOption(optIndex)}
                                >
                                    <DeleteIcon fontSize="small" />
                                </IconButton>
                            </Stack>
                        ))}
                    </Stack>
                    <Button
                        type="button"
                        variant="text"
                        size="small"
                        disabled={disabled}
                        onClick={() =>
                            appendOption({
                                name: emptyLocalizedJson(),
                                priceDelta: 0,
                            })
                        }
                        sx={{ alignSelf: "flex-start", textTransform: "none" }}
                    >
                        Добавить опцию
                    </Button>
                </Stack>
            </AccordionDetails>
        </Accordion>
    );
}

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

    const { control, handleSubmit, reset, register, setValue, watch } = useForm<ProductDialogFormValues>({
        defaultValues: productDialogDefaults(editingProduct),
    });

    const {
        fields: groupFields,
        append: appendGroup,
        remove: removeGroup,
    } = useFieldArray({
        control,
        name: "modifierGroups",
    });

    useEffect(() => {
        reset(productDialogDefaults(editingProduct));
    }, [editingProduct, formKey, reset]);

    const [categories, setCategories] = useState<AdminCategory[]>([]);
    const [newCategoryName, setNewCategoryName] = useState(emptyLocalizedJson);
    const [addCategoryLoading, setAddCategoryLoading] = useState(false);
    const [uploadLoading, setUploadLoading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const categoryIdWatch = watch("categoryId");

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
                                    typeof (c as { id: unknown }).id === "number"
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
            const cur = watch("images");
            setValue("images", [...cur, ...newUrls], { shouldDirty: true });
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

    const images = watch("images");

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
                            <Controller
                                name="name"
                                control={control}
                                render={({ field }) => (
                                    <LocalizedTextFields
                                        label="Название"
                                        value={field.value}
                                        onChange={field.onChange}
                                        disabled={submitLoading}
                                        required
                                    />
                                )}
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
                            <Stack direction="row" spacing={1} alignItems="flex-end">
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
                            <Controller
                                name="composition"
                                control={control}
                                render={({ field }) => (
                                    <LocalizedTextFields
                                        label="Состав"
                                        value={field.value}
                                        onChange={field.onChange}
                                        disabled={submitLoading}
                                        multiline
                                    />
                                )}
                            />
                            <Controller
                                name="description"
                                control={control}
                                render={({ field }) => (
                                    <LocalizedTextFields
                                        label="Описание"
                                        value={field.value}
                                        onChange={field.onChange}
                                        disabled={submitLoading}
                                        multiline
                                    />
                                )}
                            />

                            <Box>
                                <Typography variant="subtitle2" sx={{ mb: 1 }}>
                                    Модификаторы
                                </Typography>
                                <Stack spacing={2}>
                                    {groupFields.map((gf, groupIndex) => (
                                        <ModifierGroupAccordion
                                            key={gf.id}
                                            control={control}
                                            groupIndex={groupIndex}
                                            disabled={submitLoading}
                                            removeGroup={() => removeGroup(groupIndex)}
                                        />
                                    ))}
                                </Stack>
                                <Button
                                    type="button"
                                    variant="outlined"
                                    size="large"
                                    fullWidth
                                    startIcon={<AddIcon />}
                                    sx={{ mt: 1.5, textTransform: "none" }}
                                    disabled={submitLoading}
                                    onClick={() =>
                                        appendGroup({
                                            name: emptyLocalizedJson(),
                                            required: false,
                                            maxChoices: 1,
                                            modifiers: [],
                                        })
                                    }
                                >
                                    Добавить группу модификаторов
                                </Button>
                            </Box>

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
                    <DialogActions sx={{ p: 2, borderTop: "1px solid #eee", flexShrink: 0 }}>
                        <Button onClick={onClose} disabled={submitLoading}>
                            Отмена
                        </Button>
                        <Button
                            type="submit"
                            variant="contained"
                            color="primary"
                            disabled={submitLoading}
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
    );
}
