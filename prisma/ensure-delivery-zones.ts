import type { PrismaClient } from "@prisma/client";

/** Актуальные зоны доставки East West Delivery (цены в ֏). */
export const deliveryZonesData = [
    {
        name: "Нор Ачин",
        deliveryPrice: 0,
        minOrderAmount: 1500,
        description: "",
        requiresManagerApproval: false,
        position: 0,
    },
    {
        name: "Нор Гехи (от 700 до 1200 ֏)",
        deliveryPrice: 700,
        minOrderAmount: 1500,
        description:
            "Точная стоимость доставки зависит от адреса (от 700 до 1200 ֏)",
        requiresManagerApproval: false,
        position: 1,
    },
    {
        name: "Артамет",
        deliveryPrice: 900,
        minOrderAmount: 1500,
        description: "",
        requiresManagerApproval: false,
        position: 2,
    },
    {
        name: "Мргашен",
        deliveryPrice: 1200,
        minOrderAmount: 1500,
        description: "",
        requiresManagerApproval: false,
        position: 3,
    },
    {
        name: "Лусакерт",
        deliveryPrice: 1300,
        minOrderAmount: 1500,
        description: "",
        requiresManagerApproval: false,
        position: 4,
    },
    {
        name: "Бюрекаван",
        deliveryPrice: 1500,
        minOrderAmount: 1500,
        description: "",
        requiresManagerApproval: false,
        position: 5,
    },
    {
        name: "Другие города (уточнение по звонку)",
        deliveryPrice: 0,
        minOrderAmount: 9000,
        description:
            "Доставка в другие города уточняется по звонку. Оставьте адрес и телефон, мы свяжемся с вами!",
        requiresManagerApproval: true,
        position: 6,
    },
] as const;

/** @deprecated Используйте deliveryZonesData */
export const REAL_ARMENIA_ZONES = deliveryZonesData;

/** @deprecated Используйте deliveryZonesData */
export const DEFAULT_DELIVERY_ZONES = deliveryZonesData;

const ZONE_NAMES = deliveryZonesData.map((z) => z.name);

/**
 * Синхронизирует справочник зон: деактивирует устаревшие,
 * создаёт отсутствующие и обновляет цены/описание у существующих.
 */
export async function ensureDeliveryZones(client: PrismaClient): Promise<number> {
    await client.deliveryZone.updateMany({
        where: { name: { notIn: [...ZONE_NAMES] } },
        data: { isActive: false },
    });

    let created = 0;
    for (const z of deliveryZonesData) {
        const existing = await client.deliveryZone.findFirst({
            where: { name: z.name },
            select: { id: true },
        });

        const data = {
            deliveryPrice: z.deliveryPrice,
            minOrderAmount: z.minOrderAmount,
            description: z.description,
            requiresManagerApproval: z.requiresManagerApproval,
            isActive: true,
            position: z.position,
        };

        if (!existing) {
            await client.deliveryZone.create({
                data: { name: z.name, ...data },
            });
            created += 1;
            continue;
        }

        await client.deliveryZone.update({
            where: { id: existing.id },
            data,
        });
    }

    return created;
}
