import { getLocale, getTranslations } from "next-intl/server";

import { type DeliveryStat,fetchHeroPageData } from "@/lib/hero-data";
import { getOpeningHoursState } from "@/lib/site-config";
import { HeroSection } from "@/widgets/hero/hero-section";

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

export async function HomeHeroSection() {
    const locale = await getLocale();
    const heroData = await fetchHeroPageData(locale);
    const hoursState = getOpeningHoursState();
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
        <HeroSection
            deliveryStat={deliveryStat}
            openingHoursStat={openingHoursStat}
            promo={heroData.promo}
        />
    );
}
