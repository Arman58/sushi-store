"use client";

import { Box, Chip, Switch } from "@mui/material";
import { useTranslations } from "next-intl";

import type { ProductRow } from "./product-row-types";

export function ShelfToggle(props: {
    product: ProductRow;
    disabled: boolean;
    onChange: (nextActive: boolean) => void;
}) {
    const { product, disabled, onChange } = props;
    const tCommon = useTranslations("admin.common");

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
                    label={tCommon("removed")}
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
                    "aria-label": product.isActive
                        ? tCommon("hideFromShelf")
                        : tCommon("showOnShelf"),
                }}
            />
        </Box>
    );
}
