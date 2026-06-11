"use client";

import CreditCardOutlinedIcon from "@mui/icons-material/CreditCardOutlined";
import LocalAtmOutlinedIcon from "@mui/icons-material/LocalAtmOutlined";
import NotesIcon from "@mui/icons-material/Notes";
import PhoneOutlinedIcon from "@mui/icons-material/PhoneOutlined";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import InputAdornment from "@mui/material/InputAdornment";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { useTranslations } from "next-intl";
import { useFormContext } from "react-hook-form";

import type { CheckoutFormValues } from "@/shared/lib/schemas";
import { AppInput } from "@/shared/ui";

import { PaymentCard } from "../PaymentCard";
import {
    checkoutFieldProps,
    checkoutInputRadiusSx,
    checkoutSectionPaperSx,
} from "../styles";

type PaymentSectionProps = {
    requiresManagerApproval: boolean;
};

export function PaymentSection({
    requiresManagerApproval,
}: PaymentSectionProps) {
    const t = useTranslations("checkout.payment");
    const { register, setValue, watch } = useFormContext<CheckoutFormValues>();
    const payment = watch("payment");

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

            {requiresManagerApproval ? (
                <Alert severity="info" icon={<PhoneOutlinedIcon fontSize="inherit" />}>
                    {t("managerApprovalNote")}
                </Alert>
            ) : (
                <Box>
                    <Typography variant="body2" fontWeight={600} sx={{ mb: 1.5 }}>
                        {t("methodLabel")}
                    </Typography>
                    <Stack
                        direction={{ xs: "column", sm: "row" }}
                        spacing={1.5}
                        sx={{ minWidth: 0 }}
                    >
                        <PaymentCard
                            selected={payment === "cash"}
                            onSelect={() =>
                                setValue("payment", "cash", {
                                    shouldValidate: false,
                                })
                            }
                            icon={<LocalAtmOutlinedIcon fontSize="small" />}
                            label={t("cash")}
                            sublabel={t("cashSublabel")}
                        />
                        <PaymentCard
                            selected={payment === "card"}
                            onSelect={() =>
                                setValue("payment", "card", {
                                    shouldValidate: false,
                                })
                            }
                            icon={<CreditCardOutlinedIcon fontSize="small" />}
                            label={t("card")}
                            sublabel={t("cardSublabel")}
                        />
                    </Stack>
                </Box>
            )}

            <AppInput
                label={t("comment")}
                {...checkoutFieldProps}
                multiline
                minRows={2}
                sx={checkoutInputRadiusSx}
                {...register("comment")}
                InputProps={{
                    startAdornment: (
                        <InputAdornment position="start">
                            <NotesIcon
                                sx={{ fontSize: 18, color: "text.secondary" }}
                            />
                        </InputAdornment>
                    ),
                }}
            />
        </Paper>
    );
}
