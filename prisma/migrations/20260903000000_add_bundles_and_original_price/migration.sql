-- AlterTable
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "originalPrice" INTEGER;

-- CreateTable
CREATE TABLE IF NOT EXISTS "BundleItem" (
    "id" SERIAL NOT NULL,
    "bundleId" INTEGER NOT NULL,
    "productId" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "position" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "BundleItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "BundleItem_bundleId_productId_key" ON "BundleItem"("bundleId", "productId");
CREATE INDEX IF NOT EXISTS "BundleItem_bundleId_idx" ON "BundleItem"("bundleId");
CREATE INDEX IF NOT EXISTS "BundleItem_productId_idx" ON "BundleItem"("productId");

-- AddForeignKey
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'BundleItem_bundleId_fkey'
    ) THEN
        ALTER TABLE "BundleItem" ADD CONSTRAINT "BundleItem_bundleId_fkey" FOREIGN KEY ("bundleId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'BundleItem_productId_fkey'
    ) THEN
        ALTER TABLE "BundleItem" ADD CONSTRAINT "BundleItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;
