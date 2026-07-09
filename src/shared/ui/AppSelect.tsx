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
import { forwardRef, useCallback, useState } from "react";

import {
    mergeAppSelectMenuProps,
    useCloseMenuOnExternalScroll,
} from "./select-menu";

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

const defaultSelectSx: SxProps<Theme> = {
    "& .MuiSelect-select": {
        overflow: "hidden",
        textOverflow: "ellipsis",
        whiteSpace: "nowrap",
        py: 1.2,
    },
};

function AppSelectComponent<Value = unknown>(
    {
        label,
        helperText,
        sx,
        selectSx,
        children,
        MenuProps,
        fullWidth = true,
        open: openProp,
        onOpen,
        onClose,
        ...props
    }: AppSelectProps<Value>,
    ref: React.ForwardedRef<HTMLDivElement>,
) {
    const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
    const isControlled = openProp !== undefined;
    const open = isControlled ? Boolean(openProp) : uncontrolledOpen;

    const closeMenu = useCallback(() => {
        if (!isControlled) setUncontrolledOpen(false);
        onClose?.({} as React.SyntheticEvent);
    }, [isControlled, onClose]);

    useCloseMenuOnExternalScroll(open, closeMenu);

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
                onOpen={(event) => {
                    if (!isControlled) setUncontrolledOpen(true);
                    onOpen?.(event);
                }}
                onClose={(event) => {
                    if (!isControlled) setUncontrolledOpen(false);
                    onClose?.(event);
                }}
                MenuProps={mergeAppSelectMenuProps(MenuProps as Partial<MenuProps>)}
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
