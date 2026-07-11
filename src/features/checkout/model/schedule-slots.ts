import { STORE_TIMEZONE } from "@/lib/order-status";
import {
    OPENING_HOURS,
    SCHEDULE_MIN_LEAD_MINUTES,
} from "@/lib/site-config";

export type ScheduleSlot = {
    /** ISO-строка для payload. */
    value: string;
    /** «19:30» — по часам кухни (Asia/Yerevan). */
    time: string;
    day: "today" | "tomorrow";
};

const STEP_MS = 30 * 60_000;
const YEREVAN_OFFSET = "+04:00";

type YerevanDateParts = {
    year: number;
    month: number;
    day: number;
    hour: number;
    minute: number;
};

function parseHm(hm: string): [number, number] {
    const [h, m] = hm.split(":").map(Number);
    return [h, m];
}

function getYerevanParts(date: Date): YerevanDateParts {
    const parts = new Intl.DateTimeFormat("en-GB", {
        timeZone: STORE_TIMEZONE,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
    }).formatToParts(date);

    const get = (type: Intl.DateTimeFormatPartTypes) =>
        Number(parts.find((p) => p.type === type)?.value ?? 0);

    return {
        year: get("year"),
        month: get("month"),
        day: get("day"),
        hour: get("hour"),
        minute: get("minute"),
    };
}

function yerevanLocalToDate(parts: {
    year: number;
    month: number;
    day: number;
    hour: number;
    minute: number;
}): Date {
    const pad = (n: number) => String(n).padStart(2, "0");
    return new Date(
        `${parts.year}-${pad(parts.month)}-${pad(parts.day)}T${pad(parts.hour)}:${pad(parts.minute)}:00${YEREVAN_OFFSET}`,
    );
}

function yerevanCalendarPlusDays(
    base: YerevanDateParts,
    dayOffset: number,
): Pick<YerevanDateParts, "year" | "month" | "day"> {
    const anchor = yerevanLocalToDate({
        ...base,
        hour: 12,
        minute: 0,
    });
    anchor.setTime(anchor.getTime() + dayOffset * 24 * 60 * 60_000);
    const shifted = getYerevanParts(anchor);
    return {
        year: shifted.year,
        month: shifted.month,
        day: shifted.day,
    };
}

/**
 * Слоты предзаказа с шагом 30 минут на сегодня и завтра,
 * внутри рабочих часов и с запасом на готовку.
 * Времена считаются в Asia/Yerevan — как на сервере (isValidScheduleSlot).
 */
export function buildScheduleSlots(now = new Date()): ScheduleSlot[] {
    const slots: ScheduleSlot[] = [];
    const nowParts = getYerevanParts(now);
    const [openH, openM] = parseHm(OPENING_HOURS.opens);
    const closesMinutes =
        OPENING_HOURS.closes === "00:00"
            ? 24 * 60
            : (() => {
                  const [h, m] = parseHm(OPENING_HOURS.closes);
                  return h * 60 + m;
              })();
    const earliestAllowed = now.getTime() + SCHEDULE_MIN_LEAD_MINUTES * 60_000;

    for (const dayOffset of [0, 1] as const) {
        const { year, month, day } = yerevanCalendarPlusDays(nowParts, dayOffset);

        const open = yerevanLocalToDate({
            year,
            month,
            day,
            hour: openH,
            minute: openM,
        });
        const close = yerevanLocalToDate({
            year,
            month,
            day,
            hour: Math.floor(closesMinutes / 60) % 24,
            minute: closesMinutes % 60,
        });
        if (OPENING_HOURS.closes === "00:00") {
            close.setTime(
                yerevanLocalToDate({ year, month, day, hour: 0, minute: 0 }).getTime() +
                    24 * 60 * 60_000,
            );
        }

        let t = Math.max(open.getTime(), earliestAllowed);
        t = Math.ceil(t / STEP_MS) * STEP_MS;

        for (; t <= close.getTime() - STEP_MS; t += STEP_MS) {
            const dt = new Date(t);
            const parts = getYerevanParts(dt);
            const hh = String(parts.hour).padStart(2, "0");
            const mm = String(parts.minute).padStart(2, "0");
            slots.push({
                value: dt.toISOString(),
                time: `${hh}:${mm}`,
                day: dayOffset === 0 ? "today" : "tomorrow",
            });
        }
    }

    return slots;
}
