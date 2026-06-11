"use client";

import TextField, { type TextFieldProps } from "@mui/material/TextField";
import { forwardRef } from "react";

export type AppInputProps = TextFieldProps;

export const AppInput = forwardRef<HTMLDivElement, AppInputProps>(
    ({ size = "small", sx, ...props }, ref) => {
        return (
            <TextField
                ref={ref}
                size={size}
                variant="outlined"
                sx={{
                    "& .MuiInputBase-input": {
                        overflow: "visible",
                        textOverflow: "unset",
                    },
                    ...sx,
                }}
                {...props}
            />
        );
    },
);
AppInput.displayName = "AppInput";
