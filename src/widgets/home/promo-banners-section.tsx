import Box from "@mui/material/Box";
import Container from "@mui/material/Container";
import { unstable_cache } from "next/cache";
import { getLocale, getTranslations } from "next-intl/server";

import { CACHE_TAGS } from "@/lib/cache-tags";
import { getLocalizedField } from "@/lib/i18n-utils";
import { prisma } from "@/lib/prisma";

import {
    BannerCarousel,
    type BannerCarouselItem,
} from "./banner-carousel";

const sectionContainerSx = {
    maxWidth: "lg",
    px: { xs: 2, md: 6 },
} as const;

const getBannersCached = unstable_cache(
    async () =>
        prisma.banner.findMany({
            where: {
                isActive: true,
                OR: [
                    { startsAt: null, endsAt: null },
                    {
                        startsAt: { lte: new Date() },
                        endsAt: { gte: new Date() },
                    },
                ],
            },
            orderBy: { position: "asc" },
            include: { translations: true },
        }),
    ["promo-banners"],
    { revalidate: 3600, tags: [CACHE_TAGS.banners] },
);

/**
 * Промо-баннеры из админки: активные и попадающие в окно дат.
 * Данные готовятся на сервере, карусель (автоплей/точки) - клиентская.
 */
export async function PromoBannersSection({
    nested = false,
}: {
    /** true - без собственного Container (страница уже даёт отступы). */
    nested?: boolean;
}) {
    const locale = await getLocale();
    const t = await getTranslations("home");

    let items: BannerCarouselItem[] = [];
    try {
        const banners = await getBannersCached();
        items = banners.map((b) => ({
            id: b.id,
            image: b.image,
            title: getLocalizedField(b.translations, locale, "title"),
            cta: getLocalizedField(b.translations, locale, "ctaText") || t("bannerCta"),
            href: b.href,
        }));
    } catch (error) {
        // Не роняем главную, но причина должна быть видна в логах (используем warn, чтобы Next.js не перехватывал как фатальную ошибку в dev)
        console.warn("[BANNERS] Failed to load:", error instanceof Error ? error.message : error);
        return null;
    }

    if (items.length === 0) {
        return null;
    }

    if (nested) {
        return (
            <Box sx={{ mt: { xs: 2, md: 3 } }}>
                <BannerCarousel items={items} />
            </Box>
        );
    }

    return (
        <Container sx={{ ...sectionContainerSx, mt: { xs: 2.5, md: 4 } }}>
            <BannerCarousel items={items} />
        </Container>
    );
}
