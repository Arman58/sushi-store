/**
 * Начало календарных суток в заданном часовом поясе (по умолчанию - магазина) как
 * момент времени UTC.
 *
 * Фильтр "сегодня" в админке считался от полуночи по времени СЕРВЕРА (на Vercel - UTC),
 * поэтому в Ереване (UTC+4) "сегодня" начиналось в 04:00, а ночные заказы попадали во
 * "вчера". Здесь учитывается и смещение пояса, и переход на летнее время.
 */
function zonedParts(at: Date, timeZone: string) {
    const parts = new Intl.DateTimeFormat("en-US", {
        timeZone,
        hourCycle: "h23",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
    }).formatToParts(at);
    const get = (type: string) => Number(parts.find((p) => p.type === type)?.value);
    return {
        year: get("year"),
        month: get("month"),
        day: get("day"),
        hour: get("hour"),
        minute: get("minute"),
        second: get("second"),
    };
}

/** Смещение пояса от UTC в мс на момент `at` (Ереван: +4 ч = 14_400_000). */
function zoneOffsetMs(at: Date, timeZone: string): number {
    const p = zonedParts(at, timeZone);
    const asIfUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
    return asIfUtc - Math.floor(at.getTime() / 1000) * 1000;
}

export function getStartOfDayInTimezone(timeZone: string, now: Date = new Date()): Date {
    const { year, month, day } = zonedParts(now, timeZone);
    const localMidnightAsUtc = Date.UTC(year, month - 1, day, 0, 0, 0);

    // Смещение берём в районе самой полуночи, а не "сейчас": так день перехода на
    // летнее время тоже считается верно. Второй проход уточняет первое приближение.
    let result = localMidnightAsUtc - zoneOffsetMs(new Date(localMidnightAsUtc), timeZone);
    result = localMidnightAsUtc - zoneOffsetMs(new Date(result), timeZone);
    return new Date(result);
}
