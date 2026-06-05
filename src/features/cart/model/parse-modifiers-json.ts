/**
 * Парсер snapshot-а модификаторов из БД.
 *
 * В Prisma поле OrderItem.selectedModifiers имеет тип Json — приходит как unknown.
 * Эта функция превращает любой неизвестный вход в типизированный CartModifierSnapshot[],
 * молча пропуская элементы неправильной формы (вместо throw, чтобы UI не ломался,
 * если у старых заказов сохранён старый формат).
 *
 * Используется во всех местах, где надо отрисовать заказы из БД:
 *   - админка (просмотр заказа)
 *   - трекер заказа клиента
 *   - функция «повторить заказ» (заполнение корзины из истории)
 */

import type { CartModifierSnapshot } from "./types";

export function parseSelectedModifiersJson(
    raw: unknown,
): CartModifierSnapshot[] {
    if (!Array.isArray(raw)) return [];

    const out: CartModifierSnapshot[] = [];
    for (const el of raw) {
        if (!el || typeof el !== "object") continue;
        const o = el as { id?: unknown; name?: unknown; priceDelta?: unknown };
        if (
            typeof o.id !== "number" ||
            typeof o.name !== "string" ||
            typeof o.priceDelta !== "number"
        ) {
            continue;
        }
        out.push({ id: o.id, name: o.name, priceDelta: o.priceDelta });
    }
    return out;
}
