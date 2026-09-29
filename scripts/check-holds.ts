/**
 * The availability rule, and the calendar's guarantees.
 *
 *   npm run check:holds
 *
 * The first half is pure — no network, no database — because the rule that
 * decides whether a slot is free is a pure function that both calendar readers
 * call. If this half passes, the Google reader and the site's own reader cannot
 * disagree, which is the whole basis for swapping one for the other without
 * touching the booking UI.
 *
 * The second half needs a database, because what it proves is a guarantee the
 * database makes and code cannot: that two overlapping holds on one room are
 * impossible. It SKIPS LOUDLY when DATABASE_URL is unset, and a skip is
 * reported in the summary — a suite that says "all passed" because it asserted
 * nothing is worse than one that fails.
 */

import {
  buildDays,
  buildEquipmentRemaining,
  overlaps,
  slotWindow,
} from "../src/lib/availability-build";
import { slotState, dayState, emptyMonth } from "../src/data/availability";
import { zonedInstant, addDays } from "../src/lib/date";
import type { EquipmentItem } from "../src/data/types";

let failures = 0;
let skipped = 0;
/*
 * Counted and reported, so a pass can never be vacuous. A suite that ran zero
 * assertions and announced success has happened in this project before, and it
 * cost a whole afternoon of wrong conclusions.
 */
let assertions = 0;

function check(label: string, actual: unknown, expected: unknown) {
  assertions++;
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (ok) return;
  failures++;
  console.error(
    `FAIL  ${label}\n      got      ${JSON.stringify(actual)}\n      expected ${JSON.stringify(expected)}`
  );
}

const HOUR = 3_600_000;

/* ── 1. Intervals are half-open ───────────────────────────────────────────── */

// The whole reason slots are compared as intervals rather than by id: a
// four-hour morning and a ten-hour full day are different slots that occupy
// the same hours.
check("touching intervals do not overlap", overlaps({ start: 0, end: HOUR }, { start: HOUR, end: 2 * HOUR }), false);
check("sharing one hour overlaps", overlaps({ start: 0, end: 2 * HOUR }, { start: HOUR, end: 3 * HOUR }), true);
check("containment overlaps", overlaps({ start: 0, end: 10 * HOUR }, { start: HOUR, end: 2 * HOUR }), true);
check("overlap is symmetric", overlaps({ start: HOUR, end: 2 * HOUR }, { start: 0, end: 10 * HOUR }), true);

/* ── 2. The three slots, against each other ───────────────────────────────── */

const D = "2026-06-15"; // an ordinary Monday
const am = slotWindow(D, "am")!;
const pm = slotWindow(D, "pm")!;
const fd = slotWindow(D, "fd")!;

check("morning and afternoon can both be sold", overlaps(am, pm), false);
check("the full day clashes with the morning", overlaps(fd, am), true);
check("the full day clashes with the afternoon", overlaps(fd, pm), true);
check("the morning is four hours", (am.end - am.start) / HOUR, 4);
check("the full day is ten hours", (fd.end - fd.start) / HOUR, 10);

/* ── 3. A product is free iff every room it occupies is free ──────────────── */

const cycBusyAm = { "room-cyc": [am] } as const;

check(
  "booking the cyclorama blocks the cyclorama",
  buildDays("cyc", "2026-06", cycBusyAm)[D]?.slots.am,
  "busy"
);
check(
  "and leaves the black box free — no special case for it",
  buildDays("blk", "2026-06", cycBusyAm)[D],
  undefined
);
check(
  "and blocks BOTH, because both occupies the cyclorama too",
  buildDays("both", "2026-06", cycBusyAm)[D]?.slots.am,
  "busy"
);
check(
  "the afternoon stays free on that day",
  buildDays("cyc", "2026-06", cycBusyAm)[D]?.slots.pm,
  "free"
);
check(
  "and the full day does not, since it overlaps the morning",
  buildDays("cyc", "2026-06", cycBusyAm)[D]?.slots.fd,
  "busy"
);

// Sparse by design: a month with nothing booked stores no days at all, and the
// consumer reads a missing day as free.
check("an unbooked month is empty", Object.keys(buildDays("cyc", "2026-06", {})).length, 0);
check("only constrained days are stored", Object.keys(buildDays("cyc", "2026-06", cycBusyAm)), [D]);

/* ── 4. Daylight saving, which is where calendars go wrong ────────────────── */

/*
 * The last Sunday in October 2026 is the 25th: Lisbon puts the clock back, and
 * that day is TWENTY-FIVE hours long. A day blocked as "start + 24h" would
 * leave its last hour bookable — an hour the studio thinks it has off.
 *
 * This asserts the rule the block-a-day action must follow: resolve both
 * endpoints independently.
 */
const dstBack = "2026-10-25";
const dayStart = zonedInstant(dstBack, "00:00");
const dayEnd = zonedInstant(addDays(dstBack, 1), "00:00");
check("the October clock-change day is 25 hours", (dayEnd - dayStart) / HOUR, 25);
check("naive arithmetic would be an hour short", (dayEnd - dayStart) / HOUR === 24, false);

