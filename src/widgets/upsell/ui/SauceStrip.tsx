"use client";

import AddRoundedIcon from "@mui/icons-material/AddRounded";
import Box from "@mui/material/Box";
import ButtonBase from "@mui/material/ButtonBase";
import Typography from "@mui/material/Typography";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useMemo, useState } from "react";

import { useCartStore } from "@/features/cart";
import type { CartItem } from "@/features/cart/model/types";
import type { StorefrontProduct } from "@/lib/i18n-utils";
import { formatStorePrice } from "@/shared/lib/format-price";
import { getProductCoverUrl } from "@/shared/lib/product-cover";
import { tokens } from "@/shared/ui/theme";

type Sauce = Pick<
    StorefrontProduct,
    "id" | "name" | "price" | "images" | "mainImage"
>;

type Props = {
    cartItems: CartItem[];
};

/**
 * Компактная строка «часто берут к заказу»: соусы категории `sauces`
 * мелкими чипами с быстрым добавлением. Как в топ-маркетплейсах — ненавязчиво,
 * mobile-first (горизонтальный скролл). Скрывается, если соусов нет.
 */
export function SauceStrip({ cartItems }: Props) {
    const locale = useLocale();
    const t = useTranslations("cart");
    const addItem = useCartStore((s) => s.addItem);
    const [sauces, setSauces] = useState<Sauce[]>([]);

    const excludeKey = useMemo(
        () =>
            [...new Set(cartItems.map((i) => i.productId))]
                .sort((a, b) => a - b)
                .join(","),
        [cartItems],
    );

    useEffect(() => {
        const controller = new AbortController();
        void (async () => {
            try {
                const params = new URLSearchParams({ locale, type: "sauces" });
                if (excludeKey) params.set("exclude", excludeKey);
                const res = await fetch(`/api/upsell?${params.toString()}`, {
                    signal: controller.signal,
                });
                if (!res.ok) {
                    setSauces([]);
                    return;
                }
                const data = (await res.json()) as Sauce[];
                setSauces(Array.isArray(data) ? data : []);
            } catch (error) {
                if (error instanceof DOMException && error.name === "AbortError") {
                    return;
                }
                setSauces([]);
            }
        })();
        return () => controller.abort();
    }, [excludeKey, locale]);

    if (sauces.length === 0) return null;

    const add = (sauce: Sauce) => {
        addItem({
            productId: sauce.id,
            name: sauce.name,
            basePrice: sauce.price,
            selectedModifiers: [],
            calculatedItemPrice: sauce.price,
            image:
                getProductCoverUrl({
                    images: sauce.images,
                    mainImage: sauce.mainImage,
                }) ?? undefined,
        });
    };

    return (
        <Box>
            <Typography
                variant="overline"
                sx={{
                    display: "block",
                    mb: 1,
                    letterSpacing: "0.08em",
                    color: tokens.textMuted,
                }}
            >
                {t("addonsTitle")}
            </Typography>
            <Box
                sx={{
                    display: "flex",
                    gap: 1,
                    overflowX: "auto",
                    pb: 0.5,
                    mx: { xs: -0.5, sm: 0 },
                    px: { xs: 0.5, sm: 0 },
                    scrollbarWidth: "none",
                    "&::-webkit-scrollbar": { display: "none" },
                }}
            >
                {sauces.map((sauce) => (
                    <ButtonBase
                        key={sauce.id}
                        onClick={() => add(sauce)}
                        aria-label={`${sauce.name} +${formatStorePrice(sauce.price)} ֏`}
                        sx={{
                            flexShrink: 0,
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 0.75,
                            pl: 1.5,
                            pr: 0.75,
                            py: 0.6,
                            borderRadius: 999,
                            border: "1px solid",
                            borderColor: "divider",
                            bgcolor: tokens.surfaceHi,
                            transition: "border-color 0.15s, background-color 0.15s",
                            "&:hover": { borderColor: tokens.brand },
                            "&:active": { transform: "scale(0.97)" },
                        }}
                    >
                        <Typography
                            component="span"
                            sx={{
                                fontSize: 13,
                                fontWeight: 600,
                                color: "text.primary",
                                whiteSpace: "nowrap",
                                maxWidth: 140,
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                            }}
                        >
                            {sauce.name}
                        </Typography>
                        <Typography
                            component="span"
                            sx={{
                                fontSize: 12,
                                fontWeight: 700,
                                color: tokens.textMuted,
                                whiteSpace: "nowrap",
                                fontVariantNumeric: "tabular-nums",
                            }}
                        >
                            +{formatStorePrice(sauce.price)} ֏
                        </Typography>
                        <Box
                            component="span"
                            sx={{
                                display: "inline-flex",
                                alignItems: "center",
                                justifyContent: "center",
                                width: 22,
                                height: 22,
                                borderRadius: "50%",
                                bgcolor: tokens.brandDim,
                                color: tokens.brand,
                                flexShrink: 0,
                            }}
                        >
                            <AddRoundedIcon sx={{ fontSize: 16 }} />
                        </Box>
                    </ButtonBase>
                ))}
            </Box>
        </Box>
    );
}
