import type { Prisma } from "@prisma/client";

/**
 * Снимок позиции прошлого заказа - то, что нужно «Повторить заказ».
 * productId nullable, потому что в БД OrderItem.productId nullable
 * (страница не валится, если товар был удалён).
 */
export type ProfileOrderItem = {
    productId: number | null;
    name: string;
    price: number;
    quantity: number;
    selectedModifiers: Prisma.JsonValue;
};
