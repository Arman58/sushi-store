-- Normalize Cart.items JSON blob into CartLine rows (H-3).
-- Expand/contract: keep reading old JSON during deploy via dual-write window not needed —
-- this migration copies data then drops the JSON column.

ALTER TABLE "Cart" ADD COLUMN IF NOT EXISTS "appliedPromoCode" TEXT;

CREATE TABLE IF NOT EXISTS "CartLine" (
    "id" SERIAL NOT NULL,
    "cartId" INTEGER NOT NULL,
    "cartItemId" TEXT NOT NULL,
    "productId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "basePrice" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL,
    "selectedModifiers" JSONB NOT NULL DEFAULT '[]',
    "calculatedItemPrice" INTEGER NOT NULL,
    "image" TEXT,
    "position" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CartLine_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "CartLine_cartId_cartItemId_key" ON "CartLine"("cartId", "cartItemId");
CREATE INDEX IF NOT EXISTS "CartLine_productId_idx" ON "CartLine"("productId");
CREATE INDEX IF NOT EXISTS "CartLine_cartId_idx" ON "CartLine"("cartId");

-- Migrate existing JSON payloads: { items: [...], appliedPromoCode?: string|null }
DO $$
DECLARE
  cart_row RECORD;
  item_json JSONB;
  items_arr JSONB;
  promo TEXT;
  idx INT;
  product_exists BOOLEAN;
BEGIN
  FOR cart_row IN SELECT id, items FROM "Cart" WHERE items IS NOT NULL LOOP
    BEGIN
      IF jsonb_typeof(cart_row.items::jsonb) = 'object' THEN
        items_arr := cart_row.items::jsonb -> 'items';
        promo := NULLIF(cart_row.items::jsonb ->> 'appliedPromoCode', '');
        IF promo IS NOT NULL THEN
          UPDATE "Cart" SET "appliedPromoCode" = promo WHERE id = cart_row.id;
        END IF;
      ELSIF jsonb_typeof(cart_row.items::jsonb) = 'array' THEN
        items_arr := cart_row.items::jsonb;
      ELSE
        CONTINUE;
      END IF;

      IF items_arr IS NULL OR jsonb_typeof(items_arr) <> 'array' THEN
        CONTINUE;
      END IF;

      idx := 0;
      FOR item_json IN SELECT * FROM jsonb_array_elements(items_arr) LOOP
        SELECT EXISTS(
          SELECT 1 FROM "Product" p WHERE p.id = (item_json ->> 'productId')::int
        ) INTO product_exists;

        IF NOT product_exists THEN
          idx := idx + 1;
          CONTINUE;
        END IF;

        INSERT INTO "CartLine" (
          "cartId", "cartItemId", "productId", "name", "basePrice", "quantity",
          "selectedModifiers", "calculatedItemPrice", "image", "position",
          "createdAt", "updatedAt"
        ) VALUES (
          cart_row.id,
          COALESCE(item_json ->> 'cartItemId', (item_json ->> 'productId') || '-' || idx::text),
          (item_json ->> 'productId')::int,
          COALESCE(item_json ->> 'name', 'Item'),
          COALESCE((item_json ->> 'basePrice')::int, 0),
          GREATEST(1, COALESCE((item_json ->> 'quantity')::int, 1)),
          COALESCE(item_json -> 'selectedModifiers', '[]'::jsonb),
          COALESCE((item_json ->> 'calculatedItemPrice')::int, 0),
          NULLIF(item_json ->> 'image', ''),
          idx,
          CURRENT_TIMESTAMP,
          CURRENT_TIMESTAMP
        )
        ON CONFLICT ("cartId", "cartItemId") DO NOTHING;

        idx := idx + 1;
      END LOOP;
    EXCEPTION WHEN OTHERS THEN
      -- Skip corrupt cart payloads; empty cart is safer than failing migrate.
      RAISE NOTICE 'Skipping cart % migration: %', cart_row.id, SQLERRM;
    END;
  END LOOP;
END $$;

ALTER TABLE "Cart" DROP COLUMN IF EXISTS "items";

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'CartLine_cartId_fkey'
  ) THEN
    ALTER TABLE "CartLine"
      ADD CONSTRAINT "CartLine_cartId_fkey"
      FOREIGN KEY ("cartId") REFERENCES "Cart"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'CartLine_productId_fkey'
  ) THEN
    ALTER TABLE "CartLine"
      ADD CONSTRAINT "CartLine_productId_fkey"
      FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
