import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { buildScheduleSlots } from "@/features/checkout/model/schedule-slots";
import { STORE_TIMEZONE } from "@/lib/order-status";
import {
    isValidScheduleSlot,
    SCHEDULE_MIN_LEAD_MINUTES,
} from "@/lib/site-config";

const HOUR = 3_600_000;

/** Полдень по Еревану (UTC+4) - кухня открыта. */
const yerevanNoon = new Date("2026-07-04T12:00:00+04:00");

function yerevanTimeLabel(iso: string): string {
    const parts = new Intl.DateTimeFormat("en-GB", {
        timeZone: STORE_TIMEZONE,
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
    }).formatToParts(new Date(iso));
    const hour = parts.find((p) => p.type === "hour")?.value ?? "00";
    const minute = parts.find((p) => p.type === "minute")?.value ?? "00";
    return `${hour}:${minute}`;
}

describe("isValidScheduleSlot", () => {
    it("слот раньше минимального запаса отклоняется", () => {
        const at = new Date(
            yerevanNoon.getTime() + (SCHEDULE_MIN_LEAD_MINUTES - 5) * 60_000,
        );
        assert.equal(isValidScheduleSlot(at, yerevanNoon), false);
    });

    it("валидный слот в рабочие часы проходит", () => {
        const at = new Date("2026-07-04T19:00:00+04:00");
        assert.equal(isValidScheduleSlot(at, yerevanNoon), true);
    });

    it("ночное время (кухня закрыта) отклоняется", () => {
        const at = new Date("2026-07-05T03:00:00+04:00");
        assert.equal(isValidScheduleSlot(at, yerevanNoon), false);
    });

    it("дальше горизонта 48ч отклоняется", () => {
        const at = new Date(yerevanNoon.getTime() + 72 * HOUR);
        assert.equal(isValidScheduleSlot(at, yerevanNoon), false);
    });

    it("завтра днём - валидно", () => {
        const at = new Date("2026-07-05T13:00:00+04:00");
        assert.equal(isValidScheduleSlot(at, yerevanNoon), true);
    });
});

describe("buildScheduleSlots", () => {
    it("слоты идут с шагом 30 минут и в будущем", () => {
        const now = new Date();
        const slots = buildScheduleSlots(now);
        for (const s of slots) {
            const t = new Date(s.value).getTime();
            assert.ok(
                t >= now.getTime() + SCHEDULE_MIN_LEAD_MINUTES * 60_000 - 30 * 60_000,
            );
            assert.equal(t % (30 * 60_000), 0, "кратно 30 мин");
        }
    });

    it("есть слоты на сегодня и/или завтра, помечены днём", () => {
        const slots = buildScheduleSlots();
        assert.ok(slots.length > 0);
        assert.ok(slots.every((s) => s.day === "today" || s.day === "tomorrow"));
        assert.ok(slots.some((s) => s.day === "tomorrow"));
    });

    it("метка времени соответствует Asia/Yerevan", () => {
        const slots = buildScheduleSlots();
        const s = slots[0];
        assert.equal(s.time, yerevanTimeLabel(s.value));
    });
});

describe("getExpectedArrivalTime", () => {
    it("сейчас + 60 мин, округление вверх до 5 минут", async () => {
        const { getExpectedArrivalTime, DELIVERY_ETA } = await import(
            "@/lib/site-config"
        );
        const now = new Date("2026-07-04T18:03:00+04:00");
        const at = getExpectedArrivalTime(now);
        const diffMin = (at.getTime() - now.getTime()) / 60_000;
        assert.ok(diffMin >= DELIVERY_ETA.maxMinutes);
        assert.ok(diffMin < DELIVERY_ETA.maxMinutes + 5);
        assert.equal(at.getTime() % (5 * 60_000), 0, "кратно 5 минутам");
    });
});
