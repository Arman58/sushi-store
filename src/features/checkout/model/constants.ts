export const DRAFT_STORAGE_KEY = "checkout-draft";
export const DRAFT_TTL_MS = 24 * 60 * 60 * 1_000;
export const ORDER_ID_KEY = "last-order-id";

export const CHECKOUT_MOBILE_SCROLL_PAD =
    "calc(120px + env(safe-area-inset-bottom))";

/** Высота меню зон — остальное (портал / scroll-close) в AppSelect. */
export const deliveryZoneSelectMenuProps = {
    PaperProps: {
        sx: { maxHeight: "40vh" },
    },
} as const;
