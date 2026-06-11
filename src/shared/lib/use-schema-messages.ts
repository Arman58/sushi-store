"use client";

import { useTranslations } from "next-intl";
import { useMemo } from "react";

import type { SchemaMessages } from "./create-schemas";

export function useSchemaMessages(): SchemaMessages {
    const t = useTranslations("errors");

    return useMemo(
        () => ({
            phoneRequired: t("phone.required"),
            phoneInvalid: t("phone.invalid"),
            phoneRequiredForDelivery: t("phone.requiredForDelivery"),
            nameRequired: t("name.required"),
            nameTooShort: t("name.tooShort"),
            emailInvalid: t("email.invalid"),
            addressRequired: t("address.required"),
            zoneRequired: t("zone.required"),
            orderIdRequired: t("orderId.required"),
            orderIdInvalid: t("orderId.invalid"),
        }),
        [t],
    );
}
