"use client";

import Box from "@mui/material/Box";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import {
    useCallback,
    useEffect,
    useRef,
    type ClipboardEvent,
    type KeyboardEvent,
} from "react";

type OtpCodeInputProps = {
    value: string[];
    onChange: (next: string[]) => void;
    disabled?: boolean;
};

export function OtpCodeInput({ value, onChange, disabled = false }: OtpCodeInputProps) {
    const inputRefs = useRef<Array<HTMLInputElement | null>>([]);

    const focusIndex = useCallback((index: number) => {
        inputRefs.current[index]?.focus();
        inputRefs.current[index]?.select();
    }, []);

    const updateDigit = (index: number, digit: string) => {
        const next = [...value];
        next[index] = digit;
        onChange(next);
        if (digit && index < 3) {
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
        if (event.key === "ArrowRight" && index < 3) {
            focusIndex(index + 1);
        }
    };

    const handlePaste = (event: ClipboardEvent<HTMLDivElement>) => {
        event.preventDefault();
        const pasted = event.clipboardData
            .getData("text")
            .replace(/\D/g, "")
            .slice(0, 4);
        if (!pasted) return;

        const next = ["", "", "", ""];
        for (let i = 0; i < pasted.length; i += 1) {
            next[i] = pasted[i] ?? "";
        }
        onChange(next);
        focusIndex(Math.min(pasted.length, 3));
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
                gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
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
                        "aria-label": `Digit ${index + 1}`,
                    }}
                    onChange={(event) => handleChange(index, event.target.value)}
                    onKeyDown={(event) => handleKeyDown(index, event)}
                    onFocus={(event) => event.target.select()}
                />
            ))}
        </Box>
    );
}

type OtpResendTimerProps = {
    secondsLeft: number;
    onResend: () => void;
    resendLabel: string;
    timerLabel: string;
    disabled?: boolean;
};

export function OtpResendTimer({
    secondsLeft,
    onResend,
    resendLabel,
    timerLabel,
    disabled = false,
}: OtpResendTimerProps) {
    if (secondsLeft > 0) {
        return (
            <Typography variant="body2" color="text.secondary" sx={{ textAlign: "center" }}>
                {timerLabel.replace("{seconds}", String(secondsLeft))}
            </Typography>
        );
    }

    return (
        <Box sx={{ textAlign: "center" }}>
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
                }}
            >
                {resendLabel}
            </Typography>
        </Box>
    );
}
