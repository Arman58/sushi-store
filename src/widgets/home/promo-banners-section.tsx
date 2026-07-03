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
        // Не роняем главную, но причина должна быть видна в логах
        console.error("[BANNERS] Failed to load:", error);
        // В dev показываем причину прямо на странице - никаких тихих исчезновений
        if (process.env.NODE_ENV === "development") {
            return (
                <Container sx={{ ...sectionContainerSx, mt: 2 }}>
                    <Box
                        sx={{
                            p: 2,
                            borderRadius: 2,
                            bgcolor: "rgba(231,76,60,0.1)",
                            border: "1px solid rgba(231,76,60,0.4)",
                            color: "#C0392B",
                            fontSize: 13,
                            fontFamily: "monospace",
                            whiteSpace: "pre-wrap",
                            wordBreak: "break-word",
                        }}
                    >
                        [BANNERS dev-diagnostic]{" "}
                        {error instanceof Error
                            ? error.message
                            : String(error)}
                        {"\n\n"}Частая причина: dev-сервер запущен со старым
                        prisma-клиентом. Перезапустите: Ctrl+C → npm run dev.
                    </Box>
                </Container>
            );
        }
        return null;
    }

    if (items.length === 0) {
        // В dev поясняем, почему пусто (вместо тихого отсутствия секции)
        if (process.env.NODE_ENV === "development") {
            return (
                <Container sx={{ ...sectionContainerSx, mt: 2 }}>
                    <Box
                        sx={{
                            p: 1.5,
                            borderRadius: 2,
                            border: "1px dashed rgba(245,158,11,0.7)",
                            color: "#B45309",
                            fontSize: 13,
                        }}
                    >
                        [BANNERS dev-diagnostic] Запрос выполнен успешно, но
                        активных баннеров нет: проверьте в админке тумблер
                        «Активен» и даты «Показ с/по» (истёкшие скрываются).
                    </Box>
                </Container>
            );
        }
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
