"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import CreditCardOutlinedIcon from "@mui/icons-material/CreditCardOutlined";
import HomeOutlinedIcon from "@mui/icons-material/HomeOutlined";
import LocalAtmOutlinedIcon from "@mui/icons-material/LocalAtmOutlined";
import NotesIcon from "@mui/icons-material/Notes";
import PersonOutlineOutlinedIcon from "@mui/icons-material/PersonOutlineOutlined";
import PhoneOutlinedIcon from "@mui/icons-material/PhoneOutlined";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Divider from "@mui/material/Divider";
import InputAdornment from "@mui/material/InputAdornment";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Controller, useForm, type Resolver } from "react-hook-form";

import { ApiError, placeOrder } from "@/shared/api";
import {
    checkoutSchema,
    type CheckoutFormValues,
    type DeliveryType,
    type PaymentMethod,
} from "@/shared/lib/schemas";
import { PageContainer, SectionTitle } from "@/shared/ui";
import { tokens } from "@/shared/ui/theme";
import { useCartStore } from "@/features/cart";

// ─── Constants ────────────────────────────────────────────────────────────────

const PHONE_TEMPLATE = "+374 (___) __-__-__";
const DRAFT_STORAGE_KEY = "checkout-draft";
const DRAFT_TTL_MS = 24 * 60 * 60 * 1_000;
const ORDER_ID_KEY = "last-order-id";

/** iOS-style tap targets (56px) and label alignment for checkout fields */
const checkoutTextFieldSx = {
    "& .MuiOutlinedInput-root": { borderRadius: 3, minHeight: 56 },
    "& .MuiInputLabel-root": { transform: "translate(14px, 20px) scale(1)" },
} as const;

// ─── Helpers ──────────────────────────────────────────────────────────────────

const digitsOnly = (value: string) => value.replace(/\D/g, "");

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

// ─── Payment option card ──────────────────────────────────────────────────────

type PaymentCardProps = {
    value: PaymentMethod;
    selected: boolean;
    onSelect: () => void;
    icon: React.ReactNode;
    label: string;
    sublabel: string;
};

