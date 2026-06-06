-- Rename IN_WORK → COOKING (унификация статусов)
ALTER TYPE "OrderStatus" RENAME VALUE 'IN_WORK' TO 'COOKING';

-- AlterTable: ETA задаётся кухней вручную
ALTER TABLE "Order" ADD COLUMN "estimatedDeliveryAt" TIMESTAMP(3);
