-- AlterTable: стоп-лист (закончилось сегодня)
ALTER TABLE "Product" ADD COLUMN "isAvailable" BOOLEAN NOT NULL DEFAULT true;
