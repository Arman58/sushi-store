-- AlterTable: добавляем поле сортировки для групп модификаторов
ALTER TABLE "ModifierGroup" ADD COLUMN "position" INTEGER NOT NULL DEFAULT 0;

-- AlterTable: добавляем поле сортировки для самих модификаторов
ALTER TABLE "Modifier" ADD COLUMN "position" INTEGER NOT NULL DEFAULT 0;

-- Индексы по position не добавляем намеренно: групп/опций на товар мало,
-- сортировка идёт в памяти, индекс был бы оверкиллом.
