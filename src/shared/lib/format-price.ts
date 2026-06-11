/**
 * Единый формат цен на витрине.
 * Фиксированная локаль — иначе Node (SSR) и браузер по-разному форматируют `hy`
 * и ломают гидратацию (3,500 vs 3 500).
 */
export const STORE_PRICE_LOCALE = "ru-RU" as const;

/** Для компонентов, которым нужен `Intl.NumberFormat` (модификаторы и т.п.). */
export const storePriceFormatter = new Intl.NumberFormat(STORE_PRICE_LOCALE);

export function formatStorePrice(value: number): string {
    return storePriceFormatter.format(value);
}
