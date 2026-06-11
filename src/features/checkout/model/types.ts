import type { CheckoutFormValues } from "@/shared/lib/schemas";

export type DraftData = Omit<CheckoutFormValues, "hp"> & { ts: number };

export type DeliveryZoneOption = {
    id: number;
    name: string;
    deliveryPrice: number;
    minOrderAmount: number;
    description?: string | null;
    requiresManagerApproval?: boolean;
};

export type CheckoutSubmitContext = {
    items: import("@/features/cart").CartItem[];
    cartSubtotal: number;
    grandTotal: number;
    promoDiscount: number;
    appliedPromoCode: string | null;
    hasItems: boolean;
};
