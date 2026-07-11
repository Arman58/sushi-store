-- Добавляем статус ожидания подтверждения менеджером (серые зоны доставки).
ALTER TYPE "OrderStatus" ADD VALUE IF NOT EXISTS 'PENDING_APPROVAL';
