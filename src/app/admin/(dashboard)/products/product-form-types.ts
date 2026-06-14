import type { AdminModifierGroupInput } from "@/lib/admin-product-modifiers";
import {
    emptyLocalizedJson,
    type LocalizedJson,
    parseLocalizedJson,
} from "@/lib/i18n-utils";

export type ProductSavePayload = {
    name: LocalizedJson;
    price: number;
    categoryId: number;
    composition: LocalizedJson | null;
    description: LocalizedJson | null;
    weight: number | null;
    images: string[];
    modifierGroups: AdminModifierGroupInput[];
};

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
    categoryId: number | null;
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

export type EditingProduct = null | Record<string, never> | ProductRow;

export type ProductDialogFormValues = {
    name: LocalizedJson;
    price: string;
    weight: string;
    categoryId: string;
    composition: LocalizedJson;
    description: LocalizedJson;
    images: string[];
    modifierGroups: {
        id?: number;
        name: LocalizedJson;
        required: boolean;
        maxChoices: number;
        modifiers: {
            id?: number;
            name: LocalizedJson;
            priceDelta: number;
        }[];
    }[];
};

export const TEXT_FIELD_FOCUS_SX = {
    "& .MuiOutlinedInput-root": {
        "&.Mui-focused:not(.Mui-error) fieldset": { borderColor: "primary.main" },
    },
} as const;

export function hasLocalizedText(value: LocalizedJson): boolean {
    return Boolean(value.hy.trim() || value.ru.trim() || value.en.trim());
}

function toLocalizedPayload(value: LocalizedJson): {
    hy: string;
    ru: string;
    en: string;
} {
    return {
        hy: value.hy ?? "",
        ru: value.ru ?? "",
        en: value.en ?? "",
    };
}

export function emptyProductDialogForm(): ProductDialogFormValues {
    return {
        name: emptyLocalizedJson(),
        price: "",
        weight: "",
        categoryId: "",
        composition: emptyLocalizedJson(),
        description: emptyLocalizedJson(),
        images: [],
        modifierGroups: [],
    };
}

export function productDialogDefaults(
    editingProduct: EditingProduct,
): ProductDialogFormValues {
    if (editingProduct === null || !("id" in editingProduct)) {
        return emptyProductDialogForm();
    }
    const p = editingProduct as ProductRow;
    const sortedGroups = [...(p.modifierGroups ?? [])].sort(
        (a, b) => a.position - b.position || a.id - b.id,
    );
    return {
        name: parseLocalizedJson(p.name),
        price: String(p.price),
        weight: p.weight != null ? String(p.weight) : "",
        categoryId: p.categoryId != null ? String(p.categoryId) : "",
        composition: parseLocalizedJson(p.composition),
        description: parseLocalizedJson(p.description),
        images: Array.isArray(p.images) ? (p.images as string[]) : [],
        modifierGroups: sortedGroups.map((g) => ({
            id: g.id,
            name: parseLocalizedJson(g.name),
            required: g.required,
            maxChoices: g.maxChoices,
            modifiers: [...(g.modifiers ?? [])]
                .sort((a, b) => a.position - b.position || a.id - b.id)
                .map((m) => ({
                    id: m.id,
                    name: parseLocalizedJson(m.name),
                    priceDelta: m.priceDelta,
                })),
        })),
    };
}

export function buildModifierPayload(
    groups: ProductDialogFormValues["modifierGroups"],
): { ok: true; modifierGroups: AdminModifierGroupInput[] } | { ok: false; message: string } {
    const modifierGroups: AdminModifierGroupInput[] = [];
    for (let gi = 0; gi < groups.length; gi++) {
        const g = groups[gi];
        const name = g.name;
        const modifiers = g.modifiers
            .filter((m) => hasLocalizedText(m.name))
            .map((m, mi) => ({
                ...(typeof m.id === "number" ? { id: m.id } : {}),
                name: toLocalizedPayload(m.name),
                priceDelta: Math.round(Number(m.priceDelta)) || 0,
                position: mi,
            }));
        if (!hasLocalizedText(name) && modifiers.length === 0) continue;
        if (!hasLocalizedText(name)) {
            return {
                ok: false,
                message: `Группа ${String(gi + 1)}: укажите название (или удалите опции).`,
            };
        }
        let maxChoices = Number.parseInt(String(g.maxChoices), 10);
        if (Number.isNaN(maxChoices) || maxChoices < 0) {
            maxChoices = 1;
        }
        modifierGroups.push({
            ...(typeof g.id === "number" ? { id: g.id } : {}),
            name: toLocalizedPayload(name),
            required: Boolean(g.required),
            maxChoices,
            position: gi,
            modifiers,
        });
    }
    return { ok: true, modifierGroups };
}
