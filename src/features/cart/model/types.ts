export type CartItem = {
    productId: number;
    name: string;
    price: number;
    image?: string | null;
    quantity: number;
};

export type AddToCartPayload = {
    productId: number;
    name: string;
    price: number;
    image?: string | null;
};
