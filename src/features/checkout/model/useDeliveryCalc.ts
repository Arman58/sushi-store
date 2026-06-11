"use client";

import { useLocale, useTranslations } from "next-intl";
import { useEffect, useMemo, useRef, useState } from "react";
import type {
    UseFormClearErrors,
    UseFormSetValue,
    UseFormWatch,
} from "react-hook-form";

import { useCartStore } from "@/features/cart";
import { ApiError, validatePromo } from "@/shared/api";
import type { CheckoutFormValues } from "@/shared/lib/schemas";

import { isAbortError } from "./helpers";
import type { DeliveryZoneOption } from "./types";

type UseDeliveryCalcParams = {
    watch: UseFormWatch<CheckoutFormValues>;
    setValue: UseFormSetValue<CheckoutFormValues>;
    clearErrors: UseFormClearErrors<CheckoutFormValues>;
    cartSubtotal: number;
};

export function useDeliveryCalc({
    watch,
    setValue,
    clearErrors,
    cartSubtotal,
}: UseDeliveryCalcParams) {
    const t = useTranslations("checkout.delivery");
    const locale = useLocale();
    const appliedPromoCode = useCartStore((s) => s.appliedPromoCode);
    const setAppliedPromoCode = useCartStore((s) => s.setAppliedPromoCode);

    const [deliveryZones, setDeliveryZones] = useState<DeliveryZoneOption[]>([]);
    const [zonesLoading, setZonesLoading] = useState(true);
    const [zonesError, setZonesError] = useState<string | null>(null);
    const zonesFetchGenRef = useRef(0);

    const [promoDraft, setPromoDraft] = useState("");
    const [promoError, setPromoError] = useState<string | null>(null);
    const [promoDiscount, setPromoDiscount] = useState(0);
    const [promoApplying, setPromoApplying] = useState(false);

    const delivery = watch("delivery");
    const deliveryZoneId = watch("deliveryZoneId");
    const isDelivery = delivery === "delivery";

    useEffect(() => {
        if (appliedPromoCode) setPromoDraft(appliedPromoCode);
    }, [appliedPromoCode]);

    useEffect(() => {
        const gen = ++zonesFetchGenRef.current;
        let teardown = false;
        const ac = new AbortController();
        const hangGuard = setTimeout(() => ac.abort(), 25_000);

        async function loadZones() {
            setZonesLoading(true);
            setZonesError(null);
            try {
                const res = await fetch(
                    `/api/delivery-zones?locale=${encodeURIComponent(locale)}`,
                    { signal: ac.signal },
                );
                const raw = await res.json().catch(() => null);
                if (!res.ok) {
                    const msg =
                        raw &&
                        typeof raw === "object" &&
                        raw !== null &&
                        "error" in raw &&
                        typeof (raw as { error: unknown }).error === "string"
                            ? (raw as { error: string }).error
                            : t("zonesLoadFailed", { status: res.status });
                    throw new Error(msg);
                }
                if (zonesFetchGenRef.current !== gen) return;
                setDeliveryZones(
                    Array.isArray(raw) ? (raw as DeliveryZoneOption[]) : [],
                );
                setZonesError(null);
            } catch (e) {
                if (isAbortError(e)) {
                    if (teardown || zonesFetchGenRef.current !== gen) return;
                    setZonesError(t("zonesTimeout"));
                    setDeliveryZones([]);
                    return;
                }
                if (zonesFetchGenRef.current !== gen) return;
                setZonesError(
                    e instanceof Error ? e.message : t("zonesGenericError"),
                );
                setDeliveryZones([]);
            } finally {
                clearTimeout(hangGuard);
                if (zonesFetchGenRef.current === gen) {
                    setZonesLoading(false);
                }
            }
        }
        void loadZones();
        return () => {
            teardown = true;
            clearTimeout(hangGuard);
            ac.abort();
        };
    }, [locale, t]);

    useEffect(() => {
        if (delivery !== "delivery") {
            setValue("deliveryZoneId", undefined, { shouldValidate: false });
            clearErrors(["deliveryZoneId", "address", "phone"]);
        }
    }, [delivery, setValue, clearErrors]);

    const selectedZone = useMemo(
        () => deliveryZones.find((z) => z.id === deliveryZoneId) ?? null,
        [deliveryZones, deliveryZoneId],
    );

    const requiresManagerApproval = Boolean(
        isDelivery && selectedZone?.requiresManagerApproval,
    );
    const zoneDescription = useMemo(() => {
        const text = (selectedZone?.description ?? "").trim();
        if (!text || text === "{}") return "";
        return text;
    }, [selectedZone?.description]);

    useEffect(() => {
        if (requiresManagerApproval) {
            setValue("payment", "cash", { shouldValidate: false });
        }
    }, [requiresManagerApproval, setValue]);

    const deliveryFee =
        isDelivery && selectedZone ? selectedZone.deliveryPrice : 0;

    const formatZoneDeliveryPrice = (price: number): string =>
        price === 0 ? t("free") : `${price.toLocaleString("ru-RU")} ֏`;

    const deliverySummaryLabel = useMemo(() => {
        if (!isDelivery) return "-";
        if (requiresManagerApproval) return t("managerApprovalSummary");
        if (zonesLoading) return "…";
        if (zonesError || deliveryZones.length === 0) return "-";
        if (!selectedZone) return t("pendingZoneSelection");
        if (selectedZone.deliveryPrice === 0) return t("freeCapitalized");
        return `${selectedZone.deliveryPrice.toLocaleString("ru-RU")} ֏`;
    }, [
        isDelivery,
        requiresManagerApproval,
        zonesLoading,
        zonesError,
        deliveryZones.length,
        selectedZone,
        t,
    ]);

    const showDeliveryBreakdown = isDelivery && selectedZone != null;
    const showDeliveryPendingHint = isDelivery && !selectedZone;
    const grossBeforeDiscount = cartSubtotal + deliveryFee;
    const grandTotal = Math.max(0, grossBeforeDiscount - promoDiscount);
    const belowMin = Boolean(
        isDelivery && selectedZone && cartSubtotal < selectedZone.minOrderAmount,
    );

    useEffect(() => {
        let cancelled = false;

        async function syncPromo() {
            if (!appliedPromoCode) {
                if (!cancelled) {
                    setPromoDiscount(0);
                    setPromoError(null);
                }
                return;
            }
            try {
                const res = await validatePromo({
                    code: appliedPromoCode,
                    cartAmount: cartSubtotal,
                    deliveryAmount: deliveryFee,
                });
                if (!cancelled) {
                    setPromoDiscount(res.discountAmount);
                    setPromoError(null);
                }
            } catch (e) {
                if (!cancelled) {
                    setPromoDiscount(0);
                    setAppliedPromoCode(null);
                    if (e instanceof ApiError) {
                        setPromoError(e.message || t("promoInvalid"));
                    } else {
                        setPromoError(t("promoCheckFailed"));
                    }
                }
            }
        }

        void syncPromo();

        return () => {
            cancelled = true;
        };
    }, [appliedPromoCode, cartSubtotal, deliveryFee, setAppliedPromoCode, t]);

    const handleApplyPromoClick = async () => {
        setPromoError(null);
        const raw = promoDraft.trim().replace(/\s+/g, "").toUpperCase();
        if (!raw) {
            setPromoError(t("promoEnterCode"));
            return;
        }

        const belowMinBlocked =
            isDelivery &&
            selectedZone &&
            cartSubtotal < selectedZone.minOrderAmount;
        if (belowMinBlocked) {
            setPromoError(t("promoMinOrderFirst"));
            return;
        }

        setPromoApplying(true);
        try {
            await validatePromo({
                code: raw,
                cartAmount: cartSubtotal,
                deliveryAmount: deliveryFee,
            });
            setAppliedPromoCode(raw);
        } catch (e) {
            if (e instanceof ApiError) {
                setPromoError(e.message || t("promoInvalid"));
            } else {
                setPromoError(t("promoCheckFailed"));
            }
        } finally {
            setPromoApplying(false);
        }
    };

    const clearPromo = () => {
        setAppliedPromoCode(null);
        setPromoDraft("");
        setPromoError(null);
    };

    const deliveryBlocked =
        isDelivery &&
        (zonesLoading ||
            Boolean(zonesError) ||
            deliveryZones.length === 0 ||
            belowMin);

    return {
        delivery,
        isDelivery,
        deliveryZoneId,
        deliveryZones,
        zonesLoading,
        zonesError,
        selectedZone,
        requiresManagerApproval,
        zoneDescription,
        deliveryFee,
        deliverySummaryLabel,
        showDeliveryBreakdown,
        showDeliveryPendingHint,
        grandTotal,
        grossBeforeDiscount,
        belowMin,
        promoDraft,
        setPromoDraft,
        promoError,
        setPromoError,
        promoDiscount,
        promoApplying,
        appliedPromoCode,
        deliveryBlocked,
        handleApplyPromoClick,
        clearPromo,
        formatZoneDeliveryPrice,
    };
}
