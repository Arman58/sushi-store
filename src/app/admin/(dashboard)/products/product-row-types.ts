export type ProductRow = {
    id: number;
    name: unknown;
    description: unknown;
    composition: unknown;
    price: number;
    weight: number | null;
    images?: unknown;
    mainImage?: string | null;
    isActive: boolean;
    isAvailable?: boolean;
    minQty?: number;
    maxQty?: number | null;
    upsells?: { suggestedId: number }[];
    categoryId: number | null;
    createdAt?: string;
    category: { name: unknown } | null;
    modifierGroups?: {
        id: number;
        name: unknown;
        required: boolean;
        maxChoices: number;
        position: number;
        modifiers: {
            id: number;
            name: unknown;
            priceDelta: number;
            position: number;
        }[];
    }[];
};

/** `null` - форма закрыта; `{}` - создание; `ProductRow` - редактирование */
export type EditingProduct = null | Record<string, never> | ProductRow;

/** Общие коллбэки/флаги строк для desktop-таблицы и mobile-списка. */
export type ProductRowActions = {
    deletingId: number | null;
    saveLoading: boolean;
    rotatingMainId: number | null;
    onEdit: (product: ProductRow) => void;
    /** Desktop: открыть диалог подтверждения удаления. */
    onRequestDelete: (id: number) => void;
    /** Mobile: удалить сразу (историческое поведение). */
    onDeleteNow: (id: number) => void;
    onCycleMainCover: (product: ProductRow) => void;
    onShelfChange: (id: number, nextActive: boolean) => void;
    onStockChange: (id: number, isAvailable: boolean) => void;
};
