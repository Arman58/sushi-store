import type { MenuModifierGroup } from "@/entities/product/model/modifiers";

export type LocalizedJson = Record<string, string>;

export const STORE_LOCALES = ["hy", "ru", "en"] as const;
export type StoreLocale = (typeof STORE_LOCALES)[number];
export const DEFAULT_STORE_LOCALE: StoreLocale = "hy";

export function isLocalizedJson(value: unknown): value is LocalizedJson {
    const record = asLocalizedRecord(value);
    if (!record) return false;
    return Boolean(record.hy?.trim() || record.ru?.trim() || record.en?.trim());
}

function tryParseLocalizedJsonString(value: string): LocalizedJson | null {
    const trimmed = value.trim();
    if (!trimmed.startsWith("{")) return null;
    try {
        const parsed: unknown = JSON.parse(trimmed);
        return asLocalizedRecord(parsed);
    } catch {
        return null;
    }
}

/** Нормализует Prisma Json / частичный объект в { hy, ru, en }. */
function asLocalizedRecord(value: unknown): LocalizedJson | null {
    if (value == null || typeof value !== "object" || Array.isArray(value)) {
        return null;
    }
    const raw = value as Record<string, unknown>;
    const hy = typeof raw.hy === "string" ? raw.hy : "";
    const ru = typeof raw.ru === "string" ? raw.ru : "";
    const en = typeof raw.en === "string" ? raw.en : "";
    if (!hy.trim() && !ru.trim() && !en.trim()) return null;
    return { hy, ru, en };
}

function pickLocaleString(record: LocalizedJson, locale: string): string {
    const direct = record[locale as keyof LocalizedJson];
    if (typeof direct === "string" && direct.trim()) return direct.trim();

    const fallbackHy = record[DEFAULT_STORE_LOCALE];
    if (typeof fallbackHy === "string" && fallbackHy.trim()) return fallbackHy.trim();

    for (const key of STORE_LOCALES) {
        const value = record[key];
        if (typeof value === "string" && value.trim()) return value.trim();
    }
    return "";
}

/** Извлекает одну строку для витрины из JSON-поля Prisma. */
export function getLocalizedField(jsonField: unknown, locale: string): string {
    if (jsonField == null) return "";

    if (typeof jsonField === "string") {
        const trimmed = jsonField.trim();
        if (!trimmed) return "";

        const parsed = tryParseLocalizedJsonString(trimmed);
        if (parsed) return pickLocaleString(parsed, locale);

        // Пустой JSON в БД иногда приходит как строка "{}" - не показываем как текст
        if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
            try {
                const json = JSON.parse(trimmed) as unknown;
                if (
                    json !== null &&
                    typeof json === "object" &&
                    !Array.isArray(json)
                ) {
                    return "";
                }
            } catch {
                /* обычная строка, не JSON */
            }
        }

        return trimmed;
    }

    const record = asLocalizedRecord(jsonField);
    if (record) return pickLocaleString(record, locale);

    return "";
}

export type LocalizedFields<T, K extends keyof T> = Omit<T, K> & {
    [P in K]: string;
};

/** Заменяет JSON-поля сущности на обычные строки для витрины. */
export function localizeEntity<
    T extends Record<string, unknown>,
    K extends keyof T & string,
>(
    entity: T,
    locale: string,
    fields: readonly K[],
): LocalizedFields<T, K> {
    const out = { ...entity } as LocalizedFields<T, K>;
    for (const field of fields) {
        if (field in out) {
            (out as Record<string, unknown>)[field] = getLocalizedField(
                out[field],
                locale,
            );
        }
    }
    return out;
}

export function localizeEntities<
    T extends Record<string, unknown>,
    K extends keyof T & string,
>(
    entities: readonly T[],
    locale: string,
    fields: readonly K[],
): LocalizedFields<T, K>[] {
    return entities.map((entity) => localizeEntity(entity, locale, fields));
}

