import type { PromoCode } from "@prisma/client";

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

export async function fetchHeroPageData(locale: string): Promise<HeroPageData> {
    try {
        const freeDeliveryZone = await prisma.deliveryZone.findFirst({
            where: {
                isActive: true,
                deliveryPrice: 0,
                requiresManagerApproval: false,
            },
            orderBy: { position: "asc" },
            select: { name: true, deliveryPrice: true },
        });

        const localizedZone = freeDeliveryZone
            ? {
                  ...freeDeliveryZone,
                  name: getLocalizedField(freeDeliveryZone.name, locale),
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
}
