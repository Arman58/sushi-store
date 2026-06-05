import type { CartModifierSnapshot } from "./types";

/** Уникальный id строки: `productId` или `productId_opt1_opt2…` по возрастанию id опций */
export function buildCartItemId(
    productId: number,
    modifiers: Pick<CartModifierSnapshot, "id">[],
): string {
    const ids = [...modifiers.map((m) => m.id)].sort((a, b) => a - b);
    if (ids.length === 0) return String(productId);
    return `${productId}_${ids.join("_")}`;
}
