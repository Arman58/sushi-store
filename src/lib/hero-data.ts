import type { DeliveryZone, PromoCode } from "@prisma/client";

import { prisma } from "@/lib/prisma";

export type HeroPromo = Pick<PromoCode, "code" | "discountValue">;

export type HeroPageData = {
    deliveryStat: string;
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

export function formatDeliveryStat(zone: Pick<DeliveryZone, "name" | "deliveryPrice"> | null): string {
    if (!zone) return "Быстрая доставка";
    if (zone.deliveryPrice === 0) return `Бесплатная доставка в ${zone.name}`;
    return `Доставка от ${zone.deliveryPrice.toLocaleString("ru-RU")} ֏`;
}

export async function fetchHeroPageData(): Promise<HeroPageData> {
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

        return {
            deliveryStat: formatDeliveryStat(freeDeliveryZone),
            promo: promoRow
                ? { code: promoRow.code, discountValue: promoRow.discountValue }
                : null,
        };
    } catch (error) {
        console.error("[hero] Database unavailable:", error);
        return {
            deliveryStat: "Быстрая доставка",
            promo: null,
        };
    }
}
