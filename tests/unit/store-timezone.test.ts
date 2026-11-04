import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { getStartOfDayInTimezone } from "@/lib/store-timezone";

const iso = (d: Date) => d.toISOString();

describe("getStartOfDayInTimezone (Asia/Yerevan, UTC+4, без перехода на летнее время)", () => {
    const tz = "Asia/Yerevan";

    it("днём: полночь этого дня по Еревану = 20:00 UTC предыдущего дня", () => {
        assert.equal(iso(getStartOfDayInTimezone(tz, new Date("2026-11-05T10:00:00Z"))), "2026-11-04T20:00:00.000Z");
    });

    it("после полуночи по Еревану, но ещё вчера по UTC: это уже НОВЫЙ день", () => {
        // 21:30 UTC = 01:30 5 ноября по Еревану. Старый код (UTC) считал бы это 4 ноября.
        assert.equal(iso(getStartOfDayInTimezone(tz, new Date("2026-11-04T21:30:00Z"))), "2026-11-04T20:00:00.000Z");
    });

    it("за минуту до полуночи по Еревану день ещё не сменился", () => {
        assert.equal(iso(getStartOfDayInTimezone(tz, new Date("2026-11-04T19:59:00Z"))), "2026-11-03T20:00:00.000Z");
    });

    it("точно в полночь день начинается", () => {
        assert.equal(iso(getStartOfDayInTimezone(tz, new Date("2026-11-04T20:00:00Z"))), "2026-11-04T20:00:00.000Z");
    });
});

describe("getStartOfDayInTimezone (пояс с переходом на летнее время)", () => {
    it("America/New_York в день перехода на летнее время (8 марта 2026)", () => {
        // Полночь ещё EST (UTC-5) = 05:00 UTC; в 02:00 часы переводятся на EDT.
        assert.equal(
            iso(getStartOfDayInTimezone("America/New_York", new Date("2026-03-08T16:00:00Z"))),
            "2026-03-08T05:00:00.000Z",
        );
    });

    it("America/New_York летом (UTC-4) и зимой (UTC-5)", () => {
        assert.equal(
            iso(getStartOfDayInTimezone("America/New_York", new Date("2026-07-15T12:00:00Z"))),
            "2026-07-15T04:00:00.000Z",
        );
        assert.equal(
            iso(getStartOfDayInTimezone("America/New_York", new Date("2026-01-15T12:00:00Z"))),
            "2026-01-15T05:00:00.000Z",
        );
    });

    it("UTC возвращает полночь UTC", () => {
        assert.equal(iso(getStartOfDayInTimezone("UTC", new Date("2026-11-05T13:45:10Z"))), "2026-11-05T00:00:00.000Z");
    });
});
