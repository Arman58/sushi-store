"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useMemo, useRef, useState } from "react";
import {
    type FieldErrors,
    type Resolver,
    useForm,
    useWatch,
} from "react-hook-form";

import { toOrderPayloadItems, useCartStore } from "@/features/cart";
import type { AppLocale } from "@/i18n/routing";
import { useRouter } from "@/i18n/server";
import { normalizePhoneToE164Digits } from "@/lib/phone";
import { isStoreOpen, OPENING_HOURS } from "@/lib/site-config";
import { ApiError, placeOrder } from "@/shared/api";
import { API_ERROR_CODES } from "@/shared/lib/api-error";
import { createCheckoutSchema } from "@/shared/lib/create-schemas";
import { formatStorePrice } from "@/shared/lib/format-price";
import {
    type CheckoutFormValues,
    type DeliveryType,
} from "@/shared/lib/schemas";
import { showAppToast } from "@/shared/lib/show-app-toast";
import { useSchemaMessages } from "@/shared/lib/use-schema-messages";

import { DRAFT_STORAGE_KEY, ORDER_ID_KEY } from "./constants";
import {
    checkoutBasicsIncomplete,
    formatOrderDeliveryAddress,
    formatPhone,
    isCompleteCheckoutPhone,
    loadDraft,
    resolveInitialCheckoutPhone,
} from "./helpers";
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

function phoneFieldFilled(phone: string): boolean {
    return isCompleteCheckoutPhone(phone);
}

type UseCheckoutFormParams = {
    sessionUser: SessionUser;
};

export function useCheckoutForm({ sessionUser }: UseCheckoutFormParams) {
    const t = useTranslations("checkout.form");
    const tPayment = useTranslations("checkout.payment");
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
    const checkoutFormRef = useRef<HTMLFormElement>(null);
    /**
     * Ключ идемпотентности попытки оформления: живёт через ретраи (сервер
     * дедуплицирует double-tap/повтор сети), сбрасывается после успеха.
     */
    const idempotencyKeyRef = useRef<string | null>(null);

    const draft = useMemo(() => loadDraft(), []);

    const form = useForm<CheckoutFormValues>({
        resolver: zodResolver(
            checkoutSchema,
        ) as unknown as Resolver<CheckoutFormValues>,
        defaultValues: {
            name: draft?.name ?? "",
            email: draft?.email ?? "",
            phone: resolveInitialCheckoutPhone(draft?.phone),
            address: draft?.address ?? "",
            apartment: draft?.apartment ?? "",
            comment: draft?.comment ?? "",
            saveAddress: false,
            saveAddressLabel: "",
            payment: draft?.payment ?? "cash",
            needsChange: false,
            changeAmount: null,
            scheduleMode: "asap",
            scheduledFor: null,
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

    // Телефон из профиля аккаунта — автозаполнение на следующих заказах.
    useEffect(() => {
        if (!sessionUser?.id) return;
        if (phoneFieldFilled(getValues("phone"))) return;

        let cancelled = false;
        void (async () => {
            try {
                const res = await fetch("/api/profile/phone");
                if (!res.ok || cancelled) return;
                const data = (await res.json()) as { phone?: string | null };
                const stored = typeof data.phone === "string" ? data.phone.trim() : "";
                if (!stored || cancelled) return;
                if (phoneFieldFilled(getValues("phone"))) return;
                setValue("phone", formatPhone(stored), {
                    shouldValidate: false,
                    shouldDirty: false,
                });
            } catch {
                // ignore — draft / manual entry still work
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [sessionUser?.id, setValue, getValues]);

    const DRAFT_SAVE_DEBOUNCE_MS = 500;

    useEffect(() => {
        let timer: ReturnType<typeof setTimeout> | null = null;
        const subscription = watch((value) => {
            if (typeof window === "undefined") return;
            if (timer) clearTimeout(timer);
            timer = setTimeout(() => {
                try {
                    localStorage.setItem(
                        DRAFT_STORAGE_KEY,
                        JSON.stringify({ ...value, ts: Date.now() }),
                    );
                } catch {
                    // ignore storage errors
                }
            }, DRAFT_SAVE_DEBOUNCE_MS);
        });
        return () => {
            subscription.unsubscribe();
            if (timer) clearTimeout(timer);
        };
    }, [watch]);

    const [nameW, phoneW, addressW, delivery, deliveryZoneId, payment] =
        useWatch({
            control,
            name: [
                "name",
                "phone",
                "address",
                "delivery",
                "deliveryZoneId",
                "payment",
            ],
        });

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

        // Часы работы: ночью доступен только предзаказ «ко времени».
        if (
            !isStoreOpen() &&
            !(data.scheduleMode === "scheduled" && data.scheduledFor)
        ) {
            const msg = t("storeClosed", {
                opens: OPENING_HOURS.opens,
                closes: OPENING_HOURS.closes,
            });
            setErrorMessage(msg);
            showAppToast(msg, "error");
            return;
        }

        // Сдача: сумма клиента должна покрывать итог - не пускаем на сервер.
        if (
            data.payment === "cash" &&
            data.needsChange &&
            (data.changeAmount == null || data.changeAmount < ctx.grandTotal)
        ) {
            const msg = tPayment("changeTooLow", {
                total: formatStorePrice(ctx.grandTotal),
            });
            form.setError("changeAmount", { type: "manual", message: msg });
            setErrorMessage(msg);
            showAppToast(msg, "error");
            return;
        }

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

        idempotencyKeyRef.current ??=
            typeof crypto !== "undefined" && "randomUUID" in crypto
                ? crypto.randomUUID()
                : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

        try {
            const result = await placeOrder({
                name: data.name.trim(),
                phone: phoneForOrderPayload(data.phone, data.delivery),
                address:
                    data.delivery === "delivery"
                        ? formatOrderDeliveryAddress(
                              data.address,
                              data.apartment,
                          )
                        : "",
                comment: data.comment.trim(),
                payment: data.payment,
                changeFrom:
                    data.payment === "cash" && data.needsChange
                        ? data.changeAmount
                        : null,
                scheduledFor:
                    data.scheduleMode === "scheduled" ? data.scheduledFor : null,
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
            }, idempotencyKeyRef.current ?? undefined);

            if (result?.ok && result.order?.id && result.order.accessToken) {
                idempotencyKeyRef.current = null;
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
        checkoutIncomplete,
        isBusySubmit,
        onInvalid,
        submitOrder,
        items,
    };
}
