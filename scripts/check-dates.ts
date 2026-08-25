/**
 * Regression net for src/lib/date.ts.
 *
 *   npm run check:dates
 *
 * The DST assertions at the bottom are the point of this file: getting the
 * Lisbon offset wrong shifts every summer booking by an hour, and nothing else
 * in the system would notice.
 */

import {
  addDays,
  addMonths,
  daysInMonth,
  dayOfWeek,
  formatDateHuman,
  isBetween,
  isLeapYear,
  isoDate,
  mondayIndex,
  monthKey,
  parseISO,
  todayInLisbon,
  zonedInstant,
} from "../src/lib/date";

let failures = 0;
function check(label: string, actual: unknown, expected: unknown) {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a === e) return;
  console.error(`FAIL ${label}: got ${a}, expected ${e}`);
  failures++;
}

/* ── Leap years and month lengths ────────────────────────────────────────── */

check("2024 is leap", isLeapYear(2024), true);
check("2025 is not leap", isLeapYear(2025), false);
check("2028 is leap", isLeapYear(2028), true);
check("1900 is NOT leap (century rule)", isLeapYear(1900), false);
check("2000 IS leap (400 rule)", isLeapYear(2000), true);
check("2100 is NOT leap", isLeapYear(2100), false);

check("Feb 2028 has 29", daysInMonth(2028, 2), 29);
check("Feb 2026 has 28", daysInMonth(2026, 2), 28);
check("Feb 2100 has 28", daysInMonth(2100, 2), 28);

// Every month of 2020–2035 must agree with Date's own view.
for (let y = 2020; y <= 2035; y++) {
  for (let m1 = 1; m1 <= 12; m1++) {
    check(`daysInMonth ${y}-${m1}`, daysInMonth(y, m1), new Date(Date.UTC(y, m1, 0)).getUTCDate());
  }
}

/* ── Day of week ─────────────────────────────────────────────────────────── */

check("2026-11-01 is Sunday", dayOfWeek(2026, 11, 1), 0);
check("2026-08-14 is Friday", dayOfWeek(2026, 8, 14), 5);
check("2000-01-01 is Saturday", dayOfWeek(2000, 1, 1), 6);
check("1970-01-01 is Thursday", dayOfWeek(1970, 1, 1), 4);
check("2024-02-29 is Thursday", dayOfWeek(2024, 2, 29), 4);

// Monday-first column index: Sunday must land in the LAST column.
check("Sunday -> column 6", mondayIndex(2026, 11, 1), 6);
check("Monday -> column 0", mondayIndex(2026, 11, 2), 0);

/* ── Parsing ─────────────────────────────────────────────────────────────── */

check("parse valid", parseISO("2026-11-08"), { y: 2026, m1: 11, d: 8 });
check("reject Feb 30", parseISO("2026-02-30"), null);
check("reject Feb 29 in a common year", parseISO("2026-02-29"), null);
check("accept Feb 29 in a leap year", parseISO("2028-02-29"), { y: 2028, m1: 2, d: 29 });
check("reject month 13", parseISO("2026-13-01"), null);
check("reject month 00", parseISO("2026-00-10"), null);
check("reject unpadded", parseISO("2026-1-8"), null);
check("reject garbage", parseISO("banana"), null);
check("reject non-string", parseISO(42), null);
check("reject the old display format", parseISO("Nov 8, 2026"), null);

check("isoDate pads", isoDate(2026, 1, 5), "2026-01-05");

/* ── Arithmetic ──────────────────────────────────────────────────────────── */

check("addDays within month", addDays("2026-11-08", 5), "2026-11-13");
check("addDays across month", addDays("2026-11-28", 5), "2026-12-03");
check("addDays across year", addDays("2026-12-30", 3), "2027-01-02");
check("addDays backwards", addDays("2026-01-02", -3), "2025-12-30");
check("addDays over leap day", addDays("2028-02-28", 1), "2028-02-29");
check("addDays over non-leap Feb", addDays("2026-02-28", 1), "2026-03-01");
check("addDays 180 (the booking horizon)", addDays("2026-08-14", 180), "2027-02-10");

check("addMonths forward", addMonths(2026, 11, 2), { y: 2027, m1: 1 });
check("addMonths backward", addMonths(2026, 1, -1), { y: 2025, m1: 12 });
check("addMonths zero", addMonths(2026, 6, 0), { y: 2026, m1: 6 });

check("isBetween inside", isBetween("2026-11-08", "2026-11-01", "2026-11-30"), true);
check("isBetween below", isBetween("2026-10-31", "2026-11-01", "2026-11-30"), false);
check("isBetween on the max edge", isBetween("2026-11-30", "2026-11-01", "2026-11-30"), true);
check("monthKey pads", monthKey(2026, 3), "2026-03");

/* ── Timezone: today ─────────────────────────────────────────────────────── */

// 00:30 UTC on 9 Nov is still 00:30 in Lisbon (winter, UTC+0) — same day.
check("today in Lisbon, winter", todayInLisbon(new Date("2026-11-09T00:30:00Z")), "2026-11-09");
// 23:30 UTC on 8 Jul is 00:30 on the 9th in Lisbon (summer, UTC+1).
check("today in Lisbon, summer rolls over", todayInLisbon(new Date("2026-07-08T23:30:00Z")), "2026-07-09");

/* ── Timezone: DST. These are the assertions that matter. ────────────────── */

// Winter (WET, UTC+0): 08:00 local == 08:00Z
check(
  "zonedInstant winter 08:00 -> 08:00Z",
  zonedInstant("2026-11-08", "08:00"),
  Date.UTC(2026, 10, 8, 8, 0)
);
// Summer (WEST, UTC+1): 08:00 local == 07:00Z
check(
  "zonedInstant summer 08:00 -> 07:00Z",
  zonedInstant("2026-07-08", "08:00"),
  Date.UTC(2026, 6, 8, 7, 0)
);
// The day before the spring-forward transition (2026-03-29 in the EU).
check(
  "zonedInstant day before spring forward",
  zonedInstant("2026-03-28", "12:00"),
  Date.UTC(2026, 2, 28, 12, 0)
);
// The day after — now UTC+1.
check(
  "zonedInstant day after spring forward",
  zonedInstant("2026-03-30", "12:00"),
  Date.UTC(2026, 2, 30, 11, 0)
);
// Autumn back to UTC+0 (2026-10-25).
check(
  "zonedInstant after fall back",
  zonedInstant("2026-10-26", "12:00"),
  Date.UTC(2026, 9, 26, 12, 0)
);
// A slot end must stay after its start across a transition.
if (!(zonedInstant("2026-07-08", "19:00") > zonedInstant("2026-07-08", "08:00"))) {
  console.error("FAIL slot end is not after slot start in summer");
  failures++;
}

check("zonedInstant rejects bad date", Number.isNaN(zonedInstant("nope", "08:00")), true);
check("zonedInstant rejects bad time", Number.isNaN(zonedInstant("2026-11-08", "8am")), true);

/* ── Human formatting ────────────────────────────────────────────────────── */

// Intl's en-GB pattern includes a comma after the weekday.
check("formatDateHuman", formatDateHuman("2026-11-08"), "Sun, 8 Nov 2026");
check("formatDateHuman passes through garbage", formatDateHuman("nope"), "nope");

if (failures) {
  console.error(`\n${failures} date check(s) failed.`);
  process.exit(1);
}
console.log("All date checks passed.");
