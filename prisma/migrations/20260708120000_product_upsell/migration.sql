-- CreateTable: кросс-селл «с этим берут»
CREATE TABLE "ProductUpsell" (
    "id" SERIAL NOT NULL,
    "productId" INTEGER NOT NULL,
    "suggestedId" INTEGER NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ProductUpsell_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ProductUpsell_productId_suggestedId_key" ON "ProductUpsell"("productId", "suggestedId");

-- CreateIndex
CREATE INDEX "ProductUpsell_productId_idx" ON "ProductUpsell"("productId");

-- AddForeignKey
ALTER TABLE "ProductUpsell" ADD CONSTRAINT "ProductUpsell_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductUpsell" ADD CONSTRAINT "ProductUpsell_suggestedId_fkey" FOREIGN KEY ("suggestedId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
