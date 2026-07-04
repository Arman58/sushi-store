"use client";

import { Box, Chip, Switch } from "@mui/material";

import type { ProductRow } from "./product-row-types";

export function ShelfToggle(props: {
    product: ProductRow;
    disabled: boolean;
    onChange: (nextActive: boolean) => void;
}) {
    const { product, disabled, onChange } = props;
    return (
        <Box
            sx={{
                display: "flex",
                alignItems: "center",
                gap: 1,
                justifyContent: "flex-end",
            }}
        >
            {!product.isActive ? (
                <Chip
                    label="Снято"
                    size="small"
                    color="default"
                    variant="outlined"
                    sx={{ height: 20, fontSize: "11px" }}
                />
            ) : null}
            <Switch
                checked={product.isActive}
                onChange={(e) => onChange(e.target.checked)}
                disabled={disabled}
                size="small"
                inputProps={{
                    "aria-label": product.isActive ? "На витрине, выключить" : "Показать на витрине",
                }}
            />
        </Box>
    );
}
