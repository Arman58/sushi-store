export type OrderLineModifierSnapshot = {
    id: number;
    name: string;
    priceDelta: number;
};

export type ProductForOrderPricing = {
    id: number;
    price: number;
    modifierGroups: Array<{
        id: number;
        name: string;
        required: boolean;
        maxChoices: number;
        modifiers: Array<{ id: number; name: string; priceDelta: number }>;
    }>;
};

/**
 * Семантика кодов:
 * - "invalid_payload" → 400. Подмена/некорректные данные: чужой модификатор,
 *   дубль в одной позиции, опции для товара без групп.
 * - "rule_violation"  → 422. Бизнес-правила групп: required без выбора,
 *   превышен maxChoices.
 *
 * Конфликты состояния (товар неактивен, итоговая цена не сошлась) обрабатываются
 * выше по стеку — это 409, отдельная зона ответственности.
 */
export type OrderLinePriceError = {
    ok: false;
    code: "invalid_payload" | "rule_violation";
    message: string;
};

export type OrderLinePriceOk = {
    ok: true;
    unitPrice: number;
    snapshot: OrderLineModifierSnapshot[];
};

/**
 * Проверяет выбор модификаторов по правилам групп и считает цену строки из БД (база + сумма priceDelta).
 *
 * Серверный пересчёт — единственный источник истины: клиентская цена в финале только сверяется.
 */
export function resolveOrderLinePrice(
    product: ProductForOrderPricing,
    selectedModifierIds: number[],
): OrderLinePriceOk | OrderLinePriceError {
    // 1) Дубль в одной позиции — это уже подозрительно (UI такого не порождает).
    const seen = new Set<number>();
    for (const id of selectedModifierIds) {
        if (seen.has(id)) {
            return {
                ok: false,
                code: "invalid_payload",
                message: "Повтор модификатора в одной позиции",
            };
        }
        seen.add(id);
    }

    // 2) Карта id → модификатор по всем группам товара. Защищает от подмены
    //    «чужими» id (Modifier из другого товара).
    const idToModifier = new Map<
        number,
        { groupId: number; name: string; priceDelta: number }
    >();

    for (const g of product.modifierGroups) {
        for (const m of g.modifiers) {
            idToModifier.set(m.id, {
                groupId: g.id,
                name: m.name,
                priceDelta: m.priceDelta,
            });
        }
    }

    for (const mid of selectedModifierIds) {
        if (!idToModifier.has(mid)) {
            return {
                ok: false,
                code: "invalid_payload",
                message:
                    "В заказе указаны недопустимые опции. Обновите корзину и оформите заказ снова.",
            };
        }
    }

    // 3) У товара нет групп, но клиент прислал опции — однозначная подмена.
    if (product.modifierGroups.length === 0 && selectedModifierIds.length > 0) {
        return {
            ok: false,
            code: "invalid_payload",
            message:
                "Для этого товара нет опций. Обновите корзину и оформите заказ снова.",
        };
    }

    // 4) Правила групп.
    //    required=true  → picked.length >= 1
    //    maxChoices > 0 → picked.length <= maxChoices
    //    maxChoices = 0 → без верхней границы
    for (const g of product.modifierGroups) {
        const groupModIdSet = new Set(g.modifiers.map((m) => m.id));
        const picked = selectedModifierIds.filter((id) => groupModIdSet.has(id));

        if (g.required && picked.length === 0) {
            return {
                ok: false,
                code: "rule_violation",
                message: `Выберите опцию: «${g.name}»`,
            };
        }

        if (g.maxChoices > 0 && picked.length > g.maxChoices) {
            return {
                ok: false,
                code: "rule_violation",
                message: `Слишком много опций в группе «${g.name}»`,
            };
        }
    }

    // 5) Snapshot и пересчёт цены — в порядке групп/опций из БД,
    //    чтобы он стабильно отображался в админке и истории.
    const snapshot: OrderLineModifierSnapshot[] = [];
    let delta = 0;

    for (const g of product.modifierGroups) {
        for (const m of g.modifiers) {
            if (seen.has(m.id)) {
                snapshot.push({
                    id: m.id,
                    name: m.name,
                    priceDelta: m.priceDelta,
                });
                delta += m.priceDelta;
            }
        }
    }

    return {
        ok: true,
        unitPrice: product.price + delta,
        snapshot,
    };
}
