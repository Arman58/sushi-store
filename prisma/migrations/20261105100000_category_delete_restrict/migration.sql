-- Удаление категории с товарами раньше проходило молча: FK был ON DELETE SET NULL,
-- и товары оставались без категории (хотя админка обещала "удаление будет отклонено").
-- RESTRICT возвращает задуманное поведение: категорию с товарами удалить нельзя.
-- Уже осиротевшие товары (categoryId IS NULL) не затрагиваются.
ALTER TABLE "Product" DROP CONSTRAINT "Product_categoryId_fkey";
ALTER TABLE "Product" ADD CONSTRAINT "Product_categoryId_fkey"
    FOREIGN KEY ("categoryId") REFERENCES "Category"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;