/** Для админки: пустой шаблон переводов. */
export function emptyLocalizedJson(): LocalizedJson {
    return { hy: "", ru: "", en: "" };
}

/** Подмешивает переводы HY/EN в существующий объект (RU не трогаем). */
export function mergeLocalizedTranslations(
    base: LocalizedJson,
    translated: { en?: string; hy?: string },
): LocalizedJson {
    return {
        ...base,
        en: translated.en?.trim() ? translated.en : base.en,
        hy: translated.hy?.trim() ? translated.hy : base.hy,
    };
}

export type LocalizedFillStatus = Record<StoreLocale, boolean>;

/** Какие локали заполнены в JSONB-поле. */
export function localizedFillStatus(value: unknown): LocalizedFillStatus {
    const record = asLocalizedRecord(value);
    if (!record) {
        return { hy: false, ru: false, en: false };
    }
    return {
        hy: Boolean(record.hy?.trim()),
        ru: Boolean(record.ru?.trim()),
        en: Boolean(record.en?.trim()),
    };
}

/** Парсит JSON из БД в объект для форм админки. */
/** Источник для slug: предпочитаем латиницу (ru/en). */
export function localizedSlugSource(value: unknown): string {
    const ru = getLocalizedField(value, "ru");
    if (ru.trim()) return ru;
    const en = getLocalizedField(value, "en");
    if (en.trim()) return en;
    return getLocalizedField(value, DEFAULT_STORE_LOCALE);
}

type ProductWithCategory = {
    name: unknown;
    description?: unknown;
    composition?: unknown;
    category?: { name: unknown } | null;
};

export function localizeProduct<T extends ProductWithCategory>(
    product: T,
    locale: string,
): T {
    const localized = localizeEntity(
        product as Record<string, unknown>,
        locale,
        ["name", "description", "composition"],
    );
    const category = product.category
        ? localizeEntity(
              product.category as Record<string, unknown>,
              locale,
              ["name"],
          )
        : product.category;
    return { ...product, ...localized, category } as T;
}

export function localizeProducts<T extends ProductWithCategory>(
    products: readonly T[],
    locale: string,
): T[] {
    return products.map((product) => localizeProduct(product, locale));
}

export type StorefrontCategory = {
    id: number;
    slug: string;
    name: string;
    position?: number;
    isActive?: boolean;
    /** Фото для карточки категории на витрине (обложка первого товара). */
    image?: string | null;
};

/** Гарантированно отдаёт категорию с plain-string name для клиента. */
export function toStorefrontCategory(
    category: Record<string, unknown>,
    locale: string,
): StorefrontCategory {
    return {
        id: Number(category.id),
        slug: String(category.slug),
        name: getLocalizedField(category.name, locale),
        ...(typeof category.position === "number"
            ? { position: category.position }
            : {}),
        ...(typeof category.isActive === "boolean"
            ? { isActive: category.isActive }
            : {}),
    };
}

export function toStorefrontCategories(
    categories: readonly Record<string, unknown>[],
    locale: string,
): StorefrontCategory[] {
    return categories.map((c) => toStorefrontCategory(c, locale));
}

/** Локализует группы и опции модификаторов для витрины. */
export function toStorefrontModifierGroups(
    groups: readonly Record<string, unknown>[],
    locale: string,
): MenuModifierGroup[] {
    return groups.map((g) => {
        const modifiersRaw = g.modifiers;
        const modifiers = Array.isArray(modifiersRaw)
            ? modifiersRaw.map((m) => {
                  const mod = m as Record<string, unknown>;
                  return {
                      id: Number(mod.id),
                      name: getLocalizedField(mod.name, locale),
                      priceDelta: Number(mod.priceDelta),
                  };
              })
            : [];

        return {
            id: Number(g.id),
            name: getLocalizedField(g.name, locale),
            required: Boolean(g.required),
            maxChoices: Number(g.maxChoices),
            modifiers,
        };
    });
}

