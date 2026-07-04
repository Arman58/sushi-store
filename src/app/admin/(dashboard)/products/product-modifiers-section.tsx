"use client";

import AddIcon from "@mui/icons-material/Add";
import ArrowDownwardIcon from "@mui/icons-material/ArrowDownward";
import ArrowUpwardIcon from "@mui/icons-material/ArrowUpward";
import DeleteIcon from "@mui/icons-material/Delete";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import {
    Accordion,
    AccordionDetails,
    AccordionSummary,
    Box,
    Button,
    Chip,
    FormControlLabel,
    IconButton,
    InputAdornment,
    Stack,
    Switch,
    TextField,
    Typography,
} from "@mui/material";
import { useTranslations } from "next-intl";
import { memo } from "react";
import {
    type Control,
    Controller,
    useFieldArray,
    useWatch,
} from "react-hook-form";

import {
    emptyLocalizedJson,
    getLocalizedField,
} from "@/lib/i18n-utils";
import { LocalizedTextFields } from "@/shared/ui/localized-text-fields";

import {
    hasLocalizedText,
    type ProductDialogFormValues,
    TEXT_FIELD_FOCUS_SX,
} from "./product-form-types";

const ModifierGroupAccordion = memo(function ModifierGroupAccordion(props: {
    control: Control<ProductDialogFormValues>;
    groupIndex: number;
    removeGroup: () => void;
    disabled: boolean;
}) {
    const { control, groupIndex, removeGroup, disabled } = props;
    const t = useTranslations("admin.products");
    const tCommon = useTranslations("admin.common");

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
            : t("modifierGroupDefault", { n: groupIndex + 1 });

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
                        <Chip size="small" label={tCommon("required")} color="primary" variant="outlined" />
                    ) : (
                        <Chip size="small" label={tCommon("optional")} variant="outlined" />
                    )}
                    {maxN === 0 ? (
                        <Chip size="small" label={tCommon("noLimit")} variant="outlined" />
                    ) : (
                        <Chip
                            size="small"
                            label={tCommon("maxChoices", { n: maxN })}
                            variant="outlined"
                        />
                    )}
                </Stack>
                <IconButton
                    type="button"
                    size="small"
                    aria-label={t("deleteModifierGroup")}
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
                                label={t("modifierGroupName")}
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
                                    label={field.value ? tCommon("required") : tCommon("optional")}
                                />
                            )}
                        />
                        <TextField
                            {...control.register(`modifierGroups.${groupIndex}.maxChoices`, {
                                valueAsNumber: true,
                            })}
                            type="number"
                            size="small"
                            label={t("modifierMaxChoices")}
                            disabled={disabled}
                            sx={{ width: 128, ...TEXT_FIELD_FOCUS_SX }}
                            inputProps={{ min: 0, step: 1 }}
                            helperText={t("maxChoicesHint")}
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
                                                label={tCommon("name")}
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
                                    label={t("modifierSurcharge")}
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
                                    aria-label={tCommon("moveUp")}
                                    disabled={disabled || optIndex === 0}
                                    onClick={() => moveOption(optIndex, optIndex - 1)}
                                >
                                    <ArrowUpwardIcon fontSize="small" />
                                </IconButton>
                                <IconButton
                                    type="button"
                                    size="small"
                                    aria-label={tCommon("moveDown")}
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
                                    aria-label={t("deleteModifierOption")}
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
                        {t("addOption")}
                    </Button>
                </Stack>
            </AccordionDetails>
        </Accordion>
    );
});

type ProductModifiersSectionProps = {
    control: Control<ProductDialogFormValues>;
    disabled: boolean;
};

export const ProductModifiersSection = memo(function ProductModifiersSection({
    control,
    disabled,
}: ProductModifiersSectionProps) {
    const t = useTranslations("admin.products");

    const {
        fields: groupFields,
        append: appendGroup,
        remove: removeGroup,
    } = useFieldArray({
        control,
        name: "modifierGroups",
    });

    return (
        <Box>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>
                {t("modifiersTitle")}
            </Typography>
            <Stack spacing={2}>
                {groupFields.map((gf, groupIndex) => (
                    <ModifierGroupAccordion
                        key={gf.id}
                        control={control}
                        groupIndex={groupIndex}
                        disabled={disabled}
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
                disabled={disabled}
                onClick={() =>
                    appendGroup({
                        name: emptyLocalizedJson(),
                        required: false,
                        maxChoices: 1,
                        modifiers: [],
                    })
                }
            >
                {t("addModifierGroup")}
            </Button>
        </Box>
    );
});
