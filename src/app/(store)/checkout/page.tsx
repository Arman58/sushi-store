"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import CreditCardOutlinedIcon from "@mui/icons-material/CreditCardOutlined";
import EmailOutlinedIcon from "@mui/icons-material/EmailOutlined";
import HomeOutlinedIcon from "@mui/icons-material/HomeOutlined";
import LocalAtmOutlinedIcon from "@mui/icons-material/LocalAtmOutlined";
import LocalOfferOutlinedIcon from "@mui/icons-material/LocalOfferOutlined";
import LocalShippingOutlinedIcon from "@mui/icons-material/LocalShippingOutlined";
import NotesIcon from "@mui/icons-material/Notes";
import PersonOutlineOutlinedIcon from "@mui/icons-material/PersonOutlineOutlined";
import PhoneOutlinedIcon from "@mui/icons-material/PhoneOutlined";
import StorefrontOutlinedIcon from "@mui/icons-material/StorefrontOutlined";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import CircularProgress from "@mui/material/CircularProgress";
import Divider from "@mui/material/Divider";
import FormControl from "@mui/material/FormControl";
import FormHelperText from "@mui/material/FormHelperText";
import InputAdornment from "@mui/material/InputAdornment";
import InputLabel from "@mui/material/InputLabel";
import MuiLink from "@mui/material/Link";
import MenuItem from "@mui/material/MenuItem";
import Paper from "@mui/material/Paper";
import Select from "@mui/material/Select";
import Stack from "@mui/material/Stack";
import { alpha } from "@mui/material/styles";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import NextLink from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { type ReactNode,useEffect, useMemo, useRef, useState } from "react";
import {
    Controller,
    type FieldErrors,
    type Resolver,
    useForm,
} from "react-hook-form";

import {
    toOrderPayloadItems,
    useCartLineValidation,
    useCartStore,
} from "@/features/cart";
import { normalizePhoneToE164Digits } from "@/lib/phone";
import { KITCHEN_ADDRESS, OPENING_HOURS } from "@/lib/site-config";
import { ApiError, placeOrder, validatePromo } from "@/shared/api";
import {
    type CheckoutFormValues,
    checkoutSchema,
    type DeliveryType,
} from "@/shared/lib/schemas";
import { showAppToast } from "@/shared/lib/show-app-toast";
import { PageContainer, SectionTitle } from "@/shared/ui";
import { tokens } from "@/shared/ui/theme";

import { CheckoutOrderLine } from "./checkout-order-line";

// ─── Constants ────────────────────────────────────────────────────────────────

const PHONE_TEMPLATE = "+374 (___) __-__-__";
const DRAFT_STORAGE_KEY = "checkout-draft";
const DRAFT_TTL_MS = 24 * 60 * 60 * 1_000;
const ORDER_ID_KEY = "last-order-id";

/** Точка самовывоза East West — показываем на checkout. */
const PICKUP_LOCATION_LINE = `Самовывоз из ресторана East West: ${KITCHEN_ADDRESS.pickup}.`;

/** Секции формы чекаута — одинаковые отступы и рамка по токенам. */
const checkoutSectionPaperSx = {
    p: 3,
    borderRadius: 2,
    border: `1px solid ${tokens.border}`,
    bgcolor: "background.paper",
    boxShadow: "none",
    display: "flex",
    flexDirection: "column",
    gap: 2.5,
} as const;

const checkoutInputRadiusSx = {
    "& .MuiOutlinedInput-root": {
        borderRadius: `${tokens.radiusInput}px`,
    },
} as const;

const deliveryZoneSelectMenuProps = {
    disableScrollLock: false,
    PaperProps: {
        sx: { maxHeight: "40vh" },
    },
} as const;

const DELIVERY_TYPE_OPTIONS: {
    type: DeliveryType;
    label: string;
    icon: ReactNode;
}[] = [
    {
        type: "delivery",
        label: "Доставка",
        icon: <LocalShippingOutlinedIcon fontSize="small" />,
    },
    {
        type: "pickup",
        label: "Самовывоз",
        icon: <StorefrontOutlinedIcon fontSize="small" />,
    },
];

