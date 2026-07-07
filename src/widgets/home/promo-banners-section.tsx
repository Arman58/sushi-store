import Box from "@mui/material/Box";
import Container from "@mui/material/Container";
import { getLocale, getTranslations } from "next-intl/server";

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
        const now = new Date();
        const banners = await prisma.banner.findMany({
            where: {
                isActive: true,
                AND: [
                    { OR: [{ startsAt: null }, { startsAt: { lte: now } }] },
                    { OR: [{ endsAt: null }, { endsAt: { gte: now } }] },
                ],
            },
            orderBy: [{ position: "asc" }, { id: "asc" }],
            take: 8,
            select: {
                id: true,
                image: true,
                title: true,
                ctaText: true,
                href: true,
            },
        });
        items = banners.map((b) => ({
            id: b.id,
            image: b.image,
            title: getLocalizedField(b.title, locale),
            cta: getLocalizedField(b.ctaText, locale) || t("bannerCta"),
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
