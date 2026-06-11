"use client";

import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Grid from "@mui/material/Grid";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import { alpha } from "@mui/material/styles";
import Typography from "@mui/material/Typography";
import { useSession } from "next-auth/react";
import { useTranslations } from "next-intl";
import { useMemo } from "react";
import { FormProvider } from "react-hook-form";

import { useCartLineValidation, useCartStore } from "@/features/cart";
import { PageContainer, SectionTitle } from "@/shared/ui";

import { CHECKOUT_MOBILE_SCROLL_PAD } from "../model/constants";
import { useCheckoutForm } from "../model/useCheckoutForm";
import { useDeliveryCalc } from "../model/useDeliveryCalc";
import { CheckoutConsentCaption } from "./CheckoutConsentCaption";
import { ContactSection } from "./sections/ContactSection";
import { DeliverySection } from "./sections/DeliverySection";
import { PaymentSection } from "./sections/PaymentSection";
import { SummarySection } from "./sections/SummarySection";

export function CheckoutWizard() {
    const t = useTranslations("checkout");
    const tCommon = useTranslations("common");
    const { data: session } = useSession();
    const sessionUser = session?.user ?? null;

    const items = useCartStore((s) => s.items);
    const clearCart = useCartStore((s) => s.clear);
    const hasPriceMismatch = useCartStore((s) => s.hasPriceMismatch);
    const isPlacingOrder = useCartStore((s) => s.isPlacingOrder);

    const hasItems = items.length > 0;

    const tCart = useTranslations("cart");

    const {
        cartValidatePending,
        validationUnavailable,
        hasCartLineProblems,
        validSubtotal: cartSubtotal,
    } = useCartLineValidation(items);

    const {
        methods,
        register,
        handleSubmit,
        watch,
        setValue,
        clearErrors,
        checkoutFormRef,
        formFieldFocused,
        apiError,
        isSubmitting: checkoutIsSubmitting,
        isBusySubmit,
        checkoutIncomplete,
        onInvalid,
        submitOrder,
        items: checkoutItems,
        errorMessage,
        missingItemError,
    } = useCheckoutForm({ sessionUser, hasItems });
    const delivery = useDeliveryCalc({
        watch,
        setValue,
        clearErrors,
        cartSubtotal,
    });

    const hardSubmitDisabled =
        !hasItems ||
        checkoutIsSubmitting ||
        isBusySubmit ||
        isPlacingOrder ||
        delivery.deliveryBlocked ||
        cartValidatePending ||
        validationUnavailable ||
        hasCartLineProblems;

    const softMuted = checkoutIncomplete && !hardSubmitDisabled;

    const submitButtonLabel = useMemo(() => {
        if (isBusySubmit) return t("submit.sending");
        if (delivery.requiresManagerApproval) {
            return t("submit.requestApproval");
        }
        return t("submit.placeOrder", {
            total: delivery.grandTotal.toLocaleString("ru-RU"),
        });
    }, [
        isBusySubmit,
        delivery.requiresManagerApproval,
        delivery.grandTotal,
        t,
    ]);

    const submitContext = useMemo(
        () => ({
            items: checkoutItems,
            cartSubtotal,
            grandTotal: delivery.grandTotal,
            promoDiscount: delivery.promoDiscount,
            appliedPromoCode: delivery.appliedPromoCode,
            hasItems,
        }),
        [
            checkoutItems,
            cartSubtotal,
            delivery.grandTotal,
            delivery.promoDiscount,
            delivery.appliedPromoCode,
            hasItems,
        ],
    );

    const submitButtonSx = {
        py: 1.25,
        fontWeight: 700,
        fontVariantNumeric: "tabular-nums" as const,
        bgcolor: "primary.main",
        boxShadow: "none",
        ...(isBusySubmit
            ? { opacity: 0.72, cursor: "not-allowed" }
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
                        boxShadow: (theme: { palette: { primary: { main: string } } }) =>
                            `0 1px 4px ${alpha(theme.palette.primary.main, 0.35)}`,
                    },
                }),
    };

    return (
        <PageContainer>
            <Box
                sx={{
                    minWidth: 0,
                    overflow: "visible",
                    pb: hasItems
                        ? { xs: CHECKOUT_MOBILE_SCROLL_PAD, md: 0 }
                        : 0,
                }}
            >
                <SectionTitle pageTitle>{t("pageTitle")}</SectionTitle>

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
                    <Stack
                        direction={{ xs: "column", sm: "row" }}
                        spacing={1}
                        alignItems={{ xs: "flex-start", sm: "center" }}
                    >
                        <Chip
                            label={t("banner.chip")}
                            color="warning"
                            size="small"
                            sx={{ fontWeight: 700, borderRadius: 999 }}
                        />
                        <Typography
                            variant="body2"
                            color="text.secondary"
                            component="div"
                        >
                            <span>
                                {t("banner.text", {
                                    hours: tCommon("hours.label"),
                                })}
                            </span>
                            <Box
                                component="span"
                                sx={{
                                    display: "block",
                                    mt: 1,
                                    color: "text.primary",
                                }}
                            >
                                {t("pickupLocation", {
                                    address: tCommon("address.pickup"),
                                })}
                            </Box>
                        </Typography>
                    </Stack>
                </Paper>

                {!hasItems && (
                    <Typography color="text.secondary">
                        {t("emptyCart")}
                    </Typography>
                )}

                {errorMessage && !apiError && (
                    <Alert severity="error" sx={{ mb: 3 }}>
                        {errorMessage}
                    </Alert>
                )}

                {missingItemError && (
                    <Alert severity="error" sx={{ mb: 3 }}>
                        {t("missingItem.prefix")}{" "}
                        <strong>
                            {missingItemError ||
                                t("missingItem.fallback")}
                        </strong>
                        {t("missingItem.suffix")}
                    </Alert>
                )}

                {hasPriceMismatch && (
                    <Alert
                        severity="warning"
                        sx={{ mb: 3 }}
                        action={
                            <Button
                                color="inherit"
                                size="small"
                                onClick={clearCart}
                            >
                                {t("priceMismatch.action")}
                            </Button>
                        }
                    >
                        {t("priceMismatch.message")}
                    </Alert>
                )}

                {hasItems && validationUnavailable && (
                    <Alert severity="error" sx={{ mb: 3 }}>
                        {tCart("validation_unavailable")}
                    </Alert>
                )}

                {hasItems && hasCartLineProblems && !validationUnavailable && (
                    <Alert severity="error" sx={{ mb: 3 }}>
                        {t("cartLineProblems")}
                    </Alert>
                )}

                {hasItems &&
                    cartValidatePending &&
                    !hasCartLineProblems &&
                    !validationUnavailable && (
                        <Alert severity="info" sx={{ mb: 3 }}>
                            {t("cartValidating")}
                        </Alert>
                    )}

                {hasItems && (
                    <FormProvider {...methods}>
                        <Box
                            component="form"
                            id="checkout-form"
                            ref={checkoutFormRef}
                            noValidate
                            onSubmit={handleSubmit(
                                (data) =>
                                    submitOrder(data, submitContext),
                                onInvalid,
                            )}
                            sx={{ minWidth: 0, width: "100%" }}
                        >
                            <input
                                type="text"
                                tabIndex={-1}
                                aria-hidden="true"
                                autoComplete="off"
                                readOnly
                                {...register("hp")}
                                style={{
                                    position: "absolute",
                                    left: -9999,
                                    opacity: 0,
                                    height: 0,
                                    overflow: "hidden",
                                    pointerEvents: "none",
                                }}
                            />

                            {apiError && (
                                <Alert severity="error" sx={{ mb: 3 }}>
                                    {t("apiError")}
                                </Alert>
                            )}

                            <Grid container spacing={3} alignItems="stretch">
                                <Grid size={{ xs: 12, md: 7 }}>
                                    <Stack spacing={3} sx={{ minWidth: 0 }}>
                                        <ContactSection
                                            sessionUser={sessionUser}
                                            isDelivery={delivery.isDelivery}
                                        />

                                        <DeliverySection
                                            isDelivery={delivery.isDelivery}
                                            deliveryZones={delivery.deliveryZones}
                                            zonesLoading={delivery.zonesLoading}
                                            zonesError={delivery.zonesError}
                                            selectedZone={delivery.selectedZone}
                                            belowMin={delivery.belowMin}
                                            requiresManagerApproval={
                                                delivery.requiresManagerApproval
                                            }
                                            zoneDescription={
                                                delivery.zoneDescription
                                            }
                                            cartSubtotal={cartSubtotal}
                                            formatZoneDeliveryPrice={
                                                delivery.formatZoneDeliveryPrice
                                            }
                                        />

                                        <PaymentSection
                                            requiresManagerApproval={
                                                delivery.requiresManagerApproval
                                            }
                                        />

                                        <Box
                                            sx={{
                                                display: { xs: "none", md: "block" },
                                            }}
                                        >
                                            <Button
                                                type="submit"
                                                variant="contained"
                                                color="primary"
                                                size="large"
                                                fullWidth
                                                disabled={hardSubmitDisabled}
                                                sx={submitButtonSx}
                                            >
                                                {submitButtonLabel}
                                            </Button>
                                            <CheckoutConsentCaption />
                                        </Box>
                                    </Stack>
                                </Grid>

                                <Grid size={{ xs: 12, md: 5 }}>
                                    <SummarySection
                                        cartSubtotal={cartSubtotal}
                                        showDeliveryBreakdown={
                                            delivery.showDeliveryBreakdown
                                        }
                                        deliverySummaryLabel={
                                            delivery.deliverySummaryLabel
                                        }
                                        requiresManagerApproval={
                                            delivery.requiresManagerApproval
                                        }
                                        deliveryFee={delivery.deliveryFee}
                                        promoDraft={delivery.promoDraft}
                                        setPromoDraft={delivery.setPromoDraft}
                                        promoError={delivery.promoError}
                                        setPromoError={delivery.setPromoError}
                                        promoDiscount={delivery.promoDiscount}
                                        promoApplying={delivery.promoApplying}
                                        appliedPromoCode={delivery.appliedPromoCode}
                                        deliveryBlocked={delivery.deliveryBlocked}
                                        hasItems={hasItems}
                                        onApplyPromo={delivery.handleApplyPromoClick}
                                        onClearPromo={delivery.clearPromo}
                                        grandTotal={delivery.grandTotal}
                                        showDeliveryPendingHint={
                                            delivery.showDeliveryPendingHint
                                        }
                                    />
                                </Grid>
                            </Grid>
                        </Box>

                        <Box
                            sx={{
                                display: {
                                    xs: formFieldFocused ? "none" : "flex",
                                    md: "none",
                                },
                                flexDirection: "column",
                                position: "fixed",
                                left: 0,
                                right: 0,
                                bottom: 0,
                                zIndex: 1250,
                                p: 2,
                                pb: "calc(16px + env(safe-area-inset-bottom))",
                                bgcolor: "background.paper",
                                borderTop: 1,
                                borderColor: "divider",
                                boxShadow: 3,
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
                                    ...submitButtonSx,
                                    py: 1.35,
                                    borderRadius: 2,
                                    boxShadow:
                                        softMuted && !isBusySubmit
                                            ? "none"
                                            : undefined,
                                }}
                            >
                                {submitButtonLabel}
                            </Button>
                            <CheckoutConsentCaption />
                        </Box>
                    </FormProvider>
                )}
            </Box>
        </PageContainer>
    );
}