// The March change removes an hour, and the same rule covers it.
const dstFwd = "2026-03-29";
check(
  "the March clock-change day is 23 hours",
  (zonedInstant(addDays(dstFwd, 1), "00:00") - zonedInstant(dstFwd, "00:00")) / HOUR,
  23
);

// A block over the whole clock-change day must cover every slot in it.
const octBlock = { "room-cyc": [{ start: dayStart, end: dayEnd }] } as const;
const octDay = buildDays("cyc", "2026-10", octBlock)[dstBack];
check("a blocked clock-change day has no free slot", octDay && Object.values(octDay.slots), ["busy", "busy", "busy"]);

// Summer and winter slots are the same length in wall-clock terms even though
// the UTC offset differs — which is the point of resolving through Intl.
check(
  "a July morning is four hours",
  (slotWindow("2026-07-15", "am")!.end - slotWindow("2026-07-15", "am")!.start) / HOUR,
  4
);
check(
  "a January morning is four hours",
  (slotWindow("2026-01-15", "am")!.end - slotWindow("2026-01-15", "am")!.start) / HOUR,
  4
);

/* ── 5. Equipment left on the shelf ───────────────────────────────────────── */

const items = [
  { code: "CAM-01", inStock: 2 },
  { code: "LNS-02", inStock: 5 },
] as unknown as readonly EquipmentItem[];

check(
  "committed units come off the stock",
  buildEquipmentRemaining({ [D]: { "CAM-01": 1 } }, items),
  { [D]: { "CAM-01": 1 } }
);
check(
  "stock never goes negative",
  buildEquipmentRemaining({ [D]: { "CAM-01": 9 } }, items),
  { [D]: { "CAM-01": 0 } }
);
check(
  "an item no longer in the catalogue is ignored, not counted as zero",
  buildEquipmentRemaining({ [D]: { "GONE-99": 1 } }, items),
  {}
);
check("a date with nothing committed is absent", buildEquipmentRemaining({}, items), {});

/* ── 6. A failed read must never read as free ─────────────────────────────── */

/*
 * The one invariant that, if lost, has the site selling slots it never
 * checked. A degraded month has no days in it, and a missing day means free —
 * so the degraded flag is what stands between "we don't know" and "yes".
 */
const degraded = emptyMonth("cyc", "2026-06", true);
// A window that certainly contains D, so the answer turns on the data and not
// on today's date — this file must not start failing in June 2026.
const bounds = { today: "2026-01-01", min: "2026-01-01", max: "2027-01-01" };
const wellBefore = Date.parse("2026-01-01T00:00:00Z"); // so nothing is "too soon"

check("a degraded month reports unknown, not free", slotState(D, "am", degraded, wellBefore), "unknown");
check("and its days are unknown too", dayState(D, degraded, bounds, wellBefore), "unknown");

const healthyEmpty = emptyMonth("cyc", "2026-06", false);
check("a healthy empty month does report free", slotState(D, "am", healthyEmpty, wellBefore), "free");
check("and its days are bookable", dayState(D, healthyEmpty, bounds, wellBefore), "free");

// A day every slot of which is taken reads as full, not merely partly booked.
const allTaken = { spaceId: "cyc", month: "2026-06", days: { [D]: { date: D,
  slots: { am: "busy", pm: "busy", fd: "busy" } } }, equipmentRemaining: {},
  degraded: false, fetchedAt: "" } as Parameters<typeof dayState>[1];
check("a fully booked day reads as full", dayState(D, allTaken, bounds, wellBefore), "full");

/* ── 7. What only the database can promise ────────────────────────────────── */

async function databaseChecks(): Promise<void> {
  if (!process.env.TEST_DATABASE_URL) {
    skipped++;
    console.log(
      "\nSKIPPED  the database half — DATABASE_URL is not set.\n" +
        "         These are the assertions that prove two overlapping holds on one\n" +
        "         room are impossible, which is a guarantee no amount of code can\n" +
        "         make. Run against a Neon dev branch with:\n" +
        "           npx tsx --env-file=.env.local scripts/check-holds.ts\n"
    );
    return;
  }
  const { databaseHoldChecks } = await import("./check-holds-db");
  await databaseHoldChecks(check);
}

databaseChecks().then(() => {
  console.log();
  if (failures > 0) {
    console.error(`check-holds: ${failures} failure(s)`);
    process.exit(1);
  }
  if (assertions < 40) {
    console.error(
      `check-holds: only ${assertions} assertion(s) ran — something did not execute`
    );
    process.exit(1);
  }
  if (skipped > 0) {
    console.log(
      `check-holds: ${assertions} pure assertions passed; the database half was SKIPPED`
    );
    return;
  }
  console.log(`check-holds: all ${assertions} assertions passed`);
});
