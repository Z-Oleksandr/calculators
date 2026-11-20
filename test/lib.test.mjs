import { test } from "node:test";
import assert from "node:assert/strict";

import * as dates from "../src/script/lib/dates.js";
import * as eggs from "../src/script/lib/eggs.js";
import * as timer from "../src/script/lib/eggTimer.js";
import * as money from "../src/script/lib/money.js";

const d = (iso) => dates.parseISODate(iso);

test("parseISODate accepts real dates and rejects junk", () => {
    assert.equal(d("1970-01-01"), 0);
    assert.equal(d("2026-11-15"), 20772);
    assert.equal(dates.toISODate(d("2024-02-29")), "2024-02-29");
    for (const bad of ["2023-02-29", "2026-13-01", "2026-1-1", "", "x", null]) {
        assert.equal(d(bad), null, String(bad));
    }
});

test("weekday is timezone independent", () => {
    const SUNDAY = 0;
    const MONDAY = 1;
    const WEDNESDAY = 3;
    assert.equal(dates.weekday(d("2026-11-15")), SUNDAY);
    assert.equal(dates.weekday(d("2026-11-16")), MONDAY);
    assert.equal(dates.weekday(d("1969-12-31")), WEDNESDAY);
});

test("today uses the local calendar date", () => {
    const lateEvening = new Date(2026, 10, 15, 23, 59);
    const earlyMorning = new Date(2026, 10, 16, 0, 1);
    assert.equal(dates.today(lateEvening), d("2026-11-15"));
    assert.equal(dates.today(earlyMorning), d("2026-11-16"));
});

test("day counts are inclusive", () => {
    assert.equal(dates.daysInclusive(d("2026-11-01"), d("2026-11-10")), 10);
    assert.equal(dates.daysInclusive(d("2026-11-01"), d("2026-11-01")), 1);
});

test("countWeekdays matches a brute-force count", () => {
    const start = d("2026-01-01");
    for (const len of [0, 1, 5, 6, 7, 8, 13, 14, 30, 365, 1000]) {
        for (const days of [[1, 2, 3, 4, 5], [0, 6], [3], []]) {
            let expected = 0;
            for (let x = start; x <= start + len; x++) {
                if (days.includes(dates.weekday(x))) expected++;
            }
            assert.equal(
                dates.countWeekdays(start, start + len, days),
                expected,
            );
        }
    }
    assert.equal(dates.countWeekdays(10, 5, [1]), 0);
});

test("countDaysOnWeekdays dedupes and respects range", () => {
    const mon = d("2026-11-16");
    const sat = d("2026-11-21");
    const days = [mon, mon, sat, d("2027-01-04")];
    assert.equal(dates.countDaysOnWeekdays(days, mon, sat, [1, 2, 3, 4, 5]), 1);
});

test("yearsInRange", () => {
    assert.deepEqual(
        dates.yearsInRange(d("2025-12-31"), d("2027-01-01")),
        [2025, 2026, 2027],
    );
});

test("addMonths clamps to month end", () => {
    assert.equal(dates.addMonths(d("2026-01-31"), 1), d("2026-02-28"));
    assert.equal(dates.addMonths(d("2026-12-15"), 1), d("2027-01-15"));
});

test("calendarDiff borrows months correctly", () => {
    assert.deepEqual(dates.calendarDiff(d("1990-05-20"), d("2026-11-15")), {
        years: 36,
        months: 5,
        days: 26,
    });
    assert.deepEqual(dates.calendarDiff(d("2026-01-31"), d("2026-03-01")), {
        years: 0,
        months: 1,
        days: 1,
    });
    assert.deepEqual(dates.calendarDiff(d("2000-02-29"), d("2001-02-28")), {
        years: 0,
        months: 11,
        days: 30,
    });
    assert.deepEqual(dates.calendarDiff(d("2026-11-15"), d("2026-11-15")), {
        years: 0,
        months: 0,
        days: 0,
    });
});

test("nextAnniversary handles leap birthdays", () => {
    assert.equal(
        dates.nextAnniversary(d("2000-02-29"), d("2026-01-01")),
        d("2026-02-28"),
    );
    assert.equal(
        dates.nextAnniversary(d("2000-05-20"), d("2026-05-20")),
        d("2026-05-20"),
    );
    assert.equal(
        dates.nextAnniversary(d("2000-05-20"), d("2026-05-21")),
        d("2027-05-20"),
    );
});

test("egg stats", () => {
    const s = eggs.eggStats(100, 0.3);
    assert.equal(s.massKg, 5.8);
    assert.equal(s.cartons, 10);
    assert.ok(Math.abs(s.cost - 30) < 1e-9);
    assert.equal(eggs.eggStats(5).cost, null);
    assert.equal(eggs.hensNeeded(2), (2 * 365) / 300);
    assert.equal(eggs.lifetimeEggs(1, 80), null);
    assert.equal(eggs.lifetimeEggs(1, 79), 365);
});

test("boil times match the calibration and react to inputs", () => {
    const base = { size: "M", start: "fridge", altitude: 0 };
    const runny = timer.boilSeconds({ ...base, doneness: "runny" });
    const soft = timer.boilSeconds({ ...base, doneness: "soft" });
    const hard = timer.boilSeconds({ ...base, doneness: "hard" });
    assert.ok(Math.abs(runny - 360) <= 10, `runny=${runny}`);
    assert.ok(Math.abs(soft - 420) <= 10, `soft=${soft}`);
    assert.ok(Math.abs(hard - 600) <= 10, `hard=${hard}`);
    assert.ok(
        timer.boilSeconds({ ...base, doneness: "soft", start: "room" }) < soft,
    );
    assert.ok(
        timer.boilSeconds({ ...base, doneness: "soft", size: "XL" }) > soft,
    );
    assert.ok(
        timer.boilSeconds({ ...base, doneness: "soft", altitude: 2000 }) > soft,
    );
    assert.ok(
        timer.boilSeconds({ ...base, doneness: "soft", altitude: 5000 }) > soft,
    );
    assert.equal(
        timer.boilSeconds({ ...base, doneness: "hard", altitude: 5000 }),
        null,
    );
    assert.equal(
        timer.boilSeconds({ ...base, doneness: "soft", altitude: 5001 }),
        null,
    );
    assert.equal(
        timer.boilSeconds({ ...base, doneness: "soft", altitude: -1 }),
        null,
    );
    assert.equal(timer.boilSeconds({ ...base, doneness: "nope" }), null);
    assert.equal(timer.formatClock(425), "7:05");
    assert.equal(timer.formatClock(-3), "0:00");
});

test("splitBill works in cents", () => {
    const r = money.splitBill({ amount: 100, tipPercent: 10, people: 3 });
    assert.equal(r.total, 11000);
    assert.equal(r.share, 3667);
    assert.equal(r.extra, 1);
    const up = money.splitBill({
        amount: 100,
        tipPercent: 10,
        people: 3,
        roundUp: true,
    });
    assert.equal(up.share, 3700);
    assert.equal(up.extra, 100);
    assert.equal(
        money.splitBill({ amount: 0.1, tipPercent: 0, people: 1 }).total,
        10,
    );
});

test("comparePizzas finds the best value", () => {
    const { rows, best } = money.comparePizzas([
        { diameter: 30, price: 10 },
        { diameter: 40, price: 15 },
    ]);
    assert.equal(best, 1);
    assert.ok(Math.abs(rows[0].area - 706.858) < 0.01);
});
