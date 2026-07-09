"use client";

import EmailOutlinedIcon from "@mui/icons-material/EmailOutlined";
import PersonOutlineOutlinedIcon from "@mui/icons-material/PersonOutlineOutlined";
import PhoneOutlinedIcon from "@mui/icons-material/PhoneOutlined";
import InputAdornment from "@mui/material/InputAdornment";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import { useTranslations } from "next-intl";
import { Controller, useFormContext } from "react-hook-form";

import {
    CHECKOUT_PHONE_PREFIX,
    formatPhone,
    showCheckoutFieldError,
} from "@/features/checkout/model/helpers";
import type { CheckoutFormValues } from "@/shared/lib/schemas";
import { AppInput } from "@/shared/ui";

import {
    checkoutFieldProps,
    checkoutInputRadiusSx,
    checkoutSectionPaperSx,
} from "../styles";

type ContactSectionProps = {
    sessionUser: {
        name?: string | null;
        email?: string | null;
    } | null;
    isDelivery: boolean;
};

export function ContactSection({
    sessionUser,
    isDelivery,
}: ContactSectionProps) {
    const t = useTranslations("checkout.contact");
    const tCheckout = useTranslations("checkout");
    const { control, register, formState } =
        useFormContext<CheckoutFormValues>();
    const { errors, touchedFields, isSubmitted } = formState;

    return (
        <Paper elevation={0} sx={checkoutSectionPaperSx}>
            <Typography
                component="h2"
                variant="subtitle1"
                fontWeight={800}
                letterSpacing={-0.02}
            >
                {t("title")}
            </Typography>

            <AppInput
                label={t("name")}
                {...checkoutFieldProps}
                sx={checkoutInputRadiusSx}
                {...register("name")}
                autoComplete="name"
                name="name"
                inputProps={{ enterKeyHint: "next", autoCapitalize: "words" }}
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
                <AppInput
                    label={t("email")}
                    type="email"
                    {...checkoutFieldProps}
                    sx={checkoutInputRadiusSx}
                    {...register("email")}
                    autoComplete="email"
                    name="email"
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

            <Controller
                control={control}
                name="phone"
                render={({ field }) => (
                    <AppInput
                        label={t("phone")}
                        {...checkoutFieldProps}
                        sx={checkoutInputRadiusSx}
                        name={field.name}
                        value={field.value}
                        onChange={(e) =>
                            field.onChange(
                                formatPhone(e.target.value, field.value ?? ""),
                            )
                        }
                        onKeyDown={(e) => {
                            const current = field.value ?? "";
                            // Не даём стереть код страны — поле всегда минимум +374
                            if (
                                (e.key === "Backspace" || e.key === "Delete") &&
                                current === CHECKOUT_PHONE_PREFIX
                            ) {
                                e.preventDefault();
                            }
                        }}
                        onBlur={field.onBlur}
                        inputRef={field.ref}
                        required={isDelivery}
                        placeholder={tCheckout("phoneTemplate")}
                        autoComplete="tel"
                        inputProps={{
                            inputMode: "tel",
                            enterKeyHint: "next",
                            autoComplete: "tel",
                        }}
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
                                  ? t("phoneRequiredDelivery")
                                  : t("phoneOptionalPickup")
                        }
                        InputProps={{
                            startAdornment: (
                                <InputAdornment position="start">
                                    <PhoneOutlinedIcon
                                        sx={{ color: "action.active" }}
                                    />
                                </InputAdornment>
                            ),
                        }}
                    />
                )}
            />
        </Paper>
    );
}
