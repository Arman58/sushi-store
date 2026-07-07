"use client";

import ArrowDropDownIcon from "@mui/icons-material/ArrowDropDown";
import CloseIcon from "@mui/icons-material/Close";
import Box from "@mui/material/Box";
import Dialog from "@mui/material/Dialog";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import FormControl from "@mui/material/FormControl";
import FormControlLabel from "@mui/material/FormControlLabel";
import FormHelperText from "@mui/material/FormHelperText";
import FormLabel from "@mui/material/FormLabel";
import IconButton from "@mui/material/IconButton";
import MenuItem from "@mui/material/MenuItem";
import Radio from "@mui/material/Radio";
import RadioGroup from "@mui/material/RadioGroup";
import Stack from "@mui/material/Stack";
import { useTheme } from "@mui/material/styles";
import Typography from "@mui/material/Typography";
import useMediaQuery from "@mui/material/useMediaQuery";
import { useState } from "react";

import { deliveryZoneSelectMenuProps } from "@/features/checkout/model/constants";
import type { DeliveryZoneOption } from "@/features/checkout/model/types";
import { AppSelect } from "@/shared/ui";

import { checkoutInputRadiusSx } from "./styles";

type DeliveryZoneSelectProps = {
    label: string;
    required?: boolean;
    value: number | undefined;
    onChange: (zoneId: number | undefined) => void;
    zones: DeliveryZoneOption[];
    selectZonePlaceholder: string;
    zoneOptionLabel: (zone: DeliveryZoneOption) => string;
    helperText?: string;
    error?: boolean;
    dialogTitle: string;
};

export function DeliveryZoneSelect({
    label,
    required,
    value,
    onChange,
    zones,
    selectZonePlaceholder,
    zoneOptionLabel,
    helperText,
    error,
    dialogTitle,
}: DeliveryZoneSelectProps) {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
    const [sheetOpen, setSheetOpen] = useState(false);

    const selectedZone = zones.find((z) => z.id === value);
    const displayValue = selectedZone
        ? zoneOptionLabel(selectedZone)
        : selectZonePlaceholder;

    if (!isMobile) {
        return (
            <AppSelect
                label={label}
                size="small"
                required={required}
                error={error}
                helperText={helperText}
                value={value === undefined || value === null ? "" : value}
                onChange={(e) => {
                    const raw = e.target.value as unknown;
                    onChange(
                        raw === "" || raw === undefined ? undefined : Number(raw),
                    );
                }}
                MenuProps={deliveryZoneSelectMenuProps}
                sx={checkoutInputRadiusSx}
            >
                <MenuItem value="" disabled>
                    <em>{selectZonePlaceholder}</em>
                </MenuItem>
                {zones.map((zone) => (
                    <MenuItem key={zone.id} value={zone.id}>
                        {zoneOptionLabel(zone)}
                    </MenuItem>
                ))}
            </AppSelect>
        );
    }

    return (
        <>
            <FormControl
                fullWidth
                error={error}
                required={required}
                sx={{ maxWidth: 400, ...checkoutInputRadiusSx }}
            >
                {label ? (
                    <FormLabel
                        sx={{ mb: 0.5, fontSize: 14, color: "text.secondary" }}
                    >
                        {label}
                    </FormLabel>
                ) : null}
                <Box
                    component="button"
                    type="button"
                    onClick={() => setSheetOpen(true)}
                    aria-haspopup="dialog"
                    aria-expanded={sheetOpen}
                    aria-label={label}
                    sx={{
                        width: "100%",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: 1,
                        minHeight: 40,
                        px: 1.5,
                        py: 1.2,
                        textAlign: "left",
                        cursor: "pointer",
                        border: "1px solid",
                        borderColor: error ? "error.main" : "divider",
                        borderRadius: 2,
                        bgcolor: "background.paper",
                        color: selectedZone ? "text.primary" : "text.secondary",
                        font: "inherit",
                        fontSize: 14,
                        "&:focus-visible": {
                            outline: "2px solid",
                            outlineColor: "primary.main",
                            outlineOffset: 2,
                        },
                    }}
                >
                    <Typography
                        variant="body2"
                        sx={{
                            flex: 1,
                            minWidth: 0,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                        }}
                    >
                        {displayValue}
                    </Typography>
                    <ArrowDropDownIcon
                        fontSize="small"
                        sx={{ flexShrink: 0, color: "text.secondary" }}
                    />
                </Box>
                {helperText ? (
                    <FormHelperText>{helperText}</FormHelperText>
                ) : null}
            </FormControl>

            <Dialog
                open={sheetOpen}
                onClose={() => setSheetOpen(false)}
                fullWidth
                fullScreen
                slotProps={{
                    paper: {
                        sx: {
                            display: "flex",
                            flexDirection: "column",
                            maxHeight: "100dvh",
                        },
                    },
                }}
            >
                <DialogTitle
                    sx={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: 1,
                        flexShrink: 0,
                    }}
                >
                    <Typography component="span" variant="subtitle1" fontWeight={700}>
                        {dialogTitle}
                    </Typography>
                    <IconButton
                        aria-label="Close"
                        onClick={() => setSheetOpen(false)}
                        edge="end"
                    >
                        <CloseIcon />
                    </IconButton>
                </DialogTitle>
                <DialogContent
                    dividers
                    sx={{
                        flex: 1,
                        minHeight: 0,
                        overflowY: "auto",
                        WebkitOverflowScrolling: "touch",
                        px: 2,
                        py: 1,
                    }}
                >
                    <RadioGroup
                        value={value ?? ""}
                        onChange={(e) => {
                            const raw = e.target.value;
                            const parsed = Number(raw);
                            onChange(
                                raw === "" || !Number.isFinite(parsed)
                                    ? undefined
                                    : parsed,
                            );
                            setSheetOpen(false);
                        }}
                    >
                        <Stack spacing={0} divider={null}>
                            {zones.map((zone) => (
                                <FormControlLabel
                                    key={zone.id}
                                    value={zone.id}
                                    control={<Radio sx={{ mt: 0.25 }} />}
                                    label={
                                        <Typography
                                            variant="body2"
                                            sx={{
                                                whiteSpace: "normal",
                                                lineHeight: 1.4,
                                                py: 0.75,
                                            }}
                                        >
                                            {zoneOptionLabel(zone)}
                                        </Typography>
                                    }
                                    sx={{
                                        alignItems: "flex-start",
                                        mx: 0,
                                        width: "100%",
                                        borderBottom: "1px solid",
                                        borderColor: "divider",
                                        py: 0.5,
                                    }}
                                />
                            ))}
                        </Stack>
                    </RadioGroup>
                </DialogContent>
            </Dialog>
        </>
    );
}
