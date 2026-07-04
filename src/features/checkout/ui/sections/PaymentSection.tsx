"use client";

import CreditCardOutlinedIcon from "@mui/icons-material/CreditCardOutlined";
import LocalAtmOutlinedIcon from "@mui/icons-material/LocalAtmOutlined";
import NotesIcon from "@mui/icons-material/Notes";
import PhoneOutlinedIcon from "@mui/icons-material/PhoneOutlined";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Chip from "@mui/material/Chip";
import FormControlLabel from "@mui/material/FormControlLabel";
import InputAdornment from "@mui/material/InputAdornment";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Switch from "@mui/material/Switch";
import Typography from "@mui/material/Typography";
import { useTranslations } from "next-intl";
import { useMemo } from "react";
import { useFormContext } from "react-hook-form";

import { formatStorePrice } from "@/shared/lib/format-price";
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
    total: number;
};

export function PaymentSection({
    requiresManagerApproval,
    total,
}: PaymentSectionProps) {
    const t = useTranslations("checkout.payment");
    const { register, setValue, watch } = useFormContext<CheckoutFormValues>();
    const payment = watch("payment");
    const needsChange = watch("needsChange");
    const changeAmount = watch("changeAmount");

    const showChange = payment === "cash" && !requiresManagerApproval;
    const tooLow =
        needsChange && changeAmount != null && changeAmount < total;
    const changeBack =
        changeAmount != null && changeAmount >= total ? changeAmount - total : 0;

    // Быстрые суммы: реальные купюры AMD крупнее суммы заказа.
    const presets = useMemo(() => {
        if (!total || total <= 0) return [];
        const AMD_BANKNOTES = [1000, 2000, 5000, 10000, 20000, 50000, 100000];
        const fromBanknotes = AMD_BANKNOTES.filter((b) => b > total);
        if (fromBanknotes.length > 0) return fromBanknotes.slice(0, 3);
        // Заказ дороже самой крупной купюры — округляем вверх до 10 000.
        const next10k = Math.ceil((total + 1) / 10000) * 10000;
        return [next10k, next10k + 10000];
    }, [total]);

    const selectPayment = (method: "cash" | "card") => {
        setValue("payment", method, { shouldValidate: false });
        if (method === "card") {
            setValue("needsChange", false, { shouldValidate: false });
            setValue("changeAmount", null, { shouldValidate: false });
        }
    };

    const toggleNeedsChange = (checked: boolean) => {
        setValue("needsChange", checked, { shouldValidate: false });
        if (!checked) {
            setValue("changeAmount", null, { shouldValidate: true });
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
                            onSelect={() => selectPayment("cash")}
                            icon={<LocalAtmOutlinedIcon fontSize="small" />}
                            label={t("cash")}
                            sublabel={t("cashSublabel")}
                        />
                        <PaymentCard
                            selected={payment === "card"}
                            onSelect={() => selectPayment("card")}
                            icon={<CreditCardOutlinedIcon fontSize="small" />}
                            label={t("card")}
                            sublabel={t("cardSublabel")}
                        />
                    </Stack>
                </Box>
            )}

            {showChange && (
                <Box
                    sx={{
                        borderRadius: 2,
                        border: "1px solid",
                        borderColor: "divider",
                        p: { xs: 1.5, sm: 2 },
                    }}
                >
                    <FormControlLabel
                        sx={{ m: 0, display: "flex", justifyContent: "space-between", width: "100%" }}
                        labelPlacement="start"
                        control={
                            <Switch
                                checked={needsChange}
                                onChange={(e) =>
                                    toggleNeedsChange(e.target.checked)
                                }
                            />
                        }
                        label={
                            <Typography variant="body2" fontWeight={600}>
                                {t("changeQuestion")}
                            </Typography>
                        }
                    />

                    {!needsChange && total > 0 && (
                        <Typography
                            variant="caption"
                            color="text.secondary"
                            sx={{ display: "block", mt: 0.5 }}
                        >
                            {t("exactAmountHint", {
                                amount: formatStorePrice(total),
                            })}
                        </Typography>
                    )}

                    {needsChange && (
                        <Box sx={{ mt: 1.5 }}>
                            <AppInput
                                type="number"
                                label={t("changeAmountLabel")}
                                value={changeAmount ?? ""}
                                onChange={(e) => {
                                    const raw = e.target.value;
                                    const n = Math.trunc(Number(raw));
                                    setValue(
                                        "changeAmount",
                                        raw === "" || !Number.isFinite(n) || n <= 0
                                            ? null
                                            : n,
                                        { shouldValidate: true },
                                    );
                                }}
                                error={tooLow}
                                helperText={
                                    tooLow
                                        ? t("changeTooLow", {
                                              total: formatStorePrice(total),
                                          })
                                        : changeAmount != null
                                          ? t("changeResult", {
                                                amount: formatStorePrice(changeBack),
                                            })
                                          : undefined
                                }
                                sx={checkoutInputRadiusSx}
                                inputProps={{ inputMode: "numeric", min: 0 }}
                                InputProps={{
                                    endAdornment: (
                                        <InputAdornment position="end">
                                            ֏
                                        </InputAdornment>
                                    ),
                                }}
                                fullWidth
                            />
                            {presets.length > 0 && (
                                <Stack
                                    direction="row"
                                    spacing={1}
                                    sx={{ mt: 1, flexWrap: "wrap", gap: 1 }}
                                >
                                    {presets.map((p) => (
                                        <Chip
                                            key={p}
                                            label={`${formatStorePrice(p)} ֏`}
                                            onClick={() =>
                                                setValue("changeAmount", p, {
                                                    shouldValidate: true,
                                                })
                                            }
                                            color={
                                                changeAmount === p
                                                    ? "primary"
                                                    : "default"
                                            }
                                            variant={
                                                changeAmount === p
                                                    ? "filled"
                                                    : "outlined"
                                            }
                                        />
                                    ))}
                                </Stack>
                            )}
                        </Box>
                    )}
                </Box>
            )}

            <AppInput
                label={t("comment")}
                {...checkoutFieldProps}
                multiline
                minRows={2}
                sx={checkoutInputRadiusSx}
                {...register("comment")}
                // setValue из сохранённого адреса не поднимает label - форсируем
                InputLabelProps={{
                    shrink: watch("comment") ? true : undefined,
                }}
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
