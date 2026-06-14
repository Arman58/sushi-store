"use client";

import HomeOutlinedIcon from "@mui/icons-material/HomeOutlined";
import LocalShippingOutlinedIcon from "@mui/icons-material/LocalShippingOutlined";
import StorefrontOutlinedIcon from "@mui/icons-material/StorefrontOutlined";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import CircularProgress from "@mui/material/CircularProgress";
import InputAdornment from "@mui/material/InputAdornment";
import MenuItem from "@mui/material/MenuItem";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { useTranslations } from "next-intl";
import type { ReactNode } from "react";
import { Controller, useFormContext } from "react-hook-form";

import { deliveryZoneSelectMenuProps } from "@/features/checkout/model/constants";
import { showCheckoutFieldError } from "@/features/checkout/model/helpers";
import type { DeliveryZoneOption } from "@/features/checkout/model/types";
import type { CheckoutFormValues, DeliveryType } from "@/shared/lib/schemas";
import { AppInput, AppSelect } from "@/shared/ui";
import { tokens } from "@/shared/ui/theme";

import { DeliveryZoneSelect } from "../DeliveryZoneSelect";
import {
    checkoutFieldProps,
    checkoutInputRadiusSx,
    checkoutSectionPaperSx,
} from "../styles";

type DeliverySectionProps = {
    isDelivery: boolean;
    deliveryZones: DeliveryZoneOption[];
    zonesLoading: boolean;
    zonesError: string | null;
    selectedZone: DeliveryZoneOption | null;
    belowMin: boolean;
    requiresManagerApproval: boolean;
    zoneDescription: string;
    cartSubtotal: number;
    formatZoneDeliveryPrice: (price: number) => string;
};

const DELIVERY_TYPE_ICONS: Record<DeliveryType, ReactNode> = {
    delivery: <LocalShippingOutlinedIcon fontSize="small" />,
    pickup: <StorefrontOutlinedIcon fontSize="small" />,
};

