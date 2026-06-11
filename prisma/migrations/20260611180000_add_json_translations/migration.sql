-- Convert translatable text columns from TEXT to JSONB (hy default locale).

-- Category.name
ALTER TABLE "Category"
ALTER COLUMN "name" TYPE JSONB
USING jsonb_build_object('hy', "name", 'ru', "name", 'en', "name");

-- Product.name, description, composition
ALTER TABLE "Product"
ALTER COLUMN "name" TYPE JSONB
USING jsonb_build_object('hy', "name", 'ru', "name", 'en', "name");

ALTER TABLE "Product"
ALTER COLUMN "description" TYPE JSONB
USING CASE
  WHEN "description" IS NULL THEN NULL
  ELSE jsonb_build_object('hy', "description", 'ru', "description", 'en', "description")
END;

ALTER TABLE "Product"
ALTER COLUMN "composition" TYPE JSONB
USING CASE
  WHEN "composition" IS NULL THEN NULL
  ELSE jsonb_build_object('hy', "composition", 'ru', "composition", 'en', "composition")
END;

-- DeliveryZone.name, description
ALTER TABLE "DeliveryZone"
ALTER COLUMN "name" TYPE JSONB
USING jsonb_build_object('hy', "name", 'ru', "name", 'en', "name");

ALTER TABLE "DeliveryZone"
ALTER COLUMN "description" DROP DEFAULT;

ALTER TABLE "DeliveryZone"
ALTER COLUMN "description" TYPE JSONB
USING CASE
  WHEN "description" IS NULL OR "description" = '' THEN '{}'::jsonb
  ELSE jsonb_build_object('hy', "description", 'ru', "description", 'en', "description")
END;

ALTER TABLE "DeliveryZone"
ALTER COLUMN "description" SET DEFAULT '{}'::jsonb;
