"use client";

import StarRoundedIcon from "@mui/icons-material/StarRounded";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useState } from "react";

import { Link } from "@/i18n/server";
import { tokens } from "@/shared/ui/theme";

type RateableProduct = { id: number; slug: string; name: string };

/**
 * После доставки (DONE) предлагает оценить блюда заказа.
 * Ссылки ведут на страницу товара к секции отзывов.
 */
export function RateOrderItems({ productIds }: { productIds: number[] }) {
    const t = useTranslations("order");
    const locale = useLocale();
    const [products, setProducts] = useState<RateableProduct[]>([]);

    const idsKey = [...new Set(productIds)].join(",");

    useEffect(() => {
        if (!idsKey) return;
        const controller = new AbortController();
        void (async () => {
            try {
                const res = await fetch(
                    `/api/products/by-ids?ids=${idsKey}&locale=${locale}`,
                    { signal: controller.signal },
                );
                if (!res.ok) return;
                const data = (await res.json()) as RateableProduct[];
                if (Array.isArray(data)) setProducts(data.slice(0, 5));
            } catch {
                /* блок просто не показывается */
            }
        })();
        return () => controller.abort();
    }, [idsKey, locale]);

    if (products.length === 0) return null;

    return (
        <Box
            sx={{
                p: 2,
                borderRadius: 2.5,
                bgcolor: tokens.brandDim,
                border: `1px solid ${tokens.brandGlow}`,
            }}
        >
            <Stack direction="row" alignItems="center" spacing={0.75} sx={{ mb: 1 }}>
                <StarRoundedIcon sx={{ color: "#FFB800", fontSize: 22 }} />
                <Typography fontWeight={800} sx={{ fontSize: "0.95rem" }}>
                    {t("rate.title")}
                </Typography>
            </Stack>
            <Typography
                variant="body2"
                sx={{ color: tokens.textSecondary, mb: 1.5 }}
            >
                {t("rate.subtitle")}
            </Typography>
            <Stack direction="row" sx={{ flexWrap: "wrap", gap: 1 }}>
                {products.map((p) => (
                    <Button
                        key={p.id}
                        component={Link}
                        href={`/menu/${p.slug}#reviews`}
                        size="small"
                        variant="outlined"
                        startIcon={<StarRoundedIcon sx={{ fontSize: 16 }} />}
                        sx={{
                            borderRadius: 999,
                            fontWeight: 700,
                            fontSize: 12,
                            bgcolor: "#FFFFFF",
                            maxWidth: "100%",
                        }}
                    >
                        <Box
                            component="span"
                            sx={{
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                            }}
                        >
                            {p.name}
                        </Box>
                    </Button>
                ))}
            </Stack>
        </Box>
    );
}
