/** Начало ячейки, которое Excel/Sheets/LibreOffice воспринимают как формулу. */
const FORMULA_START = /^[=+\-@\t\r]/;

/** Обычное число или телефон ("+37499123456", "-5", "(374) 99-12-34"): формулой быть не может. */
const PLAIN_NUMBER_OR_PHONE = /^[+-]?[\d\s().-]+$/;

/**
 * Одна ячейка CSV.
 *
 * 1) Защита от CSV/formula injection. Имя клиента вида `=HYPERLINK("http://evil","x")`
 *    при открытии экспорта в Excel исполнялось бы как формула у администратора. Такие
 *    значения получают ведущий апостроф (рекомендация OWASP), но телефоны и числа
 *    (`+374...`) оставляем как есть - иначе в таблице они бы портились.
 * 2) Кавычки/запятые/переводы строк оборачиваются в двойные кавычки по RFC 4180.
 */
export function escapeCsvCell(value: string | number | null | undefined): string {
    let text = (value ?? "").toString();

    if (FORMULA_START.test(text) && !PLAIN_NUMBER_OR_PHONE.test(text)) {
        text = `'${text}`;
    }

    if (/[",\r\n]/.test(text)) {
        text = `"${text.replace(/"/g, '""')}"`;
    }
    return text;
}

export function toCsvRow(cells: Array<string | number | null | undefined>): string {
    return cells.map(escapeCsvCell).join(",");
}
