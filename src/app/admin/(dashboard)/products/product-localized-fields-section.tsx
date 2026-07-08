"use client";

import { useTranslations } from "next-intl";
import { memo } from "react";
import { type Control, Controller, useWatch } from "react-hook-form";

import { AdminLocalizationSection } from "@/features/admin/ui/admin-localization-section";
import { LocalizedTextFields } from "@/shared/ui/localized-text-fields";

import type { ProductDialogFormValues } from "./product-form-types";

type ProductLocalizedFieldsSectionProps = {
    control: Control<ProductDialogFormValues>;
    disabled: boolean;
    onTranslate?: () => void;
    translating?: boolean;
};

export const ProductLocalizedFieldsSection = memo(
    function ProductLocalizedFieldsSection({
        control,
        disabled,
        onTranslate,
        translating,
    }: ProductLocalizedFieldsSectionProps) {
        const tCommon = useTranslations("admin.common");
        const name = useWatch({ control, name: "name" });
        const composition = useWatch({ control, name: "composition" });
        const description = useWatch({ control, name: "description" });

        return (
            <AdminLocalizationSection
                fieldValues={[name, composition, description]}
                onTranslate={onTranslate}
                translating={translating}
                disabled={disabled}
            >
                <Controller
                    name="name"
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
                <Controller
                    name="composition"
                    control={control}
                    render={({ field }) => (
                        <LocalizedTextFields
                            label={tCommon("composition")}
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
                            label={tCommon("description")}
                            value={field.value}
                            onChange={field.onChange}
                            disabled={disabled}
                            multiline
                        />
                    )}
                />
            </AdminLocalizationSection>
        );
    },
);
