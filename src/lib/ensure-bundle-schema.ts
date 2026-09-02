import { prisma } from "@/lib/prisma";

let schemaEnsured = false;

/**
 * Self-healing DB check: guarantees that the originalPrice column
 * and the BundleItem table exist even if production migrations
 * haven't been run manually yet.
 */
export async function ensureBundleSchema(): Promise<void> {
    if (schemaEnsured) return;

    try {
        await prisma.$executeRawUnsafe(`
            ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "originalPrice" INTEGER;
        `);

        await prisma.$executeRawUnsafe(`
            CREATE TABLE IF NOT EXISTS "BundleItem" (
                "id" SERIAL NOT NULL,
                "bundleId" INTEGER NOT NULL,
                "productId" INTEGER NOT NULL,
                "quantity" INTEGER NOT NULL DEFAULT 1,
                "position" INTEGER NOT NULL DEFAULT 0,
                CONSTRAINT "BundleItem_pkey" PRIMARY KEY ("id")
            );
        `);

        await prisma.$executeRawUnsafe(`
            CREATE UNIQUE INDEX IF NOT EXISTS "BundleItem_bundleId_productId_key" ON "BundleItem"("bundleId", "productId");
            CREATE INDEX IF NOT EXISTS "BundleItem_bundleId_idx" ON "BundleItem"("bundleId");
            CREATE INDEX IF NOT EXISTS "BundleItem_productId_idx" ON "BundleItem"("productId");
        `);

        schemaEnsured = true;
    } catch (err) {
        console.warn("[ensureBundleSchema] Warning: could not verify bundle schema:", err);
    }
}
