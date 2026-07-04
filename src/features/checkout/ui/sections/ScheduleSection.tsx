"use client";

import BoltRoundedIcon from "@mui/icons-material/BoltRounded";
import ScheduleRoundedIcon from "@mui/icons-material/ScheduleRounded";
import FormHelperText from "@mui/material/FormHelperText";
import MenuItem from "@mui/material/MenuItem";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { useTranslations } from "next-intl";
import { useEffect, useMemo, useSyncExternalStore } from "react";
import { useFormContext } from "react-hook-form";

import type { CheckoutFormValues } from "@/shared/lib/schemas";

import { buildScheduleSlots } from "../../model/schedule-slots";
import { PaymentCard } from "../PaymentCard";
import { checkoutSectionPaperSx } from "../styles";

/** «Когда доставить?» — как можно скорее или предзаказ ко времени. */
export function ScheduleSection() {
    const t = useTranslations("checkout.schedule");
    const {
        setValue,
        watch,
        clearErrors,
        formState: { errors },
    } = useFormContext<CheckoutFormValues>();

    const scheduleMode = watch("scheduleMode");
    const scheduledFor = watch("scheduledFor");

    // Слоты считаем только на клиенте (SSR-безопасно, без setState в эффекте).
    const isClient = useSyncExternalStore(
        () => () => {},
        () => true,
        () => false,
    );
    const slots = useMemo(
        () => (isClient ? buildScheduleSlots() : []),
        [isClient],
    );

    // Выбранный слот устарел (прошло время) — сбрасываем.
    useEffect(() => {
        if (
            scheduledFor &&
            slots.length > 0 &&
            !slots.some((s) => s.value === scheduledFor)
        ) {
            setValue("scheduledFor", null, { shouldValidate: false });
        }
    }, [slots, scheduledFor, setValue]);

    const selectMode = (mode: "asap" | "scheduled") => {
        setValue("scheduleMode", mode, { shouldValidate: false });
        if (mode === "asap") {
            setValue("scheduledFor", null, { shouldValidate: false });
            clearErrors("scheduledFor");
        }
    };

    const errorMsg = errors.scheduledFor?.message;

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

            <Stack
                direction={{ xs: "column", sm: "row" }}
                spacing={1.5}
                sx={{ minWidth: 0 }}
            >
                <PaymentCard
                    selected={scheduleMode !== "scheduled"}
                    onSelect={() => selectMode("asap")}
                    icon={<BoltRoundedIcon fontSize="small" />}
                    label={t("asap")}
                    sublabel={t("asapSublabel")}
                />
                <PaymentCard
                    selected={scheduleMode === "scheduled"}
                    onSelect={() => selectMode("scheduled")}
                    icon={<ScheduleRoundedIcon fontSize="small" />}
                    label={t("scheduled")}
                    sublabel={t("scheduledSublabel")}
                />
            </Stack>

            {scheduleMode === "scheduled" && (
                <div>
                    <TextField
                        select
                        fullWidth
                        size="small"
                        label={t("slotLabel")}
                        value={scheduledFor ?? ""}
                        error={Boolean(errorMsg)}
                        onChange={(e) => {
                            setValue(
                                "scheduledFor",
                                e.target.value || null,
                                { shouldValidate: true },
                            );
                        }}
                        SelectProps={{
                            MenuProps: {
                                PaperProps: { sx: { maxHeight: 320 } },
                            },
                        }}
                    >
                        {slots.length === 0 ? (
                            <MenuItem value="" disabled>
                                {t("noSlots")}
                            </MenuItem>
                        ) : (
                            slots.map((slot) => (
                                <MenuItem key={slot.value} value={slot.value}>
                                    {t(slot.day === "today" ? "today" : "tomorrow", {
                                        time: slot.time,
                                    })}
                                </MenuItem>
                            ))
                        )}
                    </TextField>
                    <FormHelperText error={Boolean(errorMsg)}>
                        {errorMsg ?? t("hint")}
                    </FormHelperText>
                </div>
            )}
        </Paper>
    );
}
