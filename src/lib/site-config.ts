/** Публичные контакты и URL витрины — единый источник для SEO, JSON-LD и UI. */
export const SITE_URL = (
    process.env.NEXT_PUBLIC_SITE_URL ??
    process.env.NEXTAUTH_URL ??
    ""
).replace(/\/$/, "");

export const SITE_NAME = "East West Delivery";

/** E.164 для tel: и schema.org; переопределяется через NEXT_PUBLIC_CONTACT_PHONE в .env */
export const CONTACT_PHONE =
    process.env.NEXT_PUBLIC_CONTACT_PHONE ?? "+37477774849";

export const CONTACT_PHONE_DISPLAY =
    process.env.NEXT_PUBLIC_CONTACT_PHONE_DISPLAY ?? "+374 77 77 48 49";

export const KITCHEN_ADDRESS = {
    street: "ул. Чаренца 19",
    locality: "Нор Ачин",
    region: "Котайк",
    country: "AM",
    /** Полная строка для UI */
    full: "Нор Ачин, ул. Чаренца 19, Котайк, Армения",
    /** Кратко — как на чекауте при самовывозе */
    pickup: "Нор Ачин, ул. Чаренца 19",
} as const;

export const OPENING_HOURS = {
    /** Для UI */
    label: "Ежедневно 12:00 - 00:00",
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
    // 00:00 — полночь (конец рабочего дня)
    const closes =
        OPENING_HOURS.closes === "00:00" ? 24 * 60 : parseHm(OPENING_HOURS.closes);
    return current >= opens && current < closes;
}

/** Бейдж в Hero: «Открыто до …» или «Откроемся в …». */
export function getOpeningHoursBadge(now = new Date()): string {
    return isStoreOpen(now)
        ? `Открыто до ${OPENING_HOURS.closes === "00:00" ? "00:00" : OPENING_HOURS.closes}`
        : `Откроемся в ${OPENING_HOURS.opens}`;
}

export const SERVES_CUISINE = [
    "Суши",
    "Пицца",
    "Шаурма",
    "Японская",
    "Итальянская",
] as const;

export const DEFAULT_OG_IMAGE = "/og-image.png";
