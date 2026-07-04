-- AlterTable: язык клиента на момент оформления (локализация push и т.п.)
ALTER TABLE "Order" ADD COLUMN "locale" TEXT NOT NULL DEFAULT 'hy';
