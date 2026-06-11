import type {
    Control,
    FieldErrors,
    UseFormClearErrors,
    UseFormRegister,
    UseFormSetValue,
} from "react-hook-form";

import type { CheckoutFormValues } from "@/shared/lib/schemas";

export type CheckoutFormSectionProps = {
    control: Control<CheckoutFormValues>;
    register: UseFormRegister<CheckoutFormValues>;
    setValue: UseFormSetValue<CheckoutFormValues>;
    clearErrors: UseFormClearErrors<CheckoutFormValues>;
    formState: {
        errors: FieldErrors<CheckoutFormValues>;
        touchedFields: Partial<
            Readonly<Record<keyof CheckoutFormValues, boolean>>
        >;
        isSubmitted: boolean;
    };
};
