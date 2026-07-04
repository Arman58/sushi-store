"use client";

import HomeOutlinedIcon from "@mui/icons-material/HomeOutlined";
import LocalShippingOutlinedIcon from "@mui/icons-material/LocalShippingOutlined";
import StorefrontOutlinedIcon from "@mui/icons-material/StorefrontOutlined";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Checkbox from "@mui/material/Checkbox";
import CircularProgress from "@mui/material/CircularProgress";
import FormControl from "@mui/material/FormControl";
import FormControlLabel from "@mui/material/FormControlLabel";
import FormLabel from "@mui/material/FormLabel";
import InputAdornment from "@mui/material/InputAdornment";
import MenuItem from "@mui/material/MenuItem";
import Paper from "@mui/material/Paper";
import Radio from "@mui/material/Radio";
import RadioGroup from "@mui/material/RadioGroup";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { useTranslations } from "next-intl";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { Controller, useFormContext } from "react-hook-form";

import { deliveryZoneSelectMenuProps } from "@/features/checkout/model/constants";
import { showCheckoutFieldError } from "@/features/checkout/model/helpers";
import type { DeliveryZoneOption } from "@/features/checkout/model/types";
import {
    formatSavedAddressLine,
    type SavedAddressDto,
} from "@/lib/saved-address";
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
    isAuthenticated: boolean;
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
    isAuthenticated,
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
    const tProfile = useTranslations("profile");
    const tCommon = useTranslations("common");
    const { control, register, setValue, clearErrors, watch, formState } =
        useFormContext<CheckoutFormValues>();
    const { errors, touchedFields, isSubmitted } = formState;
    const delivery = watch("delivery");
    const saveAddress = watch("saveAddress");

    const [savedAddresses, setSavedAddresses] = useState<SavedAddressDto[]>([]);
    const [addressesLoading, setAddressesLoading] = useState(false);
    const [selectedAddressId, setSelectedAddressId] = useState<string>("");

    useEffect(() => {
        if (!isAuthenticated || !isDelivery) {
            setSavedAddresses([]);
            setSelectedAddressId("");
            return;
        }

        let cancelled = false;
        setAddressesLoading(true);

        void (async () => {
            try {
                const res = await fetch("/api/profile/addresses");
                if (!res.ok || cancelled) return;
                const data = (await res.json()) as { addresses?: SavedAddressDto[] };
                if (!cancelled) {
                    const list = Array.isArray(data.addresses)
                        ? data.addresses
                        : [];
                    setSavedAddresses(list);

                    // Автозаполнение: для вернувшихся клиентов сразу подставляем
                    // самый свежий адрес, если поле пустое - меньше трения.
                    const currentAddress = (watch("address") ?? "").trim();
                    if (list.length > 0 && !currentAddress) {
                        const newest = [...list].sort((a, b) =>
                            b.createdAt.localeCompare(a.createdAt),
                        )[0];
                        setSelectedAddressId(String(newest.id));
                        setValue("address", newest.street, {
                            shouldValidate: true,
                            shouldDirty: false,
                        });
                        setValue("apartment", newest.apartment ?? "", {
                            shouldValidate: false,
                        });
                        if (newest.comment) {
                            setValue("comment", newest.comment, {
                                shouldValidate: false,
                            });
                        }
                    }
                }
            } catch {
                if (!cancelled) setSavedAddresses([]);
            } finally {
                if (!cancelled) setAddressesLoading(false);
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [isAuthenticated, isDelivery, setValue, watch]);

    const deliveryTypes: DeliveryType[] = ["delivery", "pickup"];

    const selectDeliveryType = (type: DeliveryType) => {
        setValue("delivery", type, { shouldValidate: false });
        if (type === "pickup") {
            clearErrors(["address", "deliveryZoneId", "phone"]);
            setSelectedAddressId("");
        }
    };

    const applySavedAddress = (address: SavedAddressDto) => {
        setValue("address", address.street, { shouldValidate: true, shouldDirty: true });
        setValue("apartment", address.apartment ?? "", {
            shouldValidate: false,
            shouldDirty: true,
        });
        if (address.comment) {
            setValue("comment", address.comment, {
                shouldValidate: false,
                shouldDirty: true,
            });
        }
    };

    const handleSavedAddressChange = (value: string) => {
        setSelectedAddressId(value);
        const address = savedAddresses.find((item) => String(item.id) === value);
        if (address) {
            applySavedAddress(address);
        }
    };

    const handleSaveAddressToggle = (checked: boolean) => {
        setValue("saveAddress", checked, { shouldValidate: false });
        if (checked && !watch("saveAddressLabel")) {
            setValue("saveAddressLabel", tProfile("label_home"), {
                shouldValidate: false,
            });
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
                                        whiteSpace: "nowrap",
                                        // На 320px «Самовывоз» должен помещаться целиком
                                        fontSize: { xs: "0.8rem", sm: "0.875rem" },
                                        letterSpacing: { xs: -0.2, sm: 0 },
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

            {isDelivery && isAuthenticated && addressesLoading && (
                <Stack direction="row" spacing={1.5} alignItems="center">
                    <CircularProgress size={20} />
                    <Typography variant="body2" color="text.secondary">
                        {tCommon("loading")}
                    </Typography>
                </Stack>
            )}

            {isDelivery && isAuthenticated && !addressesLoading && savedAddresses.length > 0 && (
                <FormControl component="fieldset" sx={{ width: "100%" }}>
                    <FormLabel component="legend" sx={{ mb: 1, fontWeight: 600 }}>
                        {tCheckout("select_saved_address")}
                    </FormLabel>
                    <RadioGroup
                        value={selectedAddressId}
                        onChange={(event) => handleSavedAddressChange(event.target.value)}
                    >
                        {savedAddresses.map((address) => (
                            <FormControlLabel
                                key={address.id}
                                value={String(address.id)}
                                control={<Radio size="small" />}
                                label={
                                    <Box>
                                        <Typography variant="body2" fontWeight={700}>
                                            {address.label}
                                        </Typography>
                                        <Typography variant="body2" color="text.secondary">
                                            {formatSavedAddressLine(
                                                address.street,
                                                address.apartment,
                                            )}
                                        </Typography>
                                    </Box>
                                }
                                sx={{
                                    alignItems: "flex-start",
                                    mx: 0,
                                    mb: 0.5,
                                    border: "1px solid",
                                    borderColor: "divider",
                                    borderRadius: 2,
                                    px: 1.5,
                                    py: 1,
                                }}
                            />
                        ))}
                    </RadioGroup>
                </FormControl>
            )}

            {isDelivery && (
                <>
                    <AppInput
                        label={t("address")}
                        {...checkoutFieldProps}
                        sx={checkoutInputRadiusSx}
                        {...register("address", {
                            onChange: () => setSelectedAddressId(""),
                        })}
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
                        InputLabelProps={{
                            shrink: watch("address") ? true : undefined,
                        }}
                    />

                    {isAuthenticated ? (
                        <AppInput
                            label={tCheckout("apartment")}
                            {...checkoutFieldProps}
                            sx={checkoutInputRadiusSx}
                            {...register("apartment", {
                                onChange: () => setSelectedAddressId(""),
                            })}
                            // label не поднимается при setValue из сохранённого
                            // адреса (uncontrolled input) - форсируем shrink
                            InputLabelProps={{
                                shrink: watch("apartment")
                                    ? true
                                    : undefined,
                            }}
                        />
                    ) : null}

                    {isAuthenticated ? (
                        <Stack spacing={1}>
                            <FormControlLabel
                                control={
                                    <Checkbox
                                        checked={Boolean(saveAddress)}
                                        onChange={(event) =>
                                            handleSaveAddressToggle(event.target.checked)
                                        }
                                    />
                                }
                                label={tCheckout("save_address")}
                            />
                            {saveAddress ? (
                                <AppInput
                                    label={tProfile("addresses.labelField")}
                                    {...checkoutFieldProps}
                                    sx={checkoutInputRadiusSx}
                                    {...register("saveAddressLabel")}
                                />
                            ) : null}
                        </Stack>
                    ) : null}
                </>
            )}
        </Paper>
    );
}
