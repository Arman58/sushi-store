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

type PromoAvailability = Pick<
    PromoCode,
    "isActive" | "expiresAt" | "maxUsages" | "timesUsed"
>;

function isPromoAvailable(promo: PromoAvailability, now: Date): boolean {
    if (!promo.isActive) return false;
    if (promo.expiresAt && promo.expiresAt.getTime() < now.getTime()) return false;
    if (promo.maxUsages != null && promo.maxUsages > 0 && promo.timesUsed >= promo.maxUsages) {
        return false;
    }
    return true;
}

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
    const now = new Date();

    try {
        const [freeDeliveryZone, percentagePromos] = await Promise.all([
            prisma.deliveryZone.findFirst({
                where: {
                    isActive: true,
                    deliveryPrice: 0,
                    requiresManagerApproval: false,
                },
                orderBy: { position: "asc" },
                select: { name: true, deliveryPrice: true },
            }),
            prisma.promoCode.findMany({
                where: {
                    isActive: true,
                    discountType: "PERCENTAGE",
                    OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
                },
                orderBy: { id: "desc" },
                take: 5,
                select: {
                    code: true,
                    discountValue: true,
                    maxUsages: true,
                    timesUsed: true,
                    expiresAt: true,
                    isActive: true,
                },
            }),
        ]);

        const promoRow = percentagePromos.find((p) => isPromoAvailable(p, now)) ?? null;

        const localizedZone = freeDeliveryZone
            ? {
                  ...freeDeliveryZone,
                  name: getLocalizedField(freeDeliveryZone.name, locale),
              }
            : null;

        return {
            deliveryStat: formatDeliveryStat(localizedZone),
            promo: promoRow
                ? { code: promoRow.code, discountValue: promoRow.discountValue }
                : null,
        };
    } catch {
        // Error logged in production monitoring
        return {
            deliveryStat: { kind: "fastDelivery" },
            promo: null,
        };
    }
}
