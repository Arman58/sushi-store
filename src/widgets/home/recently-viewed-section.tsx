"use client";

import Box from "@mui/material/Box";
import Container from "@mui/material/Container";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useState } from "react";

import type { ConnectableProduct } from "@/entities/product/ui/connected-product-card";
import { useRecentlyViewed } from "@/features/recently-viewed";

import { PopularSection } from "./popular-section";

const sectionContainerSx = {
    maxWidth: "lg",
    px: { xs: 2, md: 6 },
} as const;

/**
 * «Вы недавно смотрели» на главной. Рендерится только при наличии истории;
 * до гидратации/при пустой истории не занимает места (no CLS у остальных секций).
 */
export function RecentlyViewedSection() {
    const t = useTranslations("home");
    const locale = useLocale();
    const { ids, hydrated } = useRecentlyViewed();
    const [products, setProducts] = useState<ConnectableProduct[]>([]);

    const idsKey = ids.join(",");

    useEffect(() => {
        if (!hydrated || ids.length === 0) return;
        const controller = new AbortController();
        void (async () => {
            try {
                const params = new URLSearchParams({ locale, ids: idsKey });
                const res = await fetch(
                    `/api/products/by-ids?${params.toString()}`,
                    { signal: controller.signal },
                );
                if (!res.ok) return;
                const data = (await res.json()) as ConnectableProduct[];
                if (!Array.isArray(data)) return;
                // Сохраняем порядок просмотра (последний - первым)
                const byId = new Map(data.map((p) => [p.id, p]));
                setProducts(
                    ids
                        .map((id) => byId.get(id))
                        .filter((p): p is ConnectableProduct => Boolean(p))
                        .slice(0, 6),
                );
            } catch {
                /* секция просто не показывается */
            }
        })();
        return () => controller.abort();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [hydrated, idsKey, locale]);

    if (products.length === 0) return null;

    return (
        <Container sx={{ ...sectionContainerSx, mt: { xs: 4, md: 6 } }}>
            <Box>
                <PopularSection
                    products={products}
                    title={t("recentlyViewed")}
                    seeAllHref="/menu"
                />
            </Box>
        </Container>
    );
}
