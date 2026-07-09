import type { FieldErrors } from "react-hook-form";

import type { CheckoutFormValues, DeliveryType } from "@/shared/lib/schemas";

import { DRAFT_STORAGE_KEY, DRAFT_TTL_MS } from "./constants";
import type { DraftData } from "./types";

const digitsOnly = (value: string) => value.replace(/\D/g, "");

/** Префикс страны в поле телефона чекаута — без кода оператора. */
export const CHECKOUT_PHONE_PREFIX = "+374";

export function armenianPhoneNationalDigits(value: string): string {
    const d = digitsOnly(value);
    return d.startsWith("374") ? d.slice(3) : d;
}

/** Полный армянский номер (8 национальных цифр) — можно подставлять из draft/профиля. */
export function isCompleteCheckoutPhone(value: string): boolean {
    return armenianPhoneNationalDigits(value).length === 8;
}

/**
 * Стартовое значение телефона: только полный номер из draft,
 * иначе префикс +374 (неполные вроде «+374 (77)» не восстанавливаем).
 */
export function resolveInitialCheckoutPhone(draftPhone?: string | null): string {
    const raw = (draftPhone ?? "").trim();
    if (raw && isCompleteCheckoutPhone(raw)) {
        return formatPhone(raw);
    }
    return CHECKOUT_PHONE_PREFIX;
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
        phoneDigits.length !== 8 &&
        digitsOnly(v.phone) !== "374"
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

/**
 * Маска +374 (XX) XX-XX-XX.
 * `previous` нужен, чтобы Backspace по скобке/дефису реально удалял цифру
 * (иначе digits не меняются и поле «залипает»).
 */
export function formatPhone(input: string, previous = ""): string {
    const prevDigits = digitsOnly(previous);
    let digits = digitsOnly(input);

    // Удалили только символ маски — снимаем последнюю цифру
    if (
        previous.length > 0 &&
        input.length < previous.length &&
        digits.length === prevDigits.length &&
        digits.length > 0
    ) {
        digits = digits.slice(0, -1);
    }

    // Выделение + Delete/Backspace всего поля (или почти всего)
    if (input.trim() === "" || input === "+" || input === "+3" || input === "+37") {
        return CHECKOUT_PHONE_PREFIX;
    }

    digits = digits.slice(0, 11);

    // Не даём «разъехать» код страны: 3 / 37 / пусто → снова +374
    if (digits.length === 0 || digits === "3" || digits === "37" || digits === "374") {
        return CHECKOUT_PHONE_PREFIX;
    }

    // Набрали локальные цифры без 374
    if (!digits.startsWith("374")) {
        if ("374".startsWith(digits)) {
            return CHECKOUT_PHONE_PREFIX;
        }
        digits = `374${digits}`.slice(0, 11);
    }

    const rest = digits.slice(3).slice(0, 8);
    if (rest.length === 0) {
        return CHECKOUT_PHONE_PREFIX;
    }

    let formatted = "+374";
    formatted += ` (${rest.slice(0, Math.min(2, rest.length))}`;
    if (rest.length >= 2) formatted += ")";
    if (rest.length > 2) formatted += ` ${rest.slice(2, 4)}`;
    if (rest.length > 4) formatted += `-${rest.slice(4, 6)}`;
    if (rest.length > 6) formatted += `-${rest.slice(6, 8)}`;

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
