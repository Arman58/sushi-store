import type { PrismaClient } from "@prisma/client";

/** Реальные зоны доставки: Ереван, Котайк и окрестности (цены в ֏). */
export const REAL_ARMENIA_ZONES = [
    // Ереван
    {
        name: "Ереван (в пределах центра)",
        deliveryPrice: 0,
        minOrderAmount: 3000,
        isActive: true,
        position: 0,
    },
    {
        name: "Ереван (отдаленные районы)",
        deliveryPrice: 300,
        minOrderAmount: 3000,
        isActive: true,
        position: 1,
    },

    // Котайк — ближние города (Абовян и окрестности)
    { name: "Абовян", deliveryPrice: 300, minOrderAmount: 3000, isActive: true, position: 2 },
    { name: "Егвард", deliveryPrice: 400, minOrderAmount: 3000, isActive: true, position: 3 },
    { name: "Нор-Хачн", deliveryPrice: 400, minOrderAmount: 3000, isActive: true, position: 4 },
    { name: "Бюрегован", deliveryPrice: 400, minOrderAmount: 3000, isActive: true, position: 5 },
    { name: "Котайк (село)", deliveryPrice: 500, minOrderAmount: 3000, isActive: true, position: 6 },
    { name: "Арзни", deliveryPrice: 500, minOrderAmount: 3000, isActive: true, position: 7 },
    { name: "Ариндж", deliveryPrice: 500, minOrderAmount: 3000, isActive: true, position: 8 },

    // Котайк — дальние города
    { name: "Раздан", deliveryPrice: 800, minOrderAmount: 5000, isActive: true, position: 9 },
    { name: "Чаренцаван", deliveryPrice: 800, minOrderAmount: 5000, isActive: true, position: 10 },
    { name: "Цахкадзор", deliveryPrice: 1000, minOrderAmount: 5000, isActive: true, position: 11 },
    {
        name: "Севан (через Раздан)",
        deliveryPrice: 1200,
        minOrderAmount: 5000,
        isActive: true,
        position: 12,
    },
] as const;

/** @deprecated Используйте REAL_ARMENIA_ZONES */
export const DEFAULT_DELIVERY_ZONES = REAL_ARMENIA_ZONES;

const LEGACY_ZONE_NAMES = ["Ближний район", "Дальний район"] as const;

/**
 * Синхронизирует справочник зон: удаляет устаревшие MVP-зоны,
 * создаёт отсутствующие и обновляет цены/порядок у существующих.
 */
export async function ensureDeliveryZones(client: PrismaClient): Promise<number> {
    await client.deliveryZone.deleteMany({
        where: { name: { in: [...LEGACY_ZONE_NAMES] } },
    });

    let created = 0;
    for (const z of REAL_ARMENIA_ZONES) {
        const existing = await client.deliveryZone.findFirst({
            where: { name: z.name },
            select: { id: true },
        });

        if (!existing) {
            await client.deliveryZone.create({ data: { ...z } });
            created += 1;
            continue;
        }

        await client.deliveryZone.update({
            where: { id: existing.id },
            data: {
                deliveryPrice: z.deliveryPrice,
                minOrderAmount: z.minOrderAmount,
                isActive: z.isActive,
                position: z.position,
            },
        });
    }

    return created;
}
