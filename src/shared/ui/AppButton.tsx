"use client";

import Button, { type ButtonProps } from "@mui/material/Button";
import { forwardRef } from "react";

export type AppButtonProps = ButtonProps;

export const AppButton = forwardRef<HTMLButtonElement, AppButtonProps>(
    ({ variant = "contained", color = "primary", ...props }, ref) => {
        return (
            <Button ref={ref} variant={variant} color={color} {...props} />
        );
    },
);
AppButton.displayName = "AppButton";
