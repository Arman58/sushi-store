-- AlterTable: текст CTA-кнопки баннера
ALTER TABLE "Banner" ADD COLUMN "ctaText" JSONB NOT NULL DEFAULT '{}';