export function DeliverySection({
    isDelivery,
    deliveryZones,
    zonesLoading,
    zonesError,
    selectedZone,
    belowMin,
    requiresManagerApproval,
    zoneDescription,
    cartSubtotal,
    formatZoneDeliveryPrice,
}: DeliverySectionProps) {
    const t = useTranslations("checkout.delivery");
    const tCheckout = useTranslations("checkout");
    const tCommon = useTranslations("common");
    const { control, register, setValue, clearErrors, watch, formState } =
        useFormContext<CheckoutFormValues>();
    const { errors, touchedFields, isSubmitted } = formState;
    const delivery = watch("delivery");

    const deliveryTypes: DeliveryType[] = ["delivery", "pickup"];

    const selectDeliveryType = (type: DeliveryType) => {
        setValue("delivery", type, { shouldValidate: false });
        if (type === "pickup") {
            clearErrors(["address", "deliveryZoneId", "phone"]);
        }
    };

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

            <Box>
                <Typography variant="body2" fontWeight={600} sx={{ mb: 1 }}>
                    {t("methodLabel")}
                </Typography>
                <Stack direction="row" spacing={1} sx={{ minWidth: 0 }}>
                    {deliveryTypes.map((type) => (
                        <Paper
                            key={type}
                            onClick={() => selectDeliveryType(type)}
                            elevation={0}
                            role="radio"
                            aria-checked={delivery === type}
                            aria-label={t(`type.${type}`)}
                            tabIndex={0}
                            onKeyDown={(e) => {
                                if (e.key === "Enter" || e.key === " ") {
                                    selectDeliveryType(type);
                                }
                            }}
                            sx={{
                                flex: 1,
                                minWidth: 0,
                                p: 1.5,
                                cursor: "pointer",
                                border: "1px solid",
                                borderColor:
                                    delivery === type
                                        ? "primary.main"
                                        : "divider",
                                borderRadius: 2,
                                bgcolor:
                                    delivery === type
                                        ? tokens.brandDim
                                        : "background.paper",
                                boxShadow: "none",
                                transition: "all 0.15s ease",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                userSelect: "none",
                                overflow: "hidden",
                                "&:hover": {
                                    bgcolor:
                                        delivery === type
                                            ? tokens.brandDim
                                            : tokens.surfaceHi,
                                    borderColor:
                                        delivery === type
                                            ? "primary.main"
                                            : tokens.borderHi,
                                },
                            }}
                        >
                            <Stack
                                direction="row"
                                spacing={0.75}
                                alignItems="center"
                                justifyContent="center"
                                sx={{ minWidth: 0, maxWidth: "100%" }}
                            >
                                <Box
                                    sx={{
                                        display: "flex",
                                        flexShrink: 0,
                                        color:
                                            delivery === type
                                                ? "primary.main"
                                                : "text.secondary",
                                    }}
                                >
                                    {DELIVERY_TYPE_ICONS[type]}
                                </Box>
                                <Typography
                                    variant="body2"
                                    fontWeight={delivery === type ? 700 : 500}
                                    sx={{
                                        minWidth: 0,
                                        overflow: "hidden",
                                        textOverflow: "ellipsis",
                                        whiteSpace: "nowrap",
                                    }}
                                >
                                    {t(`type.${type}`)}
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
                    {t("paymentNote")}
                    <Box component="span" sx={{ display: "block", mt: 1 }}>
                        {tCheckout("pickupLocation", {
                            address: tCommon("address.pickup"),
                        })}
                    </Box>
                </Typography>
            </Box>

            {isDelivery && zonesLoading && (
                <Stack direction="row" spacing={1.5} alignItems="center">
                    <CircularProgress size={22} />
                    <Typography variant="body2" color="text.secondary">
                        {t("zonesLoading")}
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
                        <Alert severity="warning">{t("zonesUnavailable")}</Alert>
                        <AppSelect
                            label={t("zoneLabel")}
                            size="small"
                            disabled
                            value=""
                            MenuProps={deliveryZoneSelectMenuProps}
                            sx={checkoutInputRadiusSx}
                        >
                            <MenuItem value="" disabled>
                                <em>{t("noActiveZones")}</em>
                            </MenuItem>
                        </AppSelect>
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
                                    {t("belowMin", {
                                        zone: selectedZone.name,
                                        min: selectedZone.minOrderAmount.toLocaleString(
                                            "ru-RU",
                                        ),
                                        current: cartSubtotal.toLocaleString(
                                            "ru-RU",
                                        ),
                                    })}
                                </Typography>
                            </Alert>
                        )}
                        <Controller
                            control={control}
                            name="deliveryZoneId"
                            render={({ field }) => (
                                <DeliveryZoneSelect
                                    label={t("zoneLabel")}
                                    required
                                    error={showCheckoutFieldError(
                                        errors,
                                        touchedFields,
                                        isSubmitted,
                                        "deliveryZoneId",
                                    )}
                                    helperText={
                                        showCheckoutFieldError(
                                            errors,
                                            touchedFields,
                                            isSubmitted,
                                            "deliveryZoneId",
                                        )
                                            ? errors.deliveryZoneId?.message
                                            : t("zoneHelper")
                                    }
                                    value={
                                        field.value === undefined ||
                                        field.value === null
                                            ? undefined
                                            : field.value
                                    }
                                    onChange={field.onChange}
                                    zones={deliveryZones}
                                    selectZonePlaceholder={t("selectZone")}
                                    dialogTitle={t("zoneLabel")}
                                    zoneOptionLabel={(zone) =>
                                        t("zoneOption", {
                                            name: zone.name,
                                            delivery: formatZoneDeliveryPrice(
                                                zone.deliveryPrice,
                                            ),
                                            min: zone.minOrderAmount.toLocaleString(
                                                "ru-RU",
                                            ),
                                        })
                                    }
                                />
                            )}
                        />
                        {zoneDescription ? (
                            <Alert severity="info" sx={{ mt: 1 }}>
                                {zoneDescription}
                            </Alert>
                        ) : null}
                        {requiresManagerApproval ? (
                            <Alert severity="warning" sx={{ mt: 1 }}>
                                {t("managerApprovalWarning")}
                            </Alert>
                        ) : null}
                    </>
                )}

            {isDelivery && (
                <AppInput
                    label={t("address")}
                    {...checkoutFieldProps}
                    sx={checkoutInputRadiusSx}
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
                                <HomeOutlinedIcon
                                    sx={{
                                        fontSize: 18,
                                        color: "text.secondary",
                                    }}
                                />
                            </InputAdornment>
                        ),
                    }}
                />
            )}
        </Paper>
    );
}
