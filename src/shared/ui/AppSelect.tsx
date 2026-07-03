"use client";

import {
    FormControl,
    FormHelperText,
    FormLabel,
    Select,
    type SxProps,
    type Theme,
} from "@mui/material";
import type { MenuProps } from "@mui/material/Menu";
import type { SelectProps } from "@mui/material/Select";
import { forwardRef, useEffect, useState } from "react";

export type AppSelectProps<Value = unknown> = Omit<
    SelectProps<Value>,
    "label" | "sx"
> & {
    label?: string;
    helperText?: string;
    /** Styles applied to the wrapping FormControl. */
    sx?: SxProps<Theme>;
    /** Styles applied to the Select element (merged with ellipsis defaults). */
    selectSx?: SxProps<Theme>;
};

const defaultMenuPaperSx: SxProps<Theme> = {
    maxWidth: 350,
    maxHeight: 250,
    "& .MuiMenuItem-root": {
        whiteSpace: "normal",
        overflowWrap: "break-word",
        py: 1,
        lineHeight: 1.3,
    },
};

const defaultSelectSx: SxProps<Theme> = {
    "& .MuiSelect-select": {
        overflow: "hidden",
        textOverflow: "ellipsis",
        whiteSpace: "nowrap",
        py: 1.2,
    },
};

function mergeMenuProps(menuProps?: Partial<MenuProps>): Partial<MenuProps> {
    const paperProps = menuProps?.PaperProps;
    const overrideSx = paperProps?.sx;

    return {
        // Портал в body (дефолт MUI): с disablePortal меню рендерилось в потоке
        // и «уплывало» от поля при прокрутке страницы (крит-баг справочников)
        ...menuProps,
        PaperProps: {
            ...paperProps,
            sx: [
                defaultMenuPaperSx,
                ...(overrideSx
                    ? Array.isArray(overrideSx)
                        ? overrideSx
                        : [overrideSx]
                    : []),
            ],
        },
    };
}

function AppSelectComponent<Value = unknown>(
    {
        label,
        helperText,
        sx,
        selectSx,
        children,
        MenuProps,
        fullWidth = true,
        ...props
    }: AppSelectProps<Value>,
    ref: React.ForwardedRef<HTMLDivElement>,
) {
    // Страховка от «уплывания» меню: при скролле страницы закрываем список
    // (scroll lock MUI покрывает body, это - на случай прочих прокруток).
    const [open, setOpen] = useState(false);
    useEffect(() => {
        if (!open) return;
        const close = () => setOpen(false);
        window.addEventListener("scroll", close, { passive: true });
        return () => window.removeEventListener("scroll", close);
    }, [open]);

    return (
        <FormControl
            fullWidth={fullWidth}
            error={props.error}
            sx={{ maxWidth: 400, ...sx }}
        >
            {label ? (
                <FormLabel
                    sx={{ mb: 0.5, fontSize: 14, color: "text.secondary" }}
                >
                    {label}
                </FormLabel>
            ) : null}
            <Select<Value>
                ref={ref}
                {...props}
                open={open}
                onOpen={() => setOpen(true)}
                onClose={() => setOpen(false)}
                MenuProps={mergeMenuProps(MenuProps)}
                sx={[
                    defaultSelectSx,
                    ...(selectSx
                        ? Array.isArray(selectSx)
                            ? selectSx
                            : [selectSx]
                        : []),
                ]}
            >
                {children}
            </Select>
            {helperText ? (
                <FormHelperText>{helperText}</FormHelperText>
            ) : null}
        </FormControl>
    );
}

const AppSelectBase = forwardRef(AppSelectComponent);
AppSelectBase.displayName = "AppSelect";

export const AppSelect = AppSelectBase as <Value = unknown>(
    props: AppSelectProps<Value> & React.RefAttributes<HTMLDivElement>,
) => React.ReactElement | null;