function PaymentCard({ value, selected, onSelect, icon, label, sublabel }: PaymentCardProps) {
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
                p: 2,
                cursor: "pointer",
                border: "1px solid",
                borderColor: selected ? "primary.main" : "#f0f0f0",
                borderRadius: 2,
                bgcolor: selected ? tokens.orangeDim : "#FFFFFF",
                boxShadow: "none",
                transition: "all 0.15s ease",
                display: "flex",
                alignItems: "center",
                gap: 1.5,
                "&:hover": {
                    borderColor: selected ? "primary.main" : tokens.borderHi,
                    bgcolor: selected ? tokens.orangeDim : tokens.surfaceHi,
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
                    color: selected ? "white" : "text.secondary",
                    transition: "all 0.15s ease",
                    flexShrink: 0,
                }}
            >
                {icon}
            </Box>
            <Box>
                <Typography variant="body2" fontWeight={700} sx={{ lineHeight: 1.2 }}>
                    {label}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                    {sublabel}
                </Typography>
            </Box>
        </Paper>
    );
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function CheckoutPage() {
    const router = useRouter();

    const items = useCartStore((state) => state.items);
    const clearCart = useCartStore((state) => state.clear);
    const markPriceMismatch = useCartStore((state) => state.markPriceMismatch);
    const hasPriceMismatch = useCartStore((state) => state.hasPriceMismatch);
    const resetPriceMismatch = useCartStore((state) => state.resetPriceMismatch);

    const hasItems = items.length > 0;
    const totalPrice = useMemo(
        () => items.reduce((sum, item) => sum + item.price * item.quantity, 0),
        [items],
    );

    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    const draft = useMemo(() => loadDraft(), []);

    const {
        control,
        register,
        handleSubmit,
        watch,
        setValue,
        formState: { errors, isSubmitting },
    } = useForm<CheckoutFormValues>({
        resolver: zodResolver(checkoutSchema) as Resolver<CheckoutFormValues>,
        defaultValues: {
            name: draft?.name ?? "",
            phone: draft?.phone ?? "",
            address: draft?.address ?? "",
            comment: draft?.comment ?? "",
            payment: draft?.payment ?? "cash",
            delivery: draft?.delivery ?? "delivery",
            hp: "",
        },
        mode: "onBlur",
    });

    const delivery = watch("delivery");
    const payment = watch("payment");
    const isDelivery = delivery === "delivery";

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
        setErrorMessage(null);
        resetPriceMismatch();

        try {
            const result = await placeOrder({
                name: data.name.trim(),
                phone: data.phone.trim(),
                address: data.delivery === "delivery" ? data.address.trim() : "",
                comment: data.comment.trim(),
                payment: data.payment,
                delivery: data.delivery,
                items: items.map((item) => ({
                    productId: item.productId,
                    name: item.name,
                    price: item.price,
                    quantity: item.quantity,
                })),
                totalPrice,
                hp: data.hp,
            });

            if (result.ok) {
                useCartStore.getState().clear();
                try {
                    localStorage.removeItem(DRAFT_STORAGE_KEY);
                    sessionStorage.setItem(ORDER_ID_KEY, String(result.orderId));
                } catch { /* ignore */ }
                router.push("/order-success");
            }
        } catch (error) {
            if (error instanceof ApiError && error.status === 409) {
                markPriceMismatch();
            }
            setErrorMessage(
                error instanceof ApiError
                    ? error.message
                    : "Не удалось отправить заказ. Попробуйте ещё раз.",
            );
        }
    };

    return (
        <main>
            <PageContainer>
                <SectionTitle>Оформление заказа</SectionTitle>

                {/* Info banner */}
                <Paper
                    elevation={0}
                    sx={{
                        p: { xs: 2, md: 3 },
                        mb: 3,
                        borderRadius: 2,
                        border: "1px solid #f0f0f0",
                        bgcolor: "#FFFFFF",
                        boxShadow: "none",
                    }}
                >
                    <Stack direction={{ xs: "column", sm: "row" }} spacing={1} alignItems={{ xs: "flex-start", sm: "center" }}>
                        <Chip
                            label="Доставка за 45–60 минут"
                            color="warning"
                            size="small"
                            sx={{ fontWeight: 700, borderRadius: 999 }}
                        />
                        <Typography variant="body2" color="text.secondary">
                            Курьер перезвонит для подтверждения. Работаем с 11:00 до 23:00.
                        </Typography>
                    </Stack>
                </Paper>

                {!hasItems && (
                    <Typography color="text.secondary">
                        Корзина пуста. Добавьте блюда перед оформлением заказа.
                    </Typography>
                )}

                {errorMessage && (
                    <Alert severity="error" sx={{ mb: 3 }}>
                        {errorMessage}
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

                {hasItems && (
                    <Stack direction={{ xs: "column", md: "row" }} spacing={4} alignItems="flex-start">

                        {/* ── Form ── */}
                        <Box flex={2}>
                            <Paper
                                component="form"
                                noValidate
                                onSubmit={handleSubmit(onSubmit)}
                                elevation={0}
                                sx={{
                                    p: { xs: 2, md: 3 },
                                    borderRadius: 2,
                                    border: "1px solid #f0f0f0",
                                    bgcolor: "#FFFFFF",
                                    boxShadow: "none",
                                    display: "flex",
                                    flexDirection: "column",
                                    gap: 2.5,
                                }}
                            >
                                {/* Honeypot — hidden from users */}
                                <input
                                    type="text"
                                    style={{ display: "none" }}
                                    tabIndex={-1}
                                    aria-hidden
                                    autoComplete="off"
                                    {...register("hp")}
                                />

                                {/* Name */}
                                <TextField
                                    label="Имя"
                                    fullWidth
                                    sx={checkoutTextFieldSx}
                                    {...register("name")}
                                    error={Boolean(errors.name)}
                                    helperText={errors.name?.message}
                                    InputProps={{
                                        startAdornment: (
                                            <InputAdornment position="start">
                                                <PersonOutlineOutlinedIcon sx={{ fontSize: 18, color: "text.secondary" }} />
                                            </InputAdornment>
                                        ),
                                    }}
                                    required
                                />

                                {/* Phone */}
                                <Controller
                                    control={control}
                                    name="phone"
                                    render={({ field }) => (
                                        <TextField
                                            label="Телефон"
                                            fullWidth
                                            sx={checkoutTextFieldSx}
                                            value={field.value}
                                            onChange={(e) => field.onChange(formatPhone(e.target.value))}
                                            required
                                            placeholder={PHONE_TEMPLATE}
                                            inputProps={{ inputMode: "tel" }}
                                            error={Boolean(errors.phone)}
                                            helperText={errors.phone?.message ?? "Пример: +374 (xx) xx-xx-xx"}
                                            InputProps={{
                                                startAdornment: (
                                                    <InputAdornment position="start">
                                                        <PhoneOutlinedIcon sx={{ fontSize: 18, color: "text.secondary" }} />
                                                    </InputAdornment>
                                                ),
                                            }}
                                        />
                                    )}
                                />

                                {/* Delivery type */}
                                <Box>
                                    <Typography variant="body2" fontWeight={600} sx={{ mb: 1 }}>
                                        Способ получения
                                    </Typography>
                                    <Stack direction="row" spacing={1.5}>
                                        {(["delivery", "pickup"] as DeliveryType[]).map((type) => (
                                            <Paper
                                                key={type}
                                                onClick={() => setValue("delivery", type, { shouldValidate: true })}
                                                elevation={0}
                                                role="radio"
                                                aria-checked={delivery === type}
                                                tabIndex={0}
                                                onKeyDown={(e) => {
                                                    if (e.key === "Enter" || e.key === " ")
                                                        setValue("delivery", type, { shouldValidate: true });
                                                }}
                                                sx={{
                                                    flex: 1,
                                                    p: 1.5,
                                                    cursor: "pointer",
                                                    border: "1px solid",
                                                    borderColor: delivery === type ? "primary.main" : "#f0f0f0",
                                                    borderRadius: 2,
                                                    bgcolor: delivery === type ? tokens.orangeDim : "#FFFFFF",
                                                    boxShadow: "none",
                                                    transition: "all 0.15s ease",
                                                    textAlign: "center",
                                                    userSelect: "none",
                                                    "&:hover": {
                                                        bgcolor: delivery === type ? tokens.orangeDim : tokens.surfaceHi,
                                                        borderColor: delivery === type ? "primary.main" : tokens.borderHi,
                                                    },
                                                }}
                                            >
                                                <Typography variant="body2" fontWeight={delivery === type ? 700 : 500}>
                                                    {type === "delivery" ? "🛵  Доставка" : "🏪  Самовывоз"}
                                                </Typography>
                                            </Paper>
                                        ))}
                                    </Stack>
                                </Box>

                                {/* Address (shown only for delivery) */}
                                {isDelivery && (
                                    <TextField
                                        label="Адрес доставки"
                                        fullWidth
                                        sx={checkoutTextFieldSx}
                                        {...register("address")}
                                        required
                                        error={Boolean(errors.address)}
                                        helperText={errors.address?.message}
                                        InputProps={{
                                            startAdornment: (
                                                <InputAdornment position="start">
                                                    <HomeOutlinedIcon sx={{ fontSize: 18, color: "text.secondary" }} />
                                                </InputAdornment>
                                            ),
                                        }}
                                    />
                                )}

                                {/* Comment */}
                                <TextField
                                    label="Комментарий к заказу"
                                    fullWidth
                                    multiline
                                    minRows={2}
                                    sx={checkoutTextFieldSx}
                                    {...register("comment")}
                                    InputProps={{
                                        startAdornment: (
                                            <InputAdornment position="start">
                                                <NotesIcon sx={{ fontSize: 18, color: "text.secondary" }} />
                                            </InputAdornment>
                                        ),
                                    }}
                                />

                                {/* Payment — visual cards instead of plain radios */}
                                <Box>
                                    <Typography variant="body2" fontWeight={600} sx={{ mb: 1.5 }}>
                                        Способ оплаты
                                    </Typography>
                                    <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
                                        <PaymentCard
                                            value="cash"
                                            selected={payment === "cash"}
                                            onSelect={() => setValue("payment", "cash", { shouldValidate: true })}
                                            icon={<LocalAtmOutlinedIcon fontSize="small" />}
                                            label="Наличными"
                                            sublabel="Курьеру при доставке"
                                        />
                                        <PaymentCard
                                            value="card"
                                            selected={payment === "card"}
                                            onSelect={() => setValue("payment", "card", { shouldValidate: true })}
                                            icon={<CreditCardOutlinedIcon fontSize="small" />}
                                            label="Картой курьеру"
                                            sublabel="Visa, Mastercard, Mir"
                                        />
                                    </Stack>
                                </Box>

                                <Button
                                    type="submit"
                                    variant="contained"
                                    color="primary"
                                    size="large"
                                    fullWidth
                                    disabled={!hasItems || isSubmitting}
                                    sx={{
                                        mt: 1,
                                        py: 1.25,
                                        fontWeight: 700,
                                        bgcolor: "primary.main",
                                        boxShadow: "none",
                                        "&:hover": {
                                            bgcolor: "primary.dark",
                                            boxShadow: "0 1px 4px rgba(232,93,74,0.35)",
                                        },
                                    }}
                                >
                                    {isSubmitting ? "Отправка…" : `Подтвердить заказ — ${totalPrice.toLocaleString("ru-RU")} ֏`}
                                </Button>
                            </Paper>
                        </Box>

                        {/* ── Order summary (sticky on desktop) ── */}
                        <Box
                            flex={1}
                            sx={{
                                p: 3,
                                borderRadius: 2,
                                border: "1px solid #f0f0f0",
                                bgcolor: "#FFFFFF",
                                minWidth: { xs: "100%", md: 280 },
                                position: { md: "sticky" },
                                top: { md: 80 },
                                boxShadow: "none",
                            }}
                        >
                            <Typography variant="h6" sx={{ mb: 2 }}>
                                Ваш заказ
                            </Typography>

                            <Stack spacing={1.2} sx={{ mb: 2 }}>
                                {items.map((item) => (
                                    <Stack key={item.productId} direction="row" justifyContent="space-between">
                                        <Typography variant="body2" color="text.secondary">
                                            {item.name} × {item.quantity}
                                        </Typography>
                                        <Typography variant="body2" fontWeight={600}>
                                            {(item.price * item.quantity).toLocaleString("ru-RU")} ֏
                                        </Typography>
                                    </Stack>
                                ))}
                            </Stack>

                            <Divider sx={{ my: 2, borderColor: "#f0f0f0" }} />

                            <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.5 }}>
                                <Typography variant="body2" color="text.secondary">
                                    Доставка
                                </Typography>
                                <Typography variant="body2" color="success.main" fontWeight={600}>
                                    Бесплатно
                                </Typography>
                            </Stack>

                            <Stack direction="row" justifyContent="space-between" sx={{ mt: 1 }}>
                                <Typography variant="subtitle1" fontWeight={700}>
                                    Итого
                                </Typography>
                                <Typography variant="subtitle1" fontWeight={700}>
                                    {totalPrice.toLocaleString("ru-RU")} ֏
                                </Typography>
                            </Stack>

                            <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1.5 }}>
                                Подтверждая заказ, вы соглашаетесь на звонок курьера.
                            </Typography>
                        </Box>
                    </Stack>
                )}
            </PageContainer>
        </main>
    );
}
