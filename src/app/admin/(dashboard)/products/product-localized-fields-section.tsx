"use client";

import { memo } from "react";
import { type Control, Controller } from "react-hook-form";

import { LocalizedTextFields } from "@/shared/ui/localized-text-fields";

import type { ProductDialogFormValues } from "./product-form-types";

type ProductLocalizedFieldsSectionProps = {
    control: Control<ProductDialogFormValues>;
    disabled: boolean;
};

export const ProductLocalizedFieldsSection = memo(
    function ProductLocalizedFieldsSection({
        control,
        disabled,
    }: ProductLocalizedFieldsSectionProps) {
        return (
            <>
                <Controller
                    name="name"
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
                <Controller
                    name="composition"
                    control={control}
                    render={({ field }) => (
                        <LocalizedTextFields
                            label="Состав"
                            value={field.value}
                            onChange={field.onChange}
                            disabled={disabled}
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
                            disabled={disabled}
                            multiline
                        />
                    )}
                />
            </>
        );
    },
);