export type StorefrontProduct = {
    id: number;
    slug: string;
    name: string;
    description: string | null;
    composition: string | null;
    price: number;
    weight: number | null;
    images: unknown;
    mainImage: string | null;
    category: StorefrontCategory | null;
    modifierGroups?: MenuModifierGroup[];
    /**
     * Есть ли у товара модификаторы. Позволяет НЕ грузить сами группы
     * в списки (меню) - клиент подтянет их по требованию при открытии.
     */
    hasModifiers?: boolean;
    /** Денормализованный средний рейтинг (0 - нет отзывов). */
    ratingAvg: number;
    /** Кол-во опубликованных отзывов. */
    ratingCount: number;
    /** Стоп-лист: false - «закончилось», заказ заблокирован. */
    isAvailable: boolean;
    /** Минимальное количество в заказе. */
    minQty: number;
    /** Максимум на заказ; null - без лимита. */
    maxQty: number | null;
};

/** Гарантированно отдаёт товар с plain-string полями для клиента. */
export function toStorefrontProduct(
    product: Record<string, unknown>,
    locale: string,
): StorefrontProduct {
    const categoryRaw = product.category;
    const category =
        categoryRaw != null && typeof categoryRaw === "object" && !Array.isArray(categoryRaw)
            ? toStorefrontCategory(categoryRaw as Record<string, unknown>, locale)
            : null;

    return {
        id: Number(product.id),
        slug: String(product.slug),
        name: getLocalizedField(product.name, locale),
        description: getLocalizedField(product.description, locale) || null,
        composition: getLocalizedField(product.composition, locale) || null,
        price: Number(product.price),
        weight:
            typeof product.weight === "number" && Number.isFinite(product.weight)
                ? product.weight
                : null,
        images: product.images ?? null,
        mainImage:
            typeof product.mainImage === "string" ? product.mainImage : null,
        category,
        ratingAvg:
            typeof product.ratingAvg === "number" &&
            Number.isFinite(product.ratingAvg)
                ? product.ratingAvg
                : 0,
        ratingCount:
            typeof product.ratingCount === "number" &&
            Number.isFinite(product.ratingCount)
                ? product.ratingCount
                : 0,
        isAvailable: product.isAvailable !== false,
        minQty:
            typeof product.minQty === "number" && product.minQty > 1
                ? product.minQty
                : 1,
        maxQty:
            typeof product.maxQty === "number" && product.maxQty > 0
                ? product.maxQty
                : null,
        ...(Array.isArray(product.modifierGroups)
            ? {
                  modifierGroups: toStorefrontModifierGroups(
                      product.modifierGroups as Record<string, unknown>[],
                      locale,
                  ),
              }
            : {}),
        ...(typeof product.hasModifiers === "boolean"
            ? { hasModifiers: product.hasModifiers }
            : Array.isArray(product.modifierGroups)
              ? { hasModifiers: product.modifierGroups.length > 0 }
              : {}),
    };
}

export function toStorefrontProducts(
    products: readonly Record<string, unknown>[],
    locale: string,
): StorefrontProduct[] {
    return products.map((p) => toStorefrontProduct(p, locale));
}

export function resolveRequestLocale(
    request: Request,
    fallback: StoreLocale = DEFAULT_STORE_LOCALE,
): StoreLocale {
    const url = new URL(request.url);
    const fromQuery = url.searchParams.get("locale");
    if (fromQuery && STORE_LOCALES.includes(fromQuery as StoreLocale)) {
        return fromQuery as StoreLocale;
    }
    return fallback;
}

export function parseLocalizedJson(
    value: unknown,
    fallback = "",
): LocalizedJson {
    if (isLocalizedJson(value)) {
        return {
            hy: value.hy ?? fallback,
            ru: value.ru ?? fallback,
            en: value.en ?? fallback,
        };
    }
    if (typeof value === "string") {
        return { hy: value, ru: value, en: value };
    }
    return emptyLocalizedJson();
}
