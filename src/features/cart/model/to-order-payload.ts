/**
 * Преобразование строк корзины в payload для POST /api/order.
 *
 * Канонический формат (Шаг 4 спеки):
 *   {
 *     productId,
 *     name,
 *     price,                    // === calculatedItemPrice (название поля API)
 *     quantity,
 *     selectedModifierIds: number[]   // только id, без объектов
 *   }
 *
 * Сервер пересчитывает price на основе actual Modifier.priceDelta из БД
 * и сверяет результат с присланным `price`. См. resolveOrderLinePrice.
 */

import type { CartItem } from "./types";

export type OrderApiItem = {
    productId: number;
    name: string;
    /** Цена единицы товара с учётом модификаторов на момент checkout. */
    price: number;
    quantity: number;
    /** Только id; объекты модификаторов не отправляем — сервер сам поднимет их из БД. */
    selectedModifierIds: number[];
};

/**
 * Превращает массив CartItem в payload для /api/order.
 *
 * Чистая функция: безопасна к мутациям, легко мокается в тестах.
 */
export function toOrderPayloadItems(items: CartItem[]): OrderApiItem[] {
    return items.map((item) => ({
        productId: item.productId,
        name: item.name,
        price: item.calculatedItemPrice,
        quantity: item.quantity,
        selectedModifierIds: item.selectedModifiers.map((m) => m.id),
    }));
}
