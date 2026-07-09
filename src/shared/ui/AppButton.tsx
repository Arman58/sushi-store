"use client";

import Button, { type ButtonProps } from "@mui/material/Button";
import { forwardRef } from "react";

export type AppButtonProps = ButtonProps & {
    /** Kept for API compat; motion is CSS-only now (better INP than framer springs). */
    disableMotion?: boolean;
};

/**
 * Shared button. Uses CSS :active scale instead of framer-motion so
 * pointer interactions stay under INP budgets (no spring JS on the click stack).
 */
export const AppButton = forwardRef<HTMLButtonElement, AppButtonProps>(
    (
        {
            variant = "contained",
            color = "primary",
            disableMotion = false,
            sx,
            ...props
        },
        ref,
    ) => {
        return (
            <Button
                ref={ref}
                variant={variant}
                color={color}
                {...props}
                sx={[
                    !disableMotion &&
                        !props.disabled && {
                            transition:
                                "background-color 200ms ease, box-shadow 200ms ease, border-color 200ms ease, color 200ms ease, transform 120ms ease",
                            "@media (hover: hover) and (pointer: fine)": {
                                "&:hover": { transform: "scale(1.015)" },
                            },
                            "&:active": { transform: "scale(0.97)" },
                        },
                    ...(Array.isArray(sx) ? sx : sx ? [sx] : []),
                ]}
            />
        );
    },
);
AppButton.displayName = "AppButton";
