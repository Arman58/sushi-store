import type { Prisma, PrismaClient } from "@prisma/client";

import { L, type LocalizedText,LToJson } from "./localized-seed";

type DeliveryZoneSeed = {
    name: LocalizedText;
    deliveryPrice: number;
    minOrderAmount: number;
    description: LocalizedText | "";
    requiresManagerApproval: boolean;
    position: number;
};

/** Актуальные зоны доставки East West Delivery (цены в ֏). */
export const deliveryZonesData: DeliveryZoneSeed[] = [
    {
        name: L("Нор Ачин", "Նոր Հաճն", "Nor Hachn"),
        deliveryPrice: 0,
        minOrderAmount: 1500,
        description: "",
        requiresManagerApproval: false,
        position: 0,
    },
    {
        name: L(
            "Нор Гехи (от 700 до 1200 ֏)",
            "Նոր Գեխի (700-ից 1200 ֏)",
            "Nor Geghi (700-1200 ֏)",
        ),
        deliveryPrice: 700,
        minOrderAmount: 1500,
        description: L(
            "Точная стоимость доставки зависит от адреса (от 700 до 1200 ֏)",
            "Առաքման ճշգրիտ արժեքը կախված է հասցեից (700-ից 1200 ֏)",
            "Exact delivery cost depends on address (700-1200 ֏)",
        ),
        requiresManagerApproval: false,
        position: 1,
    },
    {
        name: L("Артамет", "Արտամետ", "Artamet"),
        deliveryPrice: 900,
        minOrderAmount: 1500,
        description: "",
        requiresManagerApproval: false,
        position: 2,
    },
    {
        name: L("Мргашен", "Մրգաշեն", "Mrgashen"),
        deliveryPrice: 1200,
        minOrderAmount: 1500,
        description: "",
        requiresManagerApproval: false,
        position: 3,
    },
    {
        name: L("Лусакерт", "Լուսակերտ", "Lusakert"),
        deliveryPrice: 1300,
        minOrderAmount: 1500,
        description: "",
        requiresManagerApproval: false,
        position: 4,
    },
    {
        name: L("Бюрекаван", "Բյուրեկավան", "Byureghavan"),
        deliveryPrice: 1500,
        minOrderAmount: 1500,
        description: "",
        requiresManagerApproval: false,
        position: 5,
    },
    {
        name: L(
            "Другие города (уточнение по звонку)",
            "Այլ քաղաքներ (ճշտում զանգով)",
            "Other cities (confirm by phone)",
        ),
        deliveryPrice: 0,
        minOrderAmount: 9000,
        description: L(
            "Доставка в другие города уточняется по звонку. Оставьте адрес и телефон, мы свяжемся с вами!",
            "Այլ քաղաքներ առաքումը ճշտվում է զանգով։ Թողեք հասցեն և հեռախոսը, մենք կկապվենք ձեզ հետ։",
            "Delivery to other cities is confirmed by phone. Leave your address and phone, we will contact you!",
        ),
        requiresManagerApproval: true,
        position: 6,
    },
];

/** @deprecated Используйте deliveryZonesData */
export const REAL_ARMENIA_ZONES = deliveryZonesData;

/** @deprecated Используйте deliveryZonesData */
export const DEFAULT_DELIVERY_ZONES = deliveryZonesData;

const ZONE_POSITIONS = deliveryZonesData.map((z) => z.position);

function descriptionToJson(
    description: LocalizedText | "",
): Prisma.InputJsonValue {
    if (description === "" || !description) return {};
    return LToJson(description);
}

/**
 * Синхронизирует справочник зон: деактивирует устаревшие,
 * создаёт отсутствующие и обновляет цены/описание у существующих.
 */
export async function ensureDeliveryZones(client: PrismaClient): Promise<number> {
    await client.deliveryZone.updateMany({
        where: { position: { notIn: [...ZONE_POSITIONS] } },
        data: { isActive: false },
    });

    let created = 0;
    for (const z of deliveryZonesData) {
        const existing = await client.deliveryZone.findFirst({
            where: { position: z.position },
            select: { id: true },
        });

        const data = {
            name: LToJson(z.name),
            deliveryPrice: z.deliveryPrice,
            minOrderAmount: z.minOrderAmount,
            description: descriptionToJson(z.description),
            requiresManagerApproval: z.requiresManagerApproval,
            isActive: true,
            position: z.position,
        };

        if (!existing) {
            await client.deliveryZone.create({ data });
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
