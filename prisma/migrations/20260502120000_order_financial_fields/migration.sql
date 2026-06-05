-- AlterTable
ALTER TABLE "Order" ADD COLUMN "subtotalBeforeDiscount" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Order" ADD COLUMN "discountAmount" INTEGER NOT NULL DEFAULT 0;

-- Backfill from line items and existing totals (legacy orders)
UPDATE "Order" o
SET "subtotalBeforeDiscount" = COALESCE(
    (
        SELECT SUM(oi.price * oi.quantity)
        FROM "OrderItem" oi
        WHERE oi."orderId" = o.id
    ),
    0
);

UPDATE "Order"
SET "discountAmount" = GREATEST(
    0,
    "subtotalBeforeDiscount" + "deliveryPrice" - "totalPrice"
);
