-- Наличные: сумма, с которой готовить сдачу (֏). NULL - сдача не нужна.
ALTER TABLE "Order" ADD COLUMN "changeFrom" INTEGER;
