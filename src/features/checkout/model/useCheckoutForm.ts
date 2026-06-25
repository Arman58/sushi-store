"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useMemo, useRef, useState } from "react";
import {
    type FieldErrors,
    type Resolver,
    useForm,
} from "react-hook-form";

import { toOrderPayloadItems, useCartStore } from "@/features/cart";
import type { AppLocale } from "@/i18n/routing";
import { useRouter } from "@/i18n/server";
import { normalizePhoneToE164Digits } from "@/lib/phone";
import { ApiError, placeOrder } from "@/shared/api";
import { API_ERROR_CODES } from "@/shared/lib/api-error";
import { createCheckoutSchema } from "@/shared/lib/create-schemas";
import {
    type CheckoutFormValues,
    type DeliveryType,
} from "@/shared/lib/schemas";
import { showAppToast } from "@/shared/lib/show-app-toast";
import { useSchemaMessages } from "@/shared/lib/use-schema-messages";

import { DRAFT_STORAGE_KEY, ORDER_ID_KEY } from "./constants";
import { checkoutBasicsIncomplete, loadDraft } from "./helpers";
import type { CheckoutSubmitContext } from "./types";

type SessionUser = {
    id?: number | null;
    name?: string | null;
    email?: string | null;
} | null;

function phoneForOrderPayload(phone: string, delivery: DeliveryType): string {
    const normalized = normalizePhoneToE164Digits(phone);
    if (normalized) return normalized;
    return delivery === "pickup" ? "" : phone.trim();
}

type UseCheckoutFormParams = {
    sessionUser: SessionUser;
    hasItems: boolean;
};

