/**
 * Нормализация телефона для авторизации и связки User.phone.
 *
 * Принимаем любые форматы (+374, 8 цифр, с пробелами/скобками) и приводим к
 * каноничному E.164 без «+»: для Армении это 11 цифр, начинающихся с 374.
 *
 * Возвращает пустую строку, если ввод не распознан как валидный армянский номер.
 */
export function normalizePhoneToE164Digits(input: string): string {
    if (!input) return "";

    const digits = input.replace(/\D/g, "");
    if (digits.length === 0) return "";

    // 8 цифр без префикса страны → армянский локальный номер
    if (digits.length === 8) {
        return `374${digits}`;
    }

    // 11 цифр и начинается с 374 - уже E.164 без «+»
    if (digits.length === 11 && digits.startsWith("374")) {
        return digits;
    }

    return "";
}

/** Человекочитаемый формат для UI: +374 (XX) XX-XX-XX. */
export function formatPhoneForDisplay(phoneE164Digits: string): string {
    const digits = phoneE164Digits.replace(/\D/g, "");
    if (digits.length !== 11 || !digits.startsWith("374")) return phoneE164Digits;
    const rest = digits.slice(3);
    return `+374 (${rest.slice(0, 2)}) ${rest.slice(2, 4)}-${rest.slice(4, 6)}-${rest.slice(6, 8)}`;
}
