"use client";

import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { useTranslations } from "next-intl";
import {
    type ClipboardEvent,
    type KeyboardEvent,
    useCallback,
    useEffect,
    useRef,
} from "react";

import {
    OTP_CODE_LENGTH,
    OTP_RESEND_AVAILABLE_AT_SECONDS,
} from "@/lib/otp-store";

type OtpCodeInputProps = {
    value: string[];
    onChange: (next: string[]) => void;
    disabled?: boolean;
};

export function OtpCodeInput({ value, onChange, disabled = false }: OtpCodeInputProps) {
    const t = useTranslations("auth.otp");
    const inputRefs = useRef<Array<HTMLInputElement | null>>([]);
    const lastIndex = OTP_CODE_LENGTH - 1;

    const focusIndex = useCallback((index: number) => {
        inputRefs.current[index]?.focus();
        inputRefs.current[index]?.select();
    }, []);

    const updateDigit = (index: number, digit: string) => {
        const next = [...value];
        next[index] = digit;
        onChange(next);
        if (digit && index < lastIndex) {
            focusIndex(index + 1);
        }
    };

    const handleChange = (index: number, raw: string) => {
        const digit = raw.replace(/\D/g, "").slice(-1);
        updateDigit(index, digit);
    };

    const handleKeyDown = (index: number, event: KeyboardEvent<HTMLDivElement>) => {
        if (event.key === "Backspace") {
            if (value[index]) {
                updateDigit(index, "");
                return;
            }
            if (index > 0) {
                updateDigit(index - 1, "");
                focusIndex(index - 1);
            }
            return;
        }

        if (event.key === "ArrowLeft" && index > 0) {
            focusIndex(index - 1);
        }
        if (event.key === "ArrowRight" && index < lastIndex) {
            focusIndex(index + 1);
        }
    };

    const handlePaste = (event: ClipboardEvent<HTMLDivElement>) => {
        event.preventDefault();
        const pasted = event.clipboardData
            .getData("text")
            .replace(/\D/g, "")
            .slice(0, OTP_CODE_LENGTH);
        if (!pasted) return;

        const next = Array.from({ length: OTP_CODE_LENGTH }, () => "");
        for (let i = 0; i < pasted.length; i += 1) {
            next[i] = pasted[i] ?? "";
        }
        onChange(next);
        focusIndex(Math.min(pasted.length, lastIndex));
    };

    useEffect(() => {
        if (!disabled) {
            focusIndex(0);
        }
    }, [disabled, focusIndex]);

    return (
        <Box
            sx={{
                display: "grid",
                gridTemplateColumns: `repeat(${OTP_CODE_LENGTH}, minmax(0, 1fr))`,
                gap: 1,
            }}
            onPaste={handlePaste}
        >
            {value.map((digit, index) => (
                <TextField
                    key={index}
                    inputRef={(el) => {
                        inputRefs.current[index] = el;
                    }}
                    value={digit}
                    disabled={disabled}
                    inputProps={{
                        inputMode: "numeric",
                        pattern: "[0-9]*",
                        maxLength: 1,
                        style: {
                            textAlign: "center",
                            fontSize: 24,
                            fontWeight: 800,
                            padding: "12px 0",
                        },
                        "aria-label": t("digitAria", { n: index + 1 }),
                    }}
                    onChange={(event) => handleChange(index, event.target.value)}
                    onKeyDown={(event) => handleKeyDown(index, event)}
                    onFocus={(event) => event.target.select()}
                />
            ))}
        </Box>
    );
}

export function formatOtpTimer(seconds: number): string {
    const minutes = Math.floor(seconds / 60);
    const remainder = seconds % 60;
    return `${String(minutes).padStart(2, "0")}:${String(remainder).padStart(2, "0")}`;
}

type OtpResendTimerProps = {
    secondsLeft: number;
    onResend: () => void;
    disabled?: boolean;
};

export function OtpResendTimer({
    secondsLeft,
    onResend,
    disabled = false,
}: OtpResendTimerProps) {
    const t = useTranslations("auth");
    const canResend = secondsLeft <= OTP_RESEND_AVAILABLE_AT_SECONDS;
    const resendCooldownLeft = Math.max(0, secondsLeft - OTP_RESEND_AVAILABLE_AT_SECONDS);

    return (
        <Stack spacing={1} sx={{ textAlign: "center" }}>
            {secondsLeft > 0 ? (
                <Typography variant="body2" color="text.secondary">
                    {t("code_timer")} {formatOtpTimer(secondsLeft)}
                </Typography>
            ) : (
                <Typography variant="body2" color="warning.main" fontWeight={600}>
                    {t("code_expired")}
                </Typography>
            )}

            {!canResend ? (
                <Typography variant="body2" color="text.secondary">
                    {t("resend_wait", { seconds: resendCooldownLeft })}
                </Typography>
            ) : (
                <Typography
                    component="button"
                    type="button"
                    variant="body2"
                    onClick={onResend}
                    disabled={disabled}
                    sx={{
                        border: 0,
                        background: "none",
                        p: 0,
                        color: "primary.main",
                        fontWeight: 700,
                        cursor: disabled ? "not-allowed" : "pointer",
                        textDecoration: "underline",
                        opacity: disabled ? 0.6 : 1,
                    }}
                >
                    {t("resend_available")}
                </Typography>
            )}
        </Stack>
    );
}
