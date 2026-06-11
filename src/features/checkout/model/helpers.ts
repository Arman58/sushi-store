import type { FieldErrors } from "react-hook-form";

import type { CheckoutFormValues, DeliveryType } from "@/shared/lib/schemas";

import { DRAFT_STORAGE_KEY, DRAFT_TTL_MS } from "./constants";
import type { DraftData } from "./types";

const digitsOnly = (value: string) => value.replace(/\D/g, "");

export function armenianPhoneNationalDigits(value: string): string {
    const d = digitsOnly(value);
    return d.startsWith("374") ? d.slice(3) : d;
}

export function checkoutBasicsIncomplete(v: {
    name: string;
    phone: string;
    delivery: DeliveryType;
    deliveryZoneId?: number;
    address: string;
}): boolean {
    if (!v.name?.trim() || v.name.trim().length < 2) return true;
    const phoneDigits = armenianPhoneNationalDigits(v.phone);
    if (v.delivery === "delivery" && phoneDigits.length !== 8) return true;
    if (
        v.delivery === "pickup" &&
        v.phone.trim().length > 0 &&
        phoneDigits.length !== 8
    ) {
        return true;
    }
    if (v.delivery === "delivery") {
        if (v.deliveryZoneId == null || v.deliveryZoneId <= 0) return true;
        if (!v.address?.trim() || v.address.trim().length < 5) return true;
    }
    return false;
}

export function showCheckoutFieldError(
    errors: FieldErrors<CheckoutFormValues>,
    touched: Partial<Readonly<Record<keyof CheckoutFormValues, boolean>>>,
    isSubmitted: boolean,
    field: keyof CheckoutFormValues,
): boolean {
    if (!errors[field]) return false;
    return Boolean(touched[field] || isSubmitted);
}

export function formatPhone(input: string): string {
    const digits = digitsOnly(input).slice(0, 11);
    let formatted = "+";

    if (digits.startsWith("374")) {
        formatted += "374 ";
        const rest = digits.slice(3);
        if (rest.length > 0) formatted += `(${rest.slice(0, 2)}`;
        if (rest.length >= 2) formatted += ")";
        if (rest.length > 2) formatted += ` ${rest.slice(2, 4)}`;
        if (rest.length > 4) formatted += `-${rest.slice(4, 6)}`;
        if (rest.length > 6) formatted += `-${rest.slice(6, 8)}`;
    } else {
        formatted += digits;
    }

    return formatted;
}

export function loadDraft(): Partial<CheckoutFormValues> | null {
    if (typeof window === "undefined") return null;
    try {
        const raw = localStorage.getItem(DRAFT_STORAGE_KEY);
        if (!raw) return null;
        const parsed = JSON.parse(raw) as DraftData;
        if (Date.now() - parsed.ts > DRAFT_TTL_MS) return null;
        return parsed;
    } catch {
        return null;
    }
}

export function isAbortError(e: unknown): boolean {
    return (
        (e instanceof DOMException && e.name === "AbortError") ||
        (e instanceof Error && e.name === "AbortError")
    );
}
