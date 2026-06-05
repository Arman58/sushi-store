-- AlterTable
ALTER TABLE "DeliveryZone" ADD COLUMN "description" TEXT DEFAULT '';
ALTER TABLE "DeliveryZone" ADD COLUMN "requiresManagerApproval" BOOLEAN NOT NULL DEFAULT false;