export function useCheckoutForm({ sessionUser, hasItems }: UseCheckoutFormParams) {
    const t = useTranslations("checkout.form");
    const tProfile = useTranslations("profile");
    const locale = useLocale() as AppLocale;
    const schemaMessages = useSchemaMessages();
    const checkoutSchema = useMemo(
        () => createCheckoutSchema(schemaMessages),
        [schemaMessages],
    );
    const router = useRouter();

    const items = useCartStore((s) => s.items);
    const markPriceMismatch = useCartStore((s) => s.markPriceMismatch);
    const resetPriceMismatch = useCartStore((s) => s.resetPriceMismatch);
    const isPlacingOrder = useCartStore((s) => s.isPlacingOrder);

    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [missingItemError, setMissingItemError] = useState<string | null>(null);
    const [apiError, setApiError] = useState(false);
    const [isSubmittingLocal, setIsSubmittingLocal] = useState(false);
    const [formFieldFocused, setFormFieldFocused] = useState(false);
    const checkoutFormRef = useRef<HTMLFormElement>(null);

    const draft = useMemo(() => loadDraft(), []);

    const form = useForm<CheckoutFormValues>({
        resolver: zodResolver(checkoutSchema) as Resolver<CheckoutFormValues>,
        defaultValues: {
            name: draft?.name ?? "",
            email: draft?.email ?? "",
            phone: draft?.phone ?? "",
            address: draft?.address ?? "",
            apartment: draft?.apartment ?? "",
            comment: draft?.comment ?? "",
            saveAddress: false,
            saveAddressLabel: "",
            payment: draft?.payment ?? "cash",
            delivery: draft?.delivery ?? "delivery",
            deliveryZoneId: draft?.deliveryZoneId,
            hp: "",
        },
        mode: "onTouched",
        reValidateMode: "onBlur",
    });

    const {
        control,
        register,
        handleSubmit,
        watch,
        setValue,
        getValues,
        clearErrors,
        formState: { errors, isSubmitting, touchedFields, isSubmitted },
    } = form;

    useEffect(() => {
        useCartStore.getState().setPlacingOrder(false);
    }, []);

    useEffect(() => {
        const formEl = checkoutFormRef.current;
        if (!formEl || !hasItems) return;

        const isFormControl = (el: Element | null) =>
            el instanceof HTMLElement &&
            el.matches(
                'input, textarea, select, [role="combobox"], [contenteditable="true"]',
            );

        const onFocusIn = (e: FocusEvent) => {
            if (isFormControl(e.target as Element)) {
                setFormFieldFocused(true);
            }
        };

        const onFocusOut = () => {
            window.requestAnimationFrame(() => {
                const active = document.activeElement;
                if (!isFormControl(active) || !formEl.contains(active)) {
                    setFormFieldFocused(false);
                }
            });
        };

        formEl.addEventListener("focusin", onFocusIn);
        formEl.addEventListener("focusout", onFocusOut);
        return () => {
            formEl.removeEventListener("focusin", onFocusIn);
            formEl.removeEventListener("focusout", onFocusOut);
        };
    }, [hasItems]);

    useEffect(() => {
        if (!sessionUser) return;
        const sessionName = (sessionUser.name ?? "").trim();
        if (sessionName.length > 0 && !getValues("name")) {
            setValue("name", sessionName, { shouldValidate: false });
        }
        const sessionEmail = (sessionUser.email ?? "").trim();
        if (sessionEmail.length > 0 && !getValues("email")) {
            setValue("email", sessionEmail, { shouldValidate: false });
        }
    }, [sessionUser, setValue, getValues]);

    useEffect(() => {
        const subscription = watch((value) => {
            if (typeof window === "undefined") return;
            try {
                localStorage.setItem(
                    DRAFT_STORAGE_KEY,
                    JSON.stringify({ ...value, ts: Date.now() }),
                );
            } catch {
                // ignore storage errors
            }
        });
        return () => subscription.unsubscribe();
    }, [watch]);

    const nameW = watch("name");
    const phoneW = watch("phone");
    const addressW = watch("address");
    const delivery = watch("delivery");
    const deliveryZoneId = watch("deliveryZoneId");
    const payment = watch("payment");

    const checkoutIncomplete = useMemo(
        () =>
            checkoutBasicsIncomplete({
                name: nameW ?? "",
                phone: phoneW ?? "",
                delivery,
                deliveryZoneId: deliveryZoneId ?? undefined,
                address: addressW ?? "",
            }),
        [nameW, phoneW, delivery, deliveryZoneId, addressW],
    );

    const onInvalid = (formErrors: FieldErrors<CheckoutFormValues>) => {
        const first = Object.values(formErrors).find(
            (e) => e && typeof e === "object" && "message" in e,
        );
        const msg =
            first && typeof first.message === "string"
                ? first.message
                : t("validationFallback");
        setErrorMessage(msg);
        showAppToast(msg, "error");
    };

    const submitOrder = async (
        data: CheckoutFormValues,
        ctx: CheckoutSubmitContext,
    ) => {
        if (!ctx.hasItems) return;

        let acquired = false;
        useCartStore.setState((s) => {
            if (s.isPlacingOrder) return s;
            acquired = true;
            return { ...s, isPlacingOrder: true };
        });
        if (!acquired) return;

        setIsSubmittingLocal(true);
        setErrorMessage(null);
        setMissingItemError(null);
        setApiError(false);
        resetPriceMismatch();

        try {
            const result = await placeOrder({
                name: data.name.trim(),
                phone: phoneForOrderPayload(data.phone, data.delivery),
                address: data.delivery === "delivery" ? data.address.trim() : "",
                comment: data.comment.trim(),
                payment: data.payment,
                delivery: data.delivery,
                items: toOrderPayloadItems(ctx.items),
                totalPrice: ctx.grandTotal,
                subtotalBeforeDiscount: ctx.cartSubtotal,
                discountAmount: ctx.promoDiscount,
                ...(ctx.appliedPromoCode
                    ? { promoCode: ctx.appliedPromoCode }
                    : {}),
                deliveryZoneId:
                    data.delivery === "delivery" ? data.deliveryZoneId : undefined,
                locale,
                hp: data.hp,
            });

            if (result?.ok && result.order?.id && result.order.accessToken) {
                if (
                    sessionUser &&
                    data.saveAddress &&
                    data.delivery === "delivery" &&
                    data.address.trim().length >= 3
                ) {
                    void fetch("/api/profile/addresses", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            label:
                                data.saveAddressLabel.trim() ||
                                tProfile("label_home"),
                            street: data.address.trim(),
                            apartment: data.apartment.trim() || undefined,
                        }),
                    }).catch(() => undefined);
                }

                useCartStore.getState().clear();
                try {
                    localStorage.removeItem(DRAFT_STORAGE_KEY);
                    sessionStorage.setItem(
                        ORDER_ID_KEY,
                        String(result.order.id),
                    );
                } catch {
                    /* ignore */
                }
                // accessToken также в HttpOnly cookie (POST /api/order); key в URL не нужен.
                router.push(`/order/${result.order.id}`);
                return;
            }

            const fallback = t("serverNotConfirmed");
            setErrorMessage(fallback);
            showAppToast(fallback, "error");
        } catch (error) {
            let message: string;

            if (error instanceof ApiError) {
                message =
                    error.message.trim() ||
                    (error.status >= 500
                        ? t("serverError", { status: error.status })
                        : t("requestError", { status: error.status }));

                if (error.code === API_ERROR_CODES.PRICE_MISMATCH) {
                    markPriceMismatch();
                } else if (
                    error.code === API_ERROR_CODES.ITEM_UNAVAILABLE ||
                    error.status === 409
                ) {
                    setMissingItemError(message);
                }
                if (error.status >= 500) {
                    setApiError(true);
                }
            } else if (error instanceof Error) {
                message =
                    error.message.trim() || t("submitConnectionError");
            } else {
                message = t("submitConnectionError");
            }

            setErrorMessage(message);
            showAppToast(message, "error");
        } finally {
            setIsSubmittingLocal(false);
            useCartStore.getState().setPlacingOrder(false);
        }
    };

    const isBusySubmit = isSubmitting || isSubmittingLocal || isPlacingOrder;

    return {
        methods: form,
        control,
        register,
        handleSubmit,
        watch,
        setValue,
        clearErrors,
        formState: { errors, touchedFields, isSubmitted },
        errors,
        isSubmitting,
        touchedFields,
        isSubmitted,
        payment,
        delivery,
        sessionUser,
        errorMessage,
        setErrorMessage,
        missingItemError,
        apiError,
        checkoutFormRef,
        formFieldFocused,
        checkoutIncomplete,
        isBusySubmit,
        onInvalid,
        submitOrder,
        items,
    };
}
