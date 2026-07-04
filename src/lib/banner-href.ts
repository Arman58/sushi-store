/**
 * Валидация «ссылки при клике» для промо-баннера.
 *
 * Семантика: это НЕ место показа баннера (он всегда в промо-карусели на
 * главной), а адрес перехода по клику. Допустимо:
 *  - пусто → баннер без ссылки (не кликабелен), нормализуется в null;
 *  - внутренний путь, начинающийся с "/" (например /menu?category=sets);
 *  - внешний абсолютный адрес http(s):// (откроется в новой вкладке).
 * Запрещено: служебные разделы (/admin, /api), протокол-относительные "//",
 * произвольные строки без схемы/слэша, прочие схемы (javascript: и т.п.).
 */

export type BannerHrefError = "format" | "forbidden";

export type BannerHrefResult =
    | { ok: true; value: string | null }
    | { ok: false; code: BannerHrefError };

/** Внутренние префиксы, недоступные для баннера. */
const FORBIDDEN_PREFIXES = ["/admin", "/api"] as const;

export function validateBannerHref(
    raw: string | null | undefined,
): BannerHrefResult {
    const v = (raw ?? "").trim();

    // Пусто — валидно, баннер просто не кликабелен.
    if (!v) return { ok: true, value: null };

    // Внешний абсолютный адрес.
    if (/^https?:\/\//i.test(v)) {
        try {
            new URL(v);
            return { ok: true, value: v };
        } catch {
            return { ok: false, code: "format" };
        }
    }

    // Протокол-относительный адрес ("//host") — небезопасно, запрещаем.
    if (v.startsWith("//")) return { ok: false, code: "format" };

    // Внутренний путь.
    if (!v.startsWith("/")) return { ok: false, code: "format" };

    const path = v.split(/[?#]/, 1)[0];
    const forbidden = FORBIDDEN_PREFIXES.some(
        (p) => path === p || path.startsWith(`${p}/`),
    );
    if (forbidden) return { ok: false, code: "forbidden" };

    return { ok: true, value: v };
}
