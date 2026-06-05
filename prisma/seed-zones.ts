/**
 * Только зоны доставки — не трогает категории и товары.
 * Запуск: npm run prisma:seed-zones
 */
import { PrismaClient } from "@prisma/client";

import { ensureDeliveryZones } from "./ensure-delivery-zones";

const prisma = new PrismaClient();

async function main() {
    const n = await ensureDeliveryZones(prisma);
    console.log(
        n > 0
            ? `✅ Добавлено зон доставки: ${n}`
            : "✅ Зоны доставки уже есть — изменений не потребовалось.",
    );
}

main()
    .catch((e) => {
        console.error("❌ Ошибка:", e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