function CheckoutConsentCaption() {
    return (
        <Typography
            variant="caption"
            color="text.secondary"
            align="center"
            sx={{ mt: 1, display: "block", lineHeight: 1.45 }}
        >
            Нажимая кнопку «Оформить заказ», вы соглашаетесь с{" "}
            <MuiLink
                component={NextLink}
                href="/offer"
                target="_blank"
                rel="noopener noreferrer"
                color="primary"
            >
                условиями оферты
            </MuiLink>
            {" и "}
            <MuiLink
                component={NextLink}
                href="/privacy"
                target="_blank"
                rel="noopener noreferrer"
                color="primary"
            >
                политикой обработки персональных данных
            </MuiLink>
            .
        </Typography>
    );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const digitsOnly = (value: string) => value.replace(/\D/g, "");

function armenianPhoneNationalDigits(value: string): string {
    const d = digitsOnly(value);
    return d.startsWith("374") ? d.slice(3) : d;
}

function checkoutBasicsIncomplete(v: {
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

/** Показываем ошибку поля только после blur/тача или неудачной отправки формы. */
function showCheckoutFieldError(
    errors: FieldErrors<CheckoutFormValues>,
    touched: Partial<Readonly<Record<keyof CheckoutFormValues, boolean>>>,
    isSubmitted: boolean,
    field: keyof CheckoutFormValues,
): boolean {
    if (!errors[field]) return false;
    return Boolean(touched[field] || isSubmitted);
}

function formatZoneDeliveryPrice(price: number): string {
    return price === 0 ? "бесплатно" : `${price.toLocaleString("ru-RU")} ֏`;
}

function formatCheckoutDeliverySummary(opts: {
    isDelivery: boolean;
    requiresManagerApproval: boolean;
    zonesLoading: boolean;
    zonesError: string | null;
    deliveryZonesCount: number;
    selectedZone: DeliveryZoneOption | null;
}): string {
    if (!opts.isDelivery) return "—";
    if (opts.requiresManagerApproval) {
        return "Доставка уточняется менеджером";
    }
    if (opts.zonesLoading) return "…";
    if (opts.zonesError || opts.deliveryZonesCount === 0) return "—";
    if (!opts.selectedZone) return "Рассчитывается при выборе района";
    if (opts.selectedZone.deliveryPrice === 0) return "Бесплатно";
    return `${opts.selectedZone.deliveryPrice.toLocaleString("ru-RU")} ֏`;
}

function phoneForOrderPayload(phone: string, delivery: DeliveryType): string {
    const normalized = normalizePhoneToE164Digits(phone);
    if (normalized) return normalized;
    return delivery === "pickup" ? "" : phone.trim();
}

function formatPhone(input: string): string {
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

type DraftData = Omit<CheckoutFormValues, "hp"> & { ts: number };

type DeliveryZoneOption = {
    id: number;
    name: string;
    deliveryPrice: number;
    minOrderAmount: number;
    description?: string | null;
    requiresManagerApproval?: boolean;
};

function loadDraft(): Partial<CheckoutFormValues> | null {
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

function isAbortError(e: unknown): boolean {
    return (
        (e instanceof DOMException && e.name === "AbortError") ||
        (e instanceof Error && e.name === "AbortError")
    );
}

// ─── Payment option card ──────────────────────────────────────────────────────

type PaymentCardProps = {
    selected: boolean;
    onSelect: () => void;
    icon: React.ReactNode;
    label: string;
    sublabel: string;
};

function PaymentCard({ selected, onSelect, icon, label, sublabel }: PaymentCardProps) {
    return (
        <Paper
            onClick={onSelect}
            elevation={0}
            role="radio"
            aria-checked={selected}
            tabIndex={0}
            onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") onSelect();
            }}
            sx={{
                flex: 1,
                minWidth: 0,
                p: 2,
                cursor: "pointer",
                border: "1px solid",
                borderColor: selected ? "primary.main" : "divider",
                borderRadius: 2,
                bgcolor: selected ? tokens.brandDim : "background.paper",
                boxShadow: "none",
                transition: "all 0.15s ease",
                display: "flex",
                alignItems: "center",
                gap: 1.5,
                "&:hover": {
                    borderColor: selected ? "primary.main" : tokens.borderHi,
                    bgcolor: selected ? tokens.brandDim : tokens.surfaceHi,
                },
                userSelect: "none",
            }}
        >
            <Box
                sx={{
                    width: 40,
                    height: 40,
                    borderRadius: "50%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    bgcolor: selected ? "primary.main" : tokens.surfaceHi,
                    color: selected ? "primary.contrastText" : "text.secondary",
                    transition: "all 0.15s ease",
                    flexShrink: 0,
                }}
            >
                {icon}
            </Box>
            <Box sx={{ flex: 1, minWidth: 0, overflow: "hidden" }}>
                <Typography
                    variant="body2"
                    fontWeight={700}
                    sx={{
                        lineHeight: 1.2,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                    }}
                >
                    {label}
                </Typography>
                <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{
                        display: "block",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                    }}
                >
                    {sublabel}
                </Typography>
            </Box>
        </Paper>
    );
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function CheckoutPage() {
    const router = useRouter();
    const { data: session } = useSession();
    const sessionUser = session?.user ?? null;

    const items = useCartStore((state) => state.items);
    const clearCart = useCartStore((state) => state.clear);
    const appliedPromoCode = useCartStore((state) => state.appliedPromoCode);
    const setAppliedPromoCode = useCartStore((state) => state.setAppliedPromoCode);
    const markPriceMismatch = useCartStore((state) => state.markPriceMismatch);
    const hasPriceMismatch = useCartStore((state) => state.hasPriceMismatch);
    const resetPriceMismatch = useCartStore((state) => state.resetPriceMismatch);
    const isPlacingOrder = useCartStore((state) => state.isPlacingOrder);

    const hasItems = items.length > 0;

    // Сброс залипшего флага после неудачной попытки (не персистится, но может остаться в памяти).
    useEffect(() => {
        useCartStore.getState().setPlacingOrder(false);
    }, []);

    const {
        cartLineIssues,
        cartValidatePending,
        hasCartLineProblems,
        validSubtotal: cartSubtotal,
    } = useCartLineValidation(items);

    const [deliveryZones, setDeliveryZones] = useState<DeliveryZoneOption[]>([]);
    const [zonesLoading, setZonesLoading] = useState(true);
    const [zonesError, setZonesError] = useState<string | null>(null);
    /** Снимает гонку Strict Mode / размонтирования: только последний запрос сбрасывает loading. */
    const zonesFetchGenRef = useRef(0);

    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [missingItemError, setMissingItemError] = useState<string | null>(null);
    const [apiError, setApiError] = useState(false);
    const [isSubmittingLocal, setIsSubmittingLocal] = useState(false);
    const [promoDraft, setPromoDraft] = useState("");
    const [promoError, setPromoError] = useState<string | null>(null);
    const [promoDiscount, setPromoDiscount] = useState(0);
    const [promoApplying, setPromoApplying] = useState(false);

    const draft = useMemo(() => loadDraft(), []);

    const {
        control,
        register,
        handleSubmit,
        watch,
        setValue,
        getValues,
        clearErrors,
        formState: { errors, isSubmitting, touchedFields, isSubmitted },
    } = useForm<CheckoutFormValues>({
        resolver: zodResolver(checkoutSchema) as Resolver<CheckoutFormValues>,
        defaultValues: {
            name: draft?.name ?? "",
            email: draft?.email ?? "",
            phone: draft?.phone ?? "",
            address: draft?.address ?? "",
            comment: draft?.comment ?? "",
            payment: draft?.payment ?? "cash",
            delivery: draft?.delivery ?? "delivery",
            deliveryZoneId: draft?.deliveryZoneId,
            hp: "",
        },
        mode: "onTouched",
        reValidateMode: "onBlur",
    });

    // Авторизованный: имя и email из профиля. Телефон всегда вводится на чекауте.
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

    const delivery = watch("delivery");
    const deliveryZoneId = watch("deliveryZoneId");
    const payment = watch("payment");
    const nameW = watch("name");
    const phoneW = watch("phone");
    const addressW = watch("address");
    const isDelivery = delivery === "delivery";

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
                const res = await fetch("/api/delivery-zones", { signal: ac.signal });
                const raw = await res.json().catch(() => null);
                if (!res.ok) {
                    const msg =
                        raw &&
                        typeof raw === "object" &&
                        raw !== null &&
                        "error" in raw &&
                        typeof (raw as { error: unknown }).error === "string"
                            ? (raw as { error: string }).error
                            : `Не удалось загрузить зоны (${res.status})`;
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
                    setZonesError(
                        "Превышено время ожидания ответа сервера. Проверьте соединение и обновите страницу.",
                    );
                    setDeliveryZones([]);
                    return;
                }
                if (zonesFetchGenRef.current !== gen) return;
                setZonesError(
                    e instanceof Error
                        ? e.message
                        : "Не удалось загрузить зоны доставки",
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
    }, []);

    useEffect(() => {
        if (delivery !== "delivery") {
            setValue("deliveryZoneId", undefined, { shouldValidate: false });
            clearErrors(["deliveryZoneId", "address", "phone"]);
        }
    }, [delivery, setValue, clearErrors]);

    const selectedZone = useMemo(
        () =>
            deliveryZones.find((z) => z.id === deliveryZoneId) ?? null,
        [deliveryZones, deliveryZoneId],
    );

    const requiresManagerApproval = Boolean(
        isDelivery && selectedZone?.requiresManagerApproval,
    );
    const zoneDescription = (selectedZone?.description ?? "").trim();

    useEffect(() => {
        if (requiresManagerApproval) {
            setValue("payment", "cash", { shouldValidate: false });
        }
    }, [requiresManagerApproval, setValue]);

    const deliveryFee =
        isDelivery && selectedZone ? selectedZone.deliveryPrice : 0;
    const deliverySummaryLabel = formatCheckoutDeliverySummary({
        isDelivery,
        requiresManagerApproval,
        zonesLoading,
        zonesError,
        deliveryZonesCount: deliveryZones.length,
        selectedZone,
    });
    const showDeliveryBreakdown = isDelivery && selectedZone != null;
    const showDeliveryPendingHint = isDelivery && !selectedZone;
    const grossBeforeDiscount = cartSubtotal + deliveryFee;
    const grandTotal = Math.max(0, grossBeforeDiscount - promoDiscount);
    const belowMin =
        Boolean(isDelivery && selectedZone && cartSubtotal < selectedZone.minOrderAmount);

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
                        setPromoError(e.message || "Промокод недействителен");
                    } else {
                        setPromoError("Не удалось проверить промокод");
                    }
                }
            }
        }

        void syncPromo();

        return () => {
            cancelled = true;
        };
    }, [appliedPromoCode, cartSubtotal, deliveryFee, setAppliedPromoCode]);

    const handleApplyPromoClick = async () => {
        setPromoError(null);
        const raw = promoDraft.trim().replace(/\s+/g, "").toUpperCase();
        if (!raw) {
            setPromoError("Введите промокод");
            return;
        }

        const belowMinBlocked =
            isDelivery &&
            selectedZone &&
            cartSubtotal < selectedZone.minOrderAmount;
        if (belowMinBlocked) {
            setPromoError("Сначала наберите минимум по зоне доставки");
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
                setPromoError(e.message || "Промокод недействителен");
            } else {
                setPromoError("Не удалось проверить промокод");
            }
        } finally {
            setPromoApplying(false);
        }
    };

    const deliveryBlocked =
        isDelivery &&
        (zonesLoading ||
            Boolean(zonesError) ||
            deliveryZones.length === 0 ||
            belowMin);

    const hardSubmitDisabled =
        !hasItems ||
        isSubmitting ||
        isSubmittingLocal ||
        isPlacingOrder ||
        deliveryBlocked ||
        cartValidatePending ||
        hasCartLineProblems;
    const softMuted = checkoutIncomplete && !hardSubmitDisabled;
    const isBusySubmit = isSubmitting || isSubmittingLocal || isPlacingOrder;

    const submitButtonLabel = isBusySubmit
        ? "Отправка…"
        : requiresManagerApproval
          ? "Отправить заявку на подтверждение"
          : `Оформить заказ - ${grandTotal.toLocaleString("ru-RU")} ֏`;

    const onInvalid = (formErrors: FieldErrors<CheckoutFormValues>) => {
        const first = Object.values(formErrors).find(
            (e) => e && typeof e === "object" && "message" in e,
        );
        const msg =
            first && typeof first.message === "string"
                ? first.message
                : "Проверьте данные формы";
        setErrorMessage(msg);
        showAppToast(msg, "error");
    };

    // Persist draft to localStorage on every change
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

    const onSubmit = async (data: CheckoutFormValues) => {
        if (!hasItems) return;

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
                items: toOrderPayloadItems(items),
                totalPrice: grandTotal,
                subtotalBeforeDiscount: cartSubtotal,
                discountAmount: promoDiscount,
                ...(appliedPromoCode ? { promoCode: appliedPromoCode } : {}),
                deliveryZoneId:
                    data.delivery === "delivery" ? data.deliveryZoneId : undefined,
                hp: data.hp,
            });

            if (result?.ok && result.order?.id && result.order.accessToken) {
                useCartStore.getState().clear();
                try {
                    localStorage.removeItem(DRAFT_STORAGE_KEY);
                    sessionStorage.setItem(ORDER_ID_KEY, String(result.order.id));
                } catch { /* ignore */ }
                router.push(
                    `/order/${result.order.id}?key=${encodeURIComponent(result.order.accessToken)}`,
                );
                return;
            }

            const fallback = "Сервер не подтвердил заказ. Попробуйте ещё раз.";
            setErrorMessage(fallback);
            showAppToast(fallback, "error");
        } catch (error) {
            let message: string;

            if (error instanceof ApiError) {
                message =
                    error.message.trim() ||
                    (error.status >= 500
                        ? `Внутренняя ошибка сервера (${error.status})`
                        : `Ошибка запроса (${error.status})`);

                const isPriceConflict =
                    error.status === 409 &&
                    message.includes("Цены на некоторые позиции");
                if (isPriceConflict) {
                    markPriceMismatch();
                } else if (error.status === 409) {
                    setMissingItemError(message);
                }
                if (error.status >= 500) {
                    setApiError(true);
                }
            } else if (error instanceof Error) {
                message =
                    error.message.trim() ||
                    "Не удалось отправить заказ. Проверьте соединение.";
            } else {
                message = "Не удалось отправить заказ. Проверьте соединение.";
            }

            setErrorMessage(message);
            showAppToast(message, "error");
        } finally {
            setIsSubmittingLocal(false);
            useCartStore.getState().setPlacingOrder(false);
        }
    };

    return (
        <PageContainer>
                <Box
                    sx={{
                        pb: hasItems
                            ? { xs: "calc(88px + env(safe-area-inset-bottom))", md: 0 }
                            : 0,
                    }}
                >
                <SectionTitle pageTitle>Оформление заказа</SectionTitle>

                {/* Info banner */}
                <Paper
                    elevation={0}
                    sx={{
                        p: { xs: 2, md: 3 },
                        mb: 3,
                        borderRadius: 2,
                        border: "1px solid",
                        borderColor: "divider",
                        bgcolor: "background.paper",
                        boxShadow: "none",
                    }}
                >
                    <Stack direction={{ xs: "column", sm: "row" }} spacing={1} alignItems={{ xs: "flex-start", sm: "center" }}>
                        <Chip
                            label="Доставка за 45-60 минут"
                            color="warning"
                            size="small"
                            sx={{ fontWeight: 700, borderRadius: 999 }}
                        />
                        <Typography variant="body2" color="text.secondary" component="div">
                            <span>
                                Курьер перезвонит для подтверждения. Работаем{" "}
                                {OPENING_HOURS.label.toLowerCase()}.
                            </span>
                            <Box component="span" sx={{ display: "block", mt: 1, color: "text.primary" }}>
                                {PICKUP_LOCATION_LINE}
                            </Box>
                        </Typography>
                    </Stack>
                </Paper>

                {!hasItems && (
                    <Typography color="text.secondary">
                        Корзина пуста. Добавьте блюда перед оформлением заказа.
                    </Typography>
                )}

                {errorMessage && !apiError && (
                    <Alert severity="error" sx={{ mb: 3 }}>
                        {errorMessage}
                    </Alert>
                )}

                {missingItemError && (
                    <Alert severity="error" sx={{ mb: 3 }}>
                        Возможно, обновились цены или товар недоступен:{" "}
                        <strong>
                            {missingItemError || "товар временно отсутствует"}
                        </strong>
                        . Уберите позицию из корзины и попробуйте снова.
                    </Alert>
                )}

                {hasPriceMismatch && (
                    <Alert
                        severity="warning"
                        sx={{ mb: 3 }}
                        action={
                            <Button color="inherit" size="small" onClick={clearCart}>
                                Обновить корзину
                            </Button>
                        }
                    >
                        Цены на позиции обновились. Пересоберите корзину.
                    </Alert>
                )}

                {hasItems && hasCartLineProblems && (
                    <Alert severity="error" sx={{ mb: 3 }}>
                        Часть позиций недоступна или изменилась по цене. Удалите
                        подсвеченные строки или вернитесь в меню - оформление
                        недоступно, пока корзина не будет согласована с меню.
                    </Alert>
                )}

                {hasItems && cartValidatePending && !hasCartLineProblems && (
                    <Alert severity="info" sx={{ mb: 3 }}>
                        Проверяем актуальность корзины…
                    </Alert>
                )}

                {hasItems && (
                    <>
                    <Stack direction={{ xs: "column", md: "row" }} spacing={4} alignItems="flex-start">

                        {/* ── Form ── */}
                        <Box flex={2}>
                            {apiError && (
                                <Alert severity="error" sx={{ mt: 2 }}>
                                    Не удалось оформить заказ - на сервере произошла ошибка.
                                    Попробуйте чуть позже или обновите страницу.
                                </Alert>
                            )}
                            <Box
                                component="form"
                                id="checkout-form"
                                noValidate
                                onSubmit={handleSubmit(onSubmit, onInvalid)}
                                sx={{ display: "flex", flexDirection: "column", gap: 3 }}
                            >
                                {/* Honeypot — hidden from users */}
                                <input
                                    type="text"
                                    style={{ display: "none" }}
                                    tabIndex={-1}
                                    aria-hidden="true"
                                    autoComplete="off"
                                    readOnly
                                    {...register("hp")}
                                />

                                <Paper elevation={0} sx={checkoutSectionPaperSx}>
                                    <Typography component="h2" variant="subtitle1" fontWeight={800} letterSpacing={-0.02}>
                                        Данные
                                    </Typography>

                                {/* Name */}
                                <TextField
                                    label="Имя"
                                    fullWidth
                                    sx={checkoutInputRadiusSx}
                                    inputProps={{ style: { fontSize: 16 } }}
                                    {...register("name")}
                                    error={showCheckoutFieldError(
                                        errors,
                                        touchedFields,
                                        isSubmitted,
                                        "name",
                                    )}
                                    helperText={
                                        showCheckoutFieldError(
                                            errors,
                                            touchedFields,
                                            isSubmitted,
                                            "name",
                                        )
                                            ? errors.name?.message
                                            : undefined
                                    }
                                    InputProps={{
                                        startAdornment: (
                                            <InputAdornment position="start">
                                                <PersonOutlineOutlinedIcon
                                                    aria-hidden
                                                    focusable="false"
                                                    sx={{ color: "action.active" }}
                                                />
                                            </InputAdornment>
                                        ),
                                    }}
                                    required
                                />

                                {sessionUser ? (
                                    <TextField
                                        label="Email"
                                        type="email"
                                        fullWidth
                                        sx={checkoutInputRadiusSx}
                                        inputProps={{ style: { fontSize: 16 } }}
                                        {...register("email")}
                                        error={showCheckoutFieldError(
                                            errors,
                                            touchedFields,
                                            isSubmitted,
                                            "email",
                                        )}
                                        helperText={
                                            showCheckoutFieldError(
                                                errors,
                                                touchedFields,
                                                isSubmitted,
                                                "email",
                                            )
                                                ? errors.email?.message
                                                : undefined
                                        }
                                        InputProps={{
                                            readOnly: true,
                                            startAdornment: (
                                                <InputAdornment position="start">
                                                    <EmailOutlinedIcon sx={{ color: "action.active" }} />
                                                </InputAdornment>
                                            ),
                                        }}
                                    />
                                ) : null}

                                {/* Phone */}
                                <Controller
                                    control={control}
                                    name="phone"
                                    render={({ field }) => (
                                        <TextField
                                            label="Телефон"
                                            fullWidth
                                            sx={checkoutInputRadiusSx}
                                            value={field.value}
                                            onChange={(e) => field.onChange(formatPhone(e.target.value))}
                                            onBlur={field.onBlur}
                                            required={isDelivery}
                                            placeholder={PHONE_TEMPLATE}
                                            inputProps={{ style: { fontSize: 16 }, inputMode: "tel" }}
                                            error={showCheckoutFieldError(
                                                errors,
                                                touchedFields,
                                                isSubmitted,
                                                "phone",
                                            )}
                                            helperText={
                                                showCheckoutFieldError(
                                                    errors,
                                                    touchedFields,
                                                    isSubmitted,
                                                    "phone",
                                                )
                                                    ? errors.phone?.message
                                                    : isDelivery
                                                      ? "Обязателен для доставки"
                                                      : "Опционально при самовывозе"
                                            }
                                            InputProps={{
                                                startAdornment: (
                                                    <InputAdornment position="start">
                                                        <PhoneOutlinedIcon sx={{ color: "action.active" }} />
                                                    </InputAdornment>
                                                ),
                                            }}
                                        />
                                    )}
                                />

                                </Paper>

                                <Paper elevation={0} sx={checkoutSectionPaperSx}>
                                    <Typography component="h2" variant="subtitle1" fontWeight={800} letterSpacing={-0.02}>
                                        Доставка
                                    </Typography>

                                {/* Delivery type */}
                                <Box>
                                    <Typography variant="body2" fontWeight={600} sx={{ mb: 1 }}>
                                        Способ получения
                                    </Typography>
                                    <Stack direction="row" spacing={1}>
                                        {DELIVERY_TYPE_OPTIONS.map(({ type, label, icon }) => (
                                            <Paper
                                                key={type}
                                                onClick={() => {
                                                    setValue("delivery", type, {
                                                        shouldValidate: false,
                                                    });
                                                    if (type === "pickup") {
                                                        clearErrors([
                                                            "address",
                                                            "deliveryZoneId",
                                                            "phone",
                                                        ]);
                                                    }
                                                }}
                                                elevation={0}
                                                role="radio"
                                                aria-checked={delivery === type}
                                                aria-label={label}
                                                tabIndex={0}
                                                onKeyDown={(e) => {
                                                    if (e.key === "Enter" || e.key === " ") {
                                                        setValue("delivery", type, {
                                                            shouldValidate: false,
                                                        });
                                                        if (type === "pickup") {
                                                            clearErrors([
                                                                "address",
                                                                "deliveryZoneId",
                                                                "phone",
                                                            ]);
                                                        }
                                                    }
                                                }}
                                                sx={{
                                                    flex: 1,
                                                    minWidth: 0,
                                                    p: 1.5,
                                                    cursor: "pointer",
                                                    border: "1px solid",
                                                    borderColor: delivery === type ? "primary.main" : "divider",
                                                    borderRadius: 2,
                                                    bgcolor: delivery === type ? tokens.brandDim : "background.paper",
                                                    boxShadow: "none",
                                                    transition: "all 0.15s ease",
                                                    display: "flex",
                                                    alignItems: "center",
                                                    justifyContent: "center",
                                                    userSelect: "none",
                                                    "&:hover": {
                                                        bgcolor: delivery === type ? tokens.brandDim : tokens.surfaceHi,
                                                        borderColor: delivery === type ? "primary.main" : tokens.borderHi,
                                                    },
                                                }}
                                            >
                                                <Stack
                                                    direction="row"
                                                    spacing={0.75}
                                                    alignItems="center"
                                                    justifyContent="center"
                                                >
                                                    <Box
                                                        sx={{
                                                            display: "flex",
                                                            color: delivery === type ? "primary.main" : "text.secondary",
                                                        }}
                                                    >
                                                        {icon}
                                                    </Box>
                                                    <Typography
                                                        variant="body2"
                                                        fontWeight={delivery === type ? 700 : 500}
                                                        noWrap
                                                    >
                                                        {label}
                                                    </Typography>
                                                </Stack>
                                            </Paper>
                                        ))}
                                    </Stack>
                                    <Typography
                                        variant="caption"
                                        color="text.secondary"
                                        sx={{ display: "block", mt: 1.5, lineHeight: 1.45 }}
                                    >
                                        Оплата только наличными или картой курьеру при получении заказа.
                                        Онлайн-оплата на сайте отсутствует.
                                        <Box component="span" sx={{ display: "block", mt: 1 }}>
                                            {PICKUP_LOCATION_LINE}
                                        </Box>
                                    </Typography>
                                </Box>

                                {/* Delivery zone */}
                                {isDelivery && zonesLoading && (
                                    <Stack direction="row" spacing={1.5} alignItems="center">
                                        <CircularProgress size={22} />
                                        <Typography variant="body2" color="text.secondary">
                                            Загружаем зоны доставки…
                                        </Typography>
                                    </Stack>
                                )}
                                {isDelivery && zonesError && (
                                    <Alert severity="error">{zonesError}</Alert>
                                )}
                                {isDelivery &&
                                    !zonesLoading &&
                                    !zonesError &&
                                    deliveryZones.length === 0 && (
                                        <>
                                            <Alert severity="warning">
                                                Доставка временно недоступна. Выберите самовывоз или попробуйте позже.
                                            </Alert>
                                            <FormControl fullWidth disabled sx={checkoutInputRadiusSx}>
                                                <InputLabel id="checkout-delivery-zone-unavailable-label">
                                                    Район / зона доставки
                                                </InputLabel>
                                                <Select
                                                    labelId="checkout-delivery-zone-unavailable-label"
                                                    label="Район / зона доставки"
                                                    value=""
                                                    MenuProps={deliveryZoneSelectMenuProps}
                                                    inputProps={{
                                                        style: { fontSize: 16 },
                                                    }}
                                                >
                                                    <MenuItem value="" disabled>
                                                        <em>Нет активных зон</em>
                                                    </MenuItem>
                                                </Select>
                                            </FormControl>
                                        </>
                                    )}
                                {isDelivery &&
                                    !zonesLoading &&
                                    !zonesError &&
                                    deliveryZones.length > 0 && (
                                        <>
                                            {belowMin && selectedZone && (
                                                <Alert severity="warning">
                                                    <Typography
                                                        component="div"
                                                        variant="body2"
                                                        sx={{ fontVariantNumeric: "tabular-nums" }}
                                                    >
                                                        Для зоны «{selectedZone.name}» минимальная сумма заказа -{" "}
                                                        {selectedZone.minOrderAmount.toLocaleString("ru-RU")} ֏ (сейчас{" "}
                                                        {cartSubtotal.toLocaleString("ru-RU")} ֏).
                                                    </Typography>
                                                </Alert>
                                            )}
                                            <FormControl
                                                fullWidth
                                                required
                                                error={showCheckoutFieldError(
                                                    errors,
                                                    touchedFields,
                                                    isSubmitted,
                                                    "deliveryZoneId",
                                                )}
                                                sx={checkoutInputRadiusSx}
                                            >
                                                <InputLabel id="checkout-delivery-zone-label">
                                                    Район / зона доставки
                                                </InputLabel>
                                                <Controller
                                                    control={control}
                                                    name="deliveryZoneId"
                                                    render={({ field }) => (
                                                        <Select
                                                            labelId="checkout-delivery-zone-label"
                                                            label="Район / зона доставки"
                                                            value={
                                                                field.value === undefined ||
                                                                field.value === null
                                                                    ? ""
                                                                    : field.value
                                                            }
                                                            onChange={(e) => {
                                                                const raw = e.target
                                                                    .value as unknown;
                                                                field.onChange(
                                                                    raw === "" ||
                                                                        raw === undefined
                                                                        ? undefined
                                                                        : Number(raw),
                                                                );
                                                            }}
                                                            MenuProps={deliveryZoneSelectMenuProps}
                                                            inputProps={{
                                                                style: { fontSize: 16 },
                                                            }}
                                                        >
                                                            <MenuItem value="" disabled>
                                                                <em>Выберите зону</em>
                                                            </MenuItem>
                                                            {deliveryZones.map((zone) => (
                                                                <MenuItem key={zone.id} value={zone.id}>
                                                                    {zone.name} - доставка{" "}
                                                                    {formatZoneDeliveryPrice(zone.deliveryPrice)}{" "}
                                                                    · от{" "}
                                                                    {zone.minOrderAmount.toLocaleString("ru-RU")}{" "}
                                                                    ֏
                                                                </MenuItem>
                                                            ))}
                                                        </Select>
                                                    )}
                                                />
                                                <FormHelperText>
                                                    {showCheckoutFieldError(
                                                        errors,
                                                        touchedFields,
                                                        isSubmitted,
                                                        "deliveryZoneId",
                                                    )
                                                        ? errors.deliveryZoneId?.message
                                                        : "Цена доставки и минимальный заказ зависят от района."}
                                                </FormHelperText>
                                            </FormControl>
                                            {zoneDescription ? (
                                                <Alert severity="info" sx={{ mt: 1 }}>
                                                    {zoneDescription}
                                                </Alert>
                                            ) : null}
                                            {requiresManagerApproval ? (
                                                <Alert severity="warning" sx={{ mt: 1 }}>
                                                    Доставка в этот район требует подтверждения. Наш
                                                    менеджер перезвонит вам для уточнения стоимости и
                                                    сроков.
                                                </Alert>
                                            ) : null}
                                        </>
                                    )}

                                {/* Address (shown only for delivery) */}
                                {isDelivery && (
                                    <TextField
                                        label="Адрес доставки"
                                        fullWidth
                                        sx={checkoutInputRadiusSx}
                                        inputProps={{ style: { fontSize: 16 } }}
                                        {...register("address")}
                                        required
                                        error={showCheckoutFieldError(
                                            errors,
                                            touchedFields,
                                            isSubmitted,
                                            "address",
                                        )}
                                        helperText={
                                            showCheckoutFieldError(
                                                errors,
                                                touchedFields,
                                                isSubmitted,
                                                "address",
                                            )
                                                ? errors.address?.message
                                                : undefined
                                        }
                                        InputProps={{
                                            startAdornment: (
                                                <InputAdornment position="start">
                                                    <HomeOutlinedIcon sx={{ fontSize: 18, color: "text.secondary" }} />
                                                </InputAdornment>
                                            ),
                                        }}
                                    />
                                )}

                                </Paper>

                                <Paper elevation={0} sx={checkoutSectionPaperSx}>
                                    <Typography component="h2" variant="subtitle1" fontWeight={800} letterSpacing={-0.02}>
                                        Оплата
                                    </Typography>

                                {requiresManagerApproval ? (
                                    <Alert severity="info" icon={<PhoneOutlinedIcon fontSize="inherit" />}>
                                        Оплата курьеру / по телефону после подтверждения заказа менеджером.
                                    </Alert>
                                ) : (
                                    <Box>
                                        <Typography variant="body2" fontWeight={600} sx={{ mb: 1.5 }}>
                                            Способ оплаты
                                        </Typography>
                                        <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
                                            <PaymentCard
                                                selected={payment === "cash"}
                                                onSelect={() =>
                                                    setValue("payment", "cash", { shouldValidate: false })
                                                }
                                                icon={<LocalAtmOutlinedIcon fontSize="small" />}
                                                label="Наличными"
                                                sublabel="Курьеру при доставке"
                                            />
                                            <PaymentCard
                                                selected={payment === "card"}
                                                onSelect={() =>
                                                    setValue("payment", "card", { shouldValidate: false })
                                                }
                                                icon={<CreditCardOutlinedIcon fontSize="small" />}
                                                label="Картой курьеру"
                                                sublabel="Терминал при получении, не на сайте"
                                            />
                                        </Stack>
                                    </Box>
                                )}

                                {/* Comment */}
                                <TextField
                                    label="Комментарий к заказу"
                                    fullWidth
                                    multiline
                                    minRows={2}
                                    sx={checkoutInputRadiusSx}
                                    {...register("comment")}
                                    InputProps={{
                                        style: { fontSize: 16 },
                                        startAdornment: (
                                            <InputAdornment position="start">
                                                <NotesIcon sx={{ fontSize: 18, color: "text.secondary" }} />
                                            </InputAdornment>
                                        ),
                                    }}
                                />

                                </Paper>

                                <Box sx={{ display: { xs: "none", md: "block" } }}>
                                    <Button
                                        type="submit"
                                        variant="contained"
                                        color="primary"
                                        size="large"
                                        fullWidth
                                        disabled={hardSubmitDisabled}
                                        sx={{
                                            mt: 0.5,
                                            py: 1.25,
                                            fontWeight: 700,
                                            fontVariantNumeric: "tabular-nums",
                                            bgcolor: "primary.main",
                                            boxShadow: "none",
                                            ...(isBusySubmit
                                                ? {
                                                      opacity: 0.72,
                                                      cursor: "not-allowed",
                                                  }
                                                : softMuted
                                                  ? {
                                                        opacity: 0.6,
                                                        "&:hover": {
                                                            bgcolor: "primary.main",
                                                            boxShadow: "none",
                                                            transform: "none",
                                                        },
                                                    }
                                                  : {
                                                        "&:hover": {
                                                            bgcolor: "primary.dark",
                                                            boxShadow: (t) =>
                                                                `0 1px 4px ${alpha(t.palette.primary.main, 0.35)}`,
                                                        },
                                                    }),
                                        }}
                                    >
                                        {submitButtonLabel}
                                    </Button>
                                    <CheckoutConsentCaption />
                                </Box>
                            </Box>
                        </Box>

                        {/* ── Order summary (sticky on desktop) ── */}
                        <Box
                            flex={1}
                            sx={{
                                p: 3,
                                borderRadius: 2,
                                border: `1px solid ${tokens.border}`,
                                bgcolor: "background.paper",
                                minWidth: { xs: "100%", md: 280 },
                                position: { md: "sticky" },
                                top: { md: 80 },
                                boxShadow: "none",
                            }}
                        >
                            <Typography
                                component="h2"
                                variant="subtitle1"
                                fontWeight={800}
                                sx={{ mb: 2, letterSpacing: -0.02 }}
                            >
                                Состав заказа
                            </Typography>

                            <Stack spacing={1} sx={{ mb: 2 }}>
                                {items.map((item) => (
                                    <CheckoutOrderLine
                                        key={item.cartItemId}
                                        item={item}
                                        lineIssue={cartLineIssues[item.cartItemId]}
                                    />
                                ))}
                            </Stack>

                            <Divider sx={{ my: 2 }} />

                            <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.5, minWidth: 0 }}>
                                <Typography variant="body2" color="text.secondary" sx={{ minWidth: 0, flex: 1, pr: 1 }}>
                                    Товары
                                </Typography>
                                <Typography
                                    variant="body2"
                                    fontWeight={600}
                                    sx={{ fontVariantNumeric: "tabular-nums", flexShrink: 0, whiteSpace: "nowrap" }}
                                >
                                    {cartSubtotal.toLocaleString("ru-RU")} ֏
                                </Typography>
                            </Stack>

                            {showDeliveryBreakdown ? (
                                <Stack
                                    direction="row"
                                    justifyContent="space-between"
                                    sx={{ mb: 1, minWidth: 0 }}
                                >
                                    <Typography variant="body2" color="text.secondary" sx={{ minWidth: 0, flex: 1, pr: 1 }}>
                                        Доставка
                                    </Typography>
                                    <Typography
                                        variant="body2"
                                        fontWeight={600}
                                        color={
                                            requiresManagerApproval
                                                ? "error.main"
                                                : deliveryFee === 0
                                                  ? "success.main"
                                                  : "text.primary"
                                        }
                                        sx={{
                                            fontVariantNumeric: "tabular-nums",
                                            flexShrink: 0,
                                            whiteSpace: "nowrap",
                                            textAlign: "right",
                                        }}
                                    >
                                        {deliverySummaryLabel}
                                    </Typography>
                                </Stack>
                            ) : null}

                            <TextField
                                value={promoDraft}
                                onChange={(e) => {
                                    setPromoDraft(e.target.value.toUpperCase());
                                    if (promoError) setPromoError(null);
                                }}
                                placeholder="Промокод"
                                size="small"
                                fullWidth
                                disabled={deliveryBlocked || !hasItems || promoApplying}
                                error={Boolean(promoError)}
                                helperText={
                                    promoError ||
                                    (appliedPromoCode ? `Применён: ${appliedPromoCode}` : "")
                                }
                                FormHelperTextProps={{
                                    sx: appliedPromoCode && !promoError
                                        ? { color: "success.main" }
                                        : undefined,
                                }}
                                InputProps={{
                                    startAdornment: (
                                        <InputAdornment position="start">
                                            <LocalOfferOutlinedIcon
                                                sx={{ fontSize: 18, color: "text.secondary" }}
                                            />
                                        </InputAdornment>
                                    ),
                                    endAdornment: (
                                        <InputAdornment position="end">
                                            <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                                                {appliedPromoCode ? (
                                                    <Button
                                                        type="button"
                                                        size="small"
                                                        sx={{ textTransform: "none", minWidth: 0, px: 1 }}
                                                        onClick={() => {
                                                            setAppliedPromoCode(null);
                                                            setPromoDraft("");
                                                            setPromoError(null);
                                                        }}
                                                    >
                                                        Сбросить
                                                    </Button>
                                                ) : null}
                                                <Button
                                                    type="button"
                                                    size="small"
                                                    sx={{ textTransform: "none", minWidth: 0, px: 1 }}
                                                    disabled={
                                                        deliveryBlocked ||
                                                        !hasItems ||
                                                        promoApplying
                                                    }
                                                    onClick={() => void handleApplyPromoClick()}
                                                >
                                                    {promoApplying ? "…" : "Применить"}
                                                </Button>
                                            </Box>
                                        </InputAdornment>
                                    ),
                                }}
                                sx={{ mb: promoDiscount > 0 ? 0.5 : 1 }}
                                onKeyDown={(e) => {
                                    if (e.key === "Enter") {
                                        e.preventDefault();
                                        void handleApplyPromoClick();
                                    }
                                }}
                            />

                            {promoDiscount > 0 ? (
                                <Stack
                                    direction="row"
                                    justifyContent="space-between"
                                    sx={{ mb: 1, minWidth: 0 }}
                                >
                                    <Typography variant="body2" color="success.main" sx={{ minWidth: 0, flex: 1, pr: 1 }}>
                                        Скидка по промокоду
                                    </Typography>
                                    <Typography
                                        variant="body2"
                                        color="success.main"
                                        fontWeight={600}
                                        sx={{ fontVariantNumeric: "tabular-nums", flexShrink: 0, whiteSpace: "nowrap" }}
                                    >
                                        −{promoDiscount.toLocaleString("ru-RU")} ֏
                                    </Typography>
                                </Stack>
                            ) : null}

                            <Stack direction="row" justifyContent="space-between" sx={{ minWidth: 0 }}>
                                <Typography variant="subtitle1" fontWeight={700} sx={{ minWidth: 0, flex: 1, pr: 1 }}>
                                    Итого
                                </Typography>
                                <Typography
                                    variant="subtitle1"
                                    fontWeight={800}
                                    sx={{ fontVariantNumeric: "tabular-nums", flexShrink: 0, whiteSpace: "nowrap" }}
                                >
                                    {grandTotal.toLocaleString("ru-RU")} ֏
                                </Typography>
                            </Stack>

                            {showDeliveryPendingHint ? (
                                <Typography
                                    variant="caption"
                                    color="text.secondary"
                                    sx={{ display: "block", mt: 0.75, lineHeight: 1.45 }}
                                >
                                    Стоимость доставки будет рассчитана ниже
                                </Typography>
                            ) : null}

                            <Typography
                                variant="caption"
                                color="text.secondary"
                                sx={{ display: "block", mt: 1.5, lineHeight: 1.45 }}
                            >
                                Подтверждая заказ, вы соглашаетесь на звонок курьера.
                            </Typography>
                        </Box>
                    </Stack>

                    <Box
                        sx={{
                            display: { xs: "flex", md: "none" },
                            flexDirection: "column",
                            position: "fixed",
                            left: 0,
                            right: 0,
                            bottom: 0,
                            zIndex: 1250,
                            px: 2,
                            pt: 1.5,
                            pb: "calc(12px + env(safe-area-inset-bottom))",
                            bgcolor: (t) => alpha(t.palette.background.paper, 0.92),
                            backdropFilter: "blur(12px)",
                            WebkitBackdropFilter: "blur(12px)",
                            borderTop: `1px solid ${tokens.border}`,
                            boxShadow: `0 -10px 40px ${alpha("#000", 0.075)}`,
                        }}
                    >
                        <Button
                            type="submit"
                            form="checkout-form"
                            variant="contained"
                            color="primary"
                            size="large"
                            fullWidth
                            disabled={hardSubmitDisabled}
                            sx={{
                                py: 1.35,
                                fontWeight: 700,
                                fontVariantNumeric: "tabular-nums",
                                borderRadius: 2,
                                boxShadow: softMuted && !isBusySubmit ? "none" : undefined,
                                ...(isBusySubmit
                                    ? {
                                          opacity: 0.72,
                                          cursor: "not-allowed",
                                      }
                                    : softMuted
                                      ? {
                                            opacity: 0.6,
                                            "&:hover": {
                                                bgcolor: "primary.main",
                                                boxShadow: "none",
                                                transform: "none",
                                            },
                                        }
                                      : {
                                            "&:hover": {
                                                bgcolor: "primary.dark",
                                                boxShadow: (t) =>
                                                    `0 1px 4px ${alpha(t.palette.primary.main, 0.35)}`,
                                            },
                                        }),
                            }}
                        >
                            {submitButtonLabel}
                        </Button>
                        <CheckoutConsentCaption />
                    </Box>
                    </>
                )}
                </Box>
        </PageContainer>
    );
}
