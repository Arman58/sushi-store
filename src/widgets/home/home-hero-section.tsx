import { getLocale, getTranslations } from "next-intl/server";
import { Suspense } from "react";

import { type DeliveryStat, fetchHeroPageData } from "@/lib/hero-data";
import { getOpeningHoursState } from "@/lib/site-config";
import { HeroMediaStatic } from "@/widgets/hero/hero-media-static";
import { HeroSectionStatic } from "@/widgets/hero/hero-section-static";

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

/** Sized placeholder — avoids CLS when Suspense resolves to real copy. */
function HeroStatFallback({ minWidth }: { minWidth: number }) {
    return (
        <span
            aria-hidden
            style={{
                display: "inline-block",
                minWidth,
                height: 13,
                verticalAlign: "middle",
            }}
        />
    );
}

async function DeliveryStatText() {
    const locale = await getLocale();
    const [heroData, tStats] = await Promise.all([
        fetchHeroPageData(locale),
        getTranslations("hero.stats"),
    ]);
    return formatDeliveryStatLabel(heroData.deliveryStat, tStats, locale);
}

async function HoursStatText() {
    const tHours = await getTranslations("common.hours");
    const hoursState = getOpeningHoursState();
    return hoursState.isOpen
        ? tHours("openUntil", { time: hoursState.time })
        : tHours("opensAt", { time: hoursState.time });
}

/**
 * Hero shell with LCP image in the initial HTML (not gated on Prisma).
 * Stats stream in with sized fallbacks so layout does not jump (CLS).
 */
export async function HomeHeroSection() {
    const t = await getTranslations("hero");

    return (
        <HeroSectionStatic
            fastDeliveryLabel={t("stats.fastDelivery")}
            titleLine1={t("titleLine1")}
            titleLine2={t("titleLine2")}
            titleLine3={t("titleLine3")}
            subtitle={t("subtitle")}
            orderNowLabel={t("orderNow")}
            deliveryStat={
                <Suspense fallback={<HeroStatFallback minWidth={160} />}>
                    <DeliveryStatText />
                </Suspense>
            }
            openingHoursStat={
                <Suspense fallback={<HeroStatFallback minWidth={120} />}>
                    <HoursStatText />
                </Suspense>
            }
            media={<HeroMediaStatic />}
        />
    );
}
