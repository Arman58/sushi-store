-- Аудит 2026-07-10: индексы, целостность, запрет каскадного удаления из корзин.

-- 1) Postgres не индексирует FK автоматически: include order.items делал seq scan.
CREATE INDEX "OrderItem_orderId_idx" ON "OrderItem"("orderId");

-- 2) Страницы категорий: выборка активных товаров категории.
CREATE INDEX "Product_categoryId_isActive_idx" ON "Product"("categoryId", "isActive");

-- 3) CartLine.productId: Cascade -> Restrict.
-- Удаление товара не должно молча выкидывать его из серверных корзин;
-- админский DELETE при наличии ссылок делает soft delete (isActive = false).
ALTER TABLE "CartLine" DROP CONSTRAINT "CartLine_productId_fkey";
ALTER TABLE "CartLine" ADD CONSTRAINT "CartLine_productId_fkey"
    FOREIGN KEY ("productId") REFERENCES "Product"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

-- 4) CHECK-ограничения (страховка на уровне БД; до сих пор валидировалось только в API).
-- NOT VALID: существующие строки не сканируются и не блокируют деплой;
-- ограничение применяется ко всем новым INSERT/UPDATE.
ALTER TABLE "Review" ADD CONSTRAINT "Review_rating_range_check"
    CHECK ("rating" BETWEEN 1 AND 5) NOT VALID;

ALTER TABLE "Product" ADD CONSTRAINT "Product_price_nonnegative_check"
    CHECK ("price" >= 0) NOT VALID;

ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_quantity_positive_check"
    CHECK ("quantity" > 0) NOT VALID;

ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_price_nonnegative_check"
    CHECK ("price" >= 0) NOT VALID;

ALTER TABLE "CartLine" ADD CONSTRAINT "CartLine_quantity_positive_check"
    CHECK ("quantity" > 0) NOT VALID;
