"use client";

import ShoppingBagOutlinedIcon from "@mui/icons-material/ShoppingBagOutlined";
import Badge from "@mui/material/Badge";
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";
import Link from "next/link";

import { useCartStore } from "../model/store";

export function CartButton() {
    const itemCount = useCartStore((state) =>
        state.items.reduce((sum, item) => sum + item.quantity, 0),
    );

    return (
        <Tooltip title="Открыть корзину">
            <IconButton
                color="inherit"
                component={Link}
                href="/cart"
                aria-label="Корзина"
            >
                <Badge
                    badgeContent={itemCount}
                    color="primary"
                    overlap="circular"
                    invisible={itemCount === 0}
                >
                    <ShoppingBagOutlinedIcon />
                </Badge>
            </IconButton>
        </Tooltip>
    );
}
