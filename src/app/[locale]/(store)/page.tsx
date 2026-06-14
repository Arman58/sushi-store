/**
 * Home page - Server Component.
 * Hero, promo carousel, новинки из Prisma; Hero - данные из БД и site-config.
 */

import Box from "@mui/material/Box";
import Container from "@mui/material/Container";
import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";

import { type DeliveryStat, fetchHeroPageData } from "@/lib/hero-data";
import {
    homeProductInclude,
    mapProductToPopular,
} from "@/lib/home-product-include";
import { prisma } from "@/lib/prisma";
import { buildLocalizedMetadata } from "@/lib/seo/metadata";
import { getOpeningHoursState } from "@/lib/site-config";
import {
    FeaturesBlock,
    HeroSection,
    PopularSection,
    PromoCarousel,
} from "@/widgets/home/lazy-home-widgets";
import { SeoText } from "@/widgets/seo-text";

export const revalidate = 60;

const sectionContainerSx = {
    maxWidth: "lg",
    px: { xs: 2, md: 6 },
} as const;

function formatDeliveryStatLabel(
    stat: DeliveryStat,
    t: (key: string, values?: Record<string, string | number>) => string,
    locale: string,
): string {
    if (stat.kind === "fastDelivery") return t("fastDelivery");
    if (stat.kind === "freeDeliveryIn") {
        return t("freeDeliveryIn", { zone: stat.zone });
    }
    return t("deliveryFrom", {
        price: stat.price.toLocaleString(locale),
    });
}

export async function generateMetadata(): Promise<Metadata> {
    const locale = await getLocale();
    const t = await getTranslations("metadata.home");

    return buildLocalizedMetadata({
        locale,
        href: "/",
        title: t("title"),
        description: t("description"),
        titleAbsolute: true,
    });
}

export default async function HomePage() {
    const locale = await getLocale();

    const [newProductsRaw, heroData] = await Promise.all([
        prisma.product
            .findMany({
                where: { isActive: true },
                include: homeProductInclude,
                take: 6,
                orderBy: { id: "desc" },
            })
            .catch(() => []),
        fetchHeroPageData(locale),
    ]);

    const newItems = newProductsRaw.map((p) => mapProductToPopular(p, locale));
    const hoursState = getOpeningHoursState();
    const t = await getTranslations("home");
    const tStats = await getTranslations("hero.stats");
    const tHours = await getTranslations("common.hours");
    const openingHoursStat = hoursState.isOpen
        ? tHours("openUntil", { time: hoursState.time })
        : tHours("opensAt", { time: hoursState.time });
    const deliveryStat = formatDeliveryStatLabel(
        heroData.deliveryStat,
        tStats,
        locale,
    );

    return (
        <>
            <Container
                maxWidth="lg"
                disableGutters
                sx={{ ...sectionContainerSx, px: { xs: 0, sm: 3, md: 6 } }}
            >
                <HeroSection
                    deliveryStat={deliveryStat}
                    openingHoursStat={openingHoursStat}
                    promo={heroData.promo}
                />
            </Container>

            <Container
                sx={{
                    ...sectionContainerSx,
                    mt: { xs: 3, md: 6 },
                }}
            >
                <PromoCarousel />
            </Container>

            {newItems.length > 0 && (
                <Container
                    sx={{
                        ...sectionContainerSx,
                        mt: { xs: 3, md: 6 },
                    }}
                >
                    <PopularSection
                        products={newItems}
                        prioritizeFirstImage
                        title={t("newArrivals")}
                        badge="new"
                        seeAllHref="/menu"
                        seeAllLabel={t("seeAll")}
                    />
                </Container>
            )}

            <Container
                sx={{
                    ...sectionContainerSx,
                    mt: { xs: 3, md: 6 },
                    pb: { xs: 2, md: 4 },
                }}
            >
                <FeaturesBlock />
            </Container>

            <SeoText />

            <Box sx={{ height: { xs: 32, sm: 48, md: 64 } }} />
        </>
    );
}
