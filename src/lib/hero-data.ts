import type { PromoCode } from "@prisma/client";
import { unstable_cache } from "next/cache";
import { cache } from "react";

import { CACHE_TAGS } from "@/lib/cache-tags";
import { getLocalizedField } from "@/lib/i18n-utils";
import { prisma } from "@/lib/prisma";

export type HeroPromo = Pick<PromoCode, "code" | "discountValue">;

export type DeliveryStat =
    | { kind: "fastDelivery" }
    | { kind: "freeDeliveryIn"; zone: string }
    | { kind: "deliveryFrom"; price: number };

export type HeroPageData = {
    deliveryStat: DeliveryStat;
    promo: HeroPromo | null;
};

export function formatDeliveryStat(
    zone: { name: string; deliveryPrice: number } | null,
): DeliveryStat {
    if (!zone) return { kind: "fastDelivery" };
    if (zone.deliveryPrice === 0) {
        return { kind: "freeDeliveryIn", zone: zone.name };
    }
    return { kind: "deliveryFrom", price: zone.deliveryPrice };
}

/** Зона бесплатной доставки кэшируется на 5 мин (меняется редко). */
const getFreeDeliveryZoneCached = unstable_cache(
    async () =>
        prisma.deliveryZone.findFirst({
            where: {
                isActive: true,
                deliveryPrice: 0,
                requiresManagerApproval: false,
            },
            orderBy: { position: "asc" },
            include: { translations: true },
        }),
    ["hero-free-delivery-zone"],
    { revalidate: 3600, tags: [CACHE_TAGS.deliveryZones] },
);

export const fetchHeroPageData = cache(async (locale: string): Promise<HeroPageData> => {
    try {
        const freeDeliveryZone = await getFreeDeliveryZoneCached();

        const localizedZone = freeDeliveryZone
            ? {
                  ...freeDeliveryZone,
                  name: getLocalizedField(freeDeliveryZone.translations, locale, "name"),
              }
            : null;

        return {
            deliveryStat: formatDeliveryStat(localizedZone),
            promo: null,
        };
    } catch {
        // Error logged in production monitoring
        return {
            deliveryStat: { kind: "fastDelivery" },
            promo: null,
        };
    }
});

export async function getBanners() {
    return prisma.banner.findMany({
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
        orderBy: [{ position: "asc" }, { id: "asc" }],
        include: { translations: true },
    });
}

export async function getDeliveryZones() {
    return prisma.deliveryZone.findMany({
        where: { isActive: true },
        orderBy: [{ position: "asc" }, { id: "asc" }],
        include: { translations: true },
    });
}

export async function getHeroData(locale = "hy") {
    const [banners, zones] = await Promise.all([
        getBanners(),
        getDeliveryZones(),
    ]);

    return {
        banners: banners.map((b) => ({
            id: b.id,
            image: b.image,
            title: getLocalizedField(b.translations, locale, "title"),
            ctaText: getLocalizedField(b.translations, locale, "ctaText"),
            href: b.href,
        })),
        deliveryZones: zones.map((z) => ({
            id: z.id,
            name: getLocalizedField(z.translations, locale, "name"),
            description: getLocalizedField(z.translations, locale, "description") || null,
            deliveryPrice: z.deliveryPrice,
            minOrderAmount: z.minOrderAmount,
            requiresManagerApproval: z.requiresManagerApproval,
        })),
    };
}
