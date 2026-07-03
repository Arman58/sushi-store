-- AlterTable: лимиты количества на заказ
ALTER TABLE "Product" ADD COLUMN "minQty" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "Product" ADD COLUMN "maxQty" INTEGER;
