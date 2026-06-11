"use client";

import ShoppingBagOutlinedIcon from "@mui/icons-material/ShoppingBagOutlined";
import Badge from "@mui/material/Badge";
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";
import { useTranslations } from "next-intl";

import { Link } from "@/i18n/server";

import { useCartStore } from "../model/store";

export function CartButton() {
    const t = useTranslations("common");
    const tNav = useTranslations("nav");
    const itemCount = useCartStore((state) =>
        state.items.reduce((sum, item) => sum + item.quantity, 0),
    );

    return (
        <Tooltip title={t("aria.openCart")}>
            <IconButton
                color="inherit"
                component={Link}
                href="/cart"
                aria-label={tNav("cart")}
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
