import {
    OPENING_HOURS,
    SCHEDULE_MIN_LEAD_MINUTES,
} from "@/lib/site-config";

export type ScheduleSlot = {
    /** ISO-строка для payload. */
    value: string;
    /** «19:30» — локальное время устройства (аудитория — Армения). */
    time: string;
    day: "today" | "tomorrow";
};

const STEP_MS = 30 * 60_000;

function parseHm(hm: string): [number, number] {
    const [h, m] = hm.split(":").map(Number);
    return [h, m];
}

/**
 * Слоты предзаказа с шагом 30 минут на сегодня и завтра,
 * внутри рабочих часов и с запасом на готовку.
 * Времена считаются по часам устройства: доставка локальная (Нор Ачн).
 */
export function buildScheduleSlots(now = new Date()): ScheduleSlot[] {
    const slots: ScheduleSlot[] = [];
    const [openH, openM] = parseHm(OPENING_HOURS.opens);
    const closesMinutes =
        OPENING_HOURS.closes === "00:00"
            ? 24 * 60
            : (() => {
                  const [h, m] = parseHm(OPENING_HOURS.closes);
                  return h * 60 + m;
              })();
    const earliestAllowed =
        now.getTime() + SCHEDULE_MIN_LEAD_MINUTES * 60_000;

    for (const dayOffset of [0, 1] as const) {
        const day = new Date(now);
        day.setDate(day.getDate() + dayOffset);

        const open = new Date(day);
        open.setHours(openH, openM, 0, 0);
        const close = new Date(day);
        close.setHours(0, closesMinutes, 0, 0);

        let t = Math.max(open.getTime(), earliestAllowed);
        t = Math.ceil(t / STEP_MS) * STEP_MS;

        // Последний слот — за 30 минут до закрытия.
        for (; t <= close.getTime() - STEP_MS; t += STEP_MS) {
            const dt = new Date(t);
            const hh = String(dt.getHours()).padStart(2, "0");
            const mm = String(dt.getMinutes()).padStart(2, "0");
            slots.push({
                value: dt.toISOString(),
                time: `${hh}:${mm}`,
                day: dayOffset === 0 ? "today" : "tomorrow",
            });
        }
    }

    return slots;
}
