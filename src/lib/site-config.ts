/** Публичные контакты и URL витрины - единый источник для SEO, JSON-LD и UI. */
function normalizeSiteUrl(raw: string): string {
    const trimmed = raw.replace(/\/$/, "");
    if (!trimmed) return "";
    try {
        const url = new URL(trimmed);
        if (url.hostname === "eastwestnh.com") {
            url.hostname = "www.eastwestnh.com";
        }
        return url.origin;
    } catch {
        return trimmed;
    }
}

function resolveSiteUrlRaw(): string {
    return (
        process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
        process.env.NEXTAUTH_URL?.trim() ||
        (process.env.VERCEL_URL
            ? `https://${process.env.VERCEL_URL}`
            : "http://localhost:3000")
    );
}

/** Канонический origin витрины: prod → NEXT_PUBLIC_SITE_URL, Preview → VERCEL_URL. */
export const SITE_URL = normalizeSiteUrl(resolveSiteUrlRaw());

export function getSiteUrl(): string {
    return SITE_URL;
}

export const SITE_NAME = "East West Delivery";

/** E.164 для tel: и schema.org; переопределяется через NEXT_PUBLIC_CONTACT_PHONE в .env */
export const CONTACT_PHONE =
    process.env.NEXT_PUBLIC_CONTACT_PHONE ?? "+37477774849";

export const CONTACT_PHONE_DISPLAY =
    process.env.NEXT_PUBLIC_CONTACT_PHONE_DISPLAY ?? "+374 77 77 48 49";

/** Структурные поля для JSON-LD; UI-строки адреса - в messages (common.address). */
export const KITCHEN_ADDRESS = {
    street: "19 Charents St.",
    locality: "Nor Hachn",
    region: "Kotayk",
    country: "AM",
} as const;

export const OPENING_HOURS = {
    /** schema.org OpeningHoursSpecification / openingHours text */
    schema: "Mo-Su 12:00-00:00",
    opens: "12:00",
    closes: "00:00",
    days: [
        "Monday",
        "Tuesday",
        "Wednesday",
        "Thursday",
        "Friday",
        "Saturday",
        "Sunday",
    ] as const,
} as const;

const STORE_TIMEZONE = "Asia/Yerevan";

function parseHm(hm: string): number {
    const [h, m] = hm.split(":").map(Number);
    return h * 60 + m;
}

function getStoreClockMinutes(now: Date): number {
    const parts = new Intl.DateTimeFormat("en-GB", {
        timeZone: STORE_TIMEZONE,
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
    }).formatToParts(now);
    const hour = Number(parts.find((p) => p.type === "hour")?.value ?? 0);
    const minute = Number(parts.find((p) => p.type === "minute")?.value ?? 0);
    return hour * 60 + minute;
}

export function isStoreOpen(now = new Date()): boolean {
    const current = getStoreClockMinutes(now);
    const opens = parseHm(OPENING_HOURS.opens);
    // 00:00 - полночь (конец рабочего дня)
    const closes =
        OPENING_HOURS.closes === "00:00" ? 24 * 60 : parseHm(OPENING_HOURS.closes);
    return current >= opens && current < closes;
}

/**
 * Обещание времени доставки — единый источник для всех текстов UI.
 * Реальный ETA конкретного заказа задаёт кухня после оформления.
 */
export const DELIVERY_ETA = { minMinutes: 45, maxMinutes: 60 } as const;

/**
 * «Привезём к HH:MM»: сейчас + максимум обещания, округление вверх до 5 минут.
 * Under-promise: показываем верхнюю границу — приехать раньше приятно.
 */
export function getExpectedArrivalTime(now = new Date()): Date {
    const step = 5 * 60_000;
    const t = now.getTime() + DELIVERY_ETA.maxMinutes * 60_000;
    return new Date(Math.ceil(t / step) * step);
}

/** Минимальный запас до предзаказа (кухне нужно время). */
export const SCHEDULE_MIN_LEAD_MINUTES = 60;
/** Горизонт предзаказа. */
export const SCHEDULE_MAX_AHEAD_HOURS = 48;

/** Попадает ли конкретный момент в рабочие часы (Asia/Yerevan). */
export function isWithinOpeningHours(at: Date): boolean {
    const minutes = getStoreClockMinutes(at);
    const opens = parseHm(OPENING_HOURS.opens);
    const closes =
        OPENING_HOURS.closes === "00:00" ? 24 * 60 : parseHm(OPENING_HOURS.closes);
    return minutes >= opens && minutes < closes;
}

/** Валидация времени предзаказа: будущее с запасом, в горизонте и в рабочие часы. */
export function isValidScheduleSlot(at: Date, now = new Date()): boolean {
    const diffMs = at.getTime() - now.getTime();
    if (diffMs < SCHEDULE_MIN_LEAD_MINUTES * 60_000) return false;
    if (diffMs > SCHEDULE_MAX_AHEAD_HOURS * 3_600_000) return false;
    return isWithinOpeningHours(at);
}

/** Состояние для Hero-бейджа; текст - через common.hours в i18n. */
export function getOpeningHoursState(now = new Date()): {
    isOpen: boolean;
    time: string;
} {
    const time = isStoreOpen(now)
        ? OPENING_HOURS.closes === "00:00"
            ? "00:00"
            : OPENING_HOURS.closes
        : OPENING_HOURS.opens;
    return { isOpen: isStoreOpen(now), time };
}

export const SERVES_CUISINE = [
    "Суши",
    "Пицца",
    "Шаурма",
    "Японская",
    "Итальянская",
] as const;

export const DEFAULT_OG_IMAGE = "/og-image.png";

/** Локальный логотип в public/ — регистр пути должен совпадать с файлом (Linux/Vercel). */
export const SITE_LOGO_PATH = "/east-west-logo.png";
