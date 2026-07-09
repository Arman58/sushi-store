-- AlterTable
ALTER TABLE "Banner" DROP COLUMN "ctaText",
DROP COLUMN "title";

-- AlterTable
ALTER TABLE "Category" DROP COLUMN "name";

-- AlterTable
ALTER TABLE "DeliveryZone" DROP COLUMN "description",
DROP COLUMN "name";

-- AlterTable
ALTER TABLE "Modifier" DROP COLUMN "name";

-- AlterTable
ALTER TABLE "ModifierGroup" DROP COLUMN "name";

-- AlterTable
ALTER TABLE "Product" DROP COLUMN "composition",
DROP COLUMN "description",
DROP COLUMN "name";

-- CreateTable
CREATE TABLE "CategoryTranslation" (
    "id" SERIAL NOT NULL,
    "categoryId" INTEGER NOT NULL,
    "locale" VARCHAR(2) NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "CategoryTranslation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductTranslation" (
    "id" SERIAL NOT NULL,
    "productId" INTEGER NOT NULL,
    "locale" VARCHAR(2) NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "composition" TEXT,

    CONSTRAINT "ProductTranslation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BannerTranslation" (
    "id" SERIAL NOT NULL,
    "bannerId" INTEGER NOT NULL,
    "locale" VARCHAR(2) NOT NULL,
    "title" TEXT NOT NULL,
    "ctaText" TEXT,

    CONSTRAINT "BannerTranslation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ModifierGroupTranslation" (
    "id" SERIAL NOT NULL,
    "modifierGroupId" INTEGER NOT NULL,
    "locale" VARCHAR(2) NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "ModifierGroupTranslation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ModifierTranslation" (
    "id" SERIAL NOT NULL,
    "modifierId" INTEGER NOT NULL,
    "locale" VARCHAR(2) NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "ModifierTranslation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DeliveryZoneTranslation" (
    "id" SERIAL NOT NULL,
    "deliveryZoneId" INTEGER NOT NULL,
    "locale" VARCHAR(2) NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,

    CONSTRAINT "DeliveryZoneTranslation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CategoryTranslation_categoryId_locale_key" ON "CategoryTranslation"("categoryId", "locale");

-- CreateIndex
CREATE UNIQUE INDEX "ProductTranslation_productId_locale_key" ON "ProductTranslation"("productId", "locale");

-- CreateIndex
CREATE UNIQUE INDEX "BannerTranslation_bannerId_locale_key" ON "BannerTranslation"("bannerId", "locale");

-- CreateIndex
CREATE UNIQUE INDEX "ModifierGroupTranslation_modifierGroupId_locale_key" ON "ModifierGroupTranslation"("modifierGroupId", "locale");

-- CreateIndex
CREATE UNIQUE INDEX "ModifierTranslation_modifierId_locale_key" ON "ModifierTranslation"("modifierId", "locale");

-- CreateIndex
CREATE UNIQUE INDEX "DeliveryZoneTranslation_deliveryZoneId_locale_key" ON "DeliveryZoneTranslation"("deliveryZoneId", "locale");

-- AddForeignKey
ALTER TABLE "CategoryTranslation" ADD CONSTRAINT "CategoryTranslation_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductTranslation" ADD CONSTRAINT "ProductTranslation_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BannerTranslation" ADD CONSTRAINT "BannerTranslation_bannerId_fkey" FOREIGN KEY ("bannerId") REFERENCES "Banner"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ModifierGroupTranslation" ADD CONSTRAINT "ModifierGroupTranslation_modifierGroupId_fkey" FOREIGN KEY ("modifierGroupId") REFERENCES "ModifierGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ModifierTranslation" ADD CONSTRAINT "ModifierTranslation_modifierId_fkey" FOREIGN KEY ("modifierId") REFERENCES "Modifier"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeliveryZoneTranslation" ADD CONSTRAINT "DeliveryZoneTranslation_deliveryZoneId_fkey" FOREIGN KEY ("deliveryZoneId") REFERENCES "DeliveryZone"("id") ON DELETE CASCADE ON UPDATE CASCADE;

