export type CartModifierSnapshot = {
    id: number;
    name: string;
    priceDelta: number;
};

export type CartItem = {
    /** Уникальная строка корзины: productId + набор модификаторов */
    cartItemId: string;
    productId: number;
    name: string;
    basePrice: number;
    quantity: number;
    selectedModifiers: CartModifierSnapshot[];
    /** Цена одной единицы с учётом модификаторов */
    calculatedItemPrice: number;
    image?: string | null;
};

export type AddToCartPayload = {
    productId: number;
    name: string;
    basePrice: number;
    selectedModifiers: CartModifierSnapshot[];
    calculatedItemPrice: number;
    image?: string | null;
    /** Начальное кол-во за один set() (minQty), без второго setItemQuantity. */
    initialQuantity?: number;
};
