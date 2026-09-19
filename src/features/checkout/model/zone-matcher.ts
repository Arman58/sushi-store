import type { DeliveryZoneOption } from "./types";

/**
 * Нормализует строку для нечувствительного к регистру и пунктуации сравнения.
 */
function normalizeForMatching(text: string): string {
    return text
        .toLowerCase()
        .replace(/[\.,\/#!$%\^&\*;:{}=\-_`~()\[\]"']/g, " ")
        .replace(/\s+/g, " ")
        .trim();
}

/**
 * Очищает название зоны от скобок с ценой, например:
 * «Нор Гехи (от 700 до 1200 ֏)» → «Нор Гехи»
 */
function stripZoneParentheses(name: string): string {
    return name.replace(/\(.*?\)/g, "").trim();
}

/**
 * Умное сопоставление введенного адреса с доступными зонами доставки.
 * Проверяет названия зон на всех языках и псевдонимы (aliases).
 * Сортирует ключевые фразы по длине (descending), чтобы составные имена
 * («Нор Гехи», «Нор Ачин») имели приоритет над одиночными словами.
 */
export function matchAddressToDeliveryZone(
    address: string | undefined | null,
    zones: DeliveryZoneOption[],
): DeliveryZoneOption | null {
    if (!address || !zones || zones.length === 0) return null;

    const normalizedAddress = normalizeForMatching(address);
    if (!normalizedAddress || normalizedAddress.length < 3) return null;

    // Собираем кандидаты для сопоставления: { keyword, zone }
    const candidates: { keyword: string; zone: DeliveryZoneOption }[] = [];

    for (const zone of zones) {
        // Пропускаем зону «Другие города / уточнение по звонку» для прямого автосовпадения по улице,
        // если явно не введено ключевое слово «другие города»
        const isOtherZone = Boolean(zone.requiresManagerApproval);

        const keywords = new Set<string>();

        const cleanName = stripZoneParentheses(zone.name);
        if (cleanName) keywords.add(cleanName);

        if (zone.aliases && Array.isArray(zone.aliases)) {
            for (const alias of zone.aliases) {
                const cleanAlias = stripZoneParentheses(alias);
                if (cleanAlias) keywords.add(cleanAlias);
            }
        }

        for (const kw of keywords) {
            const normalizedKw = normalizeForMatching(kw);
            // Игнорируем слишком короткие слова (< 3 символов), чтобы избежать ложных срабатываний
            if (normalizedKw.length >= 3) {
                // Если это зона других городов, добавляем только если пользователь явно написал «другие города»
                if (isOtherZone) {
                    if (
                        normalizedKw.includes("друг") ||
                        normalizedKw.includes("այլ") ||
                        normalizedKw.includes("other")
                    ) {
                        candidates.push({ keyword: normalizedKw, zone });
                    }
                } else {
                    candidates.push({ keyword: normalizedKw, zone });
                }
            }
        }
    }

    // Сортируем от самых длинных фраз к самым коротким
    candidates.sort((a, b) => b.keyword.length - a.keyword.length);

    // Ищем первое и самое точное совпадение в адресе
    for (const { keyword, zone } of candidates) {
        // Проверяем как подстроку или по границам слов
        const regex = new RegExp(
            `(^|\\s)${keyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(\\s|$)`,
            "i",
        );
        if (regex.test(normalizedAddress) || normalizedAddress.includes(keyword)) {
            return zone;
        }
    }

    return null;
}
