export const DRAFT_STORAGE_KEY = "checkout-draft";
export const DRAFT_TTL_MS = 24 * 60 * 60 * 1_000;
export const ORDER_ID_KEY = "last-order-id";

export const CHECKOUT_MOBILE_SCROLL_PAD =
    "calc(120px + env(safe-area-inset-bottom))";

export const deliveryZoneSelectMenuProps = {
    disablePortal: true,
    disableScrollLock: false,
    PaperProps: {
        sx: { maxHeight: "40vh", position: "relative" },
    },
} as const;
