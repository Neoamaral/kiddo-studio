/**
 * Regression net for the availability rules.
 *
 *   npm run check:availability
 *
 * Two things worth pinning down: the resource-intersection rule that makes
 * "both" work with two calendars instead of three, and the same-day cutoff,
 * which decides whether the site offers this morning's slot at six in the
 * evening.
 */

import {
  dayState,
  isDaySelectable,
  slotHasStarted,
  slotState,
  type DateBounds,
  type MonthAvailability,
} from "../src/data/availability";
import { resourcesForSpace } from "../src/data/resources";
import { zonedInstant } from "../src/lib/date";

let failures = 0;
function check(label: string, actual: unknown, expected: unknown) {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a === e) return;
  console.error(`FAIL ${label}: got ${a}, expected ${e}`);
  failures++;
}

/* ── The two-calendars-three-products rule ───────────────────────────────── */

check("cyc occupies one room", resourcesForSpace("cyc"), ["room-cyc"]);
check("blk occupies one room", resourcesForSpace("blk"), ["room-blk"]);
check("both occupies BOTH rooms", resourcesForSpace("both"), ["room-cyc", "room-blk"]);
check("an unknown space occupies nothing", resourcesForSpace("nope"), []);
// If this ever returns one resource, "both" becomes a third room and booking
// the cyclorama would stop blocking it.
check("both is not a room of its own", resourcesForSpace("both").length, 2);

/* ── Same-day cutoff ─────────────────────────────────────────────────────── */

const DAY = "2026-11-10"; // winter, Lisbon is UTC+0
const at = (hhmm: string) => zonedInstant(DAY, hhmm);

check("at 07:00, morning has not started", slotHasStarted(DAY, "am", at("07:00")), false);
check("at 08:00, morning HAS started", slotHasStarted(DAY, "am", at("08:00")), true);
check("at 09:00, morning has started", slotHasStarted(DAY, "am", at("09:00")), true);
check("at 09:00, afternoon has not", slotHasStarted(DAY, "pm", at("09:00")), false);
check("at 18:00, evening has started", slotHasStarted(DAY, "ev", at("18:00")), true);
check("at 17:59, evening has not", slotHasStarted(DAY, "ev", at("17:59")), false);
check("an unknown slot never counts as started", slotHasStarted(DAY, "nope", at("23:00")), false);

// Summer: Lisbon is UTC+1, so the same wall clock is a different instant.
// Comparing dates as strings, or assuming a fixed offset, breaks exactly here.
const SUMMER = "2026-07-10";
check(
  "summer 07:59 — morning not started",
  slotHasStarted(SUMMER, "am", zonedInstant(SUMMER, "07:59")),
  false
);
check(
  "summer 08:01 — morning started",
  slotHasStarted(SUMMER, "am", zonedInstant(SUMMER, "08:01")),
  true
);

/* ── slotState folds the cutoff in ───────────────────────────────────────── */

const free: MonthAvailability = {
  spaceId: "cyc",
  month: "2026-11",
  days: {},
  equipmentRemaining: {},
  degraded: false,
  fetchedAt: "",
};

check("an empty calendar leaves the slot free", slotState(DAY, "am", free, at("07:00")), "free");
check("a lapsed slot reads busy anyway", slotState(DAY, "am", free, at("13:00")), "busy");
check("without a clock, only the calendar matters", slotState(DAY, "am", free), "free");

const booked: MonthAvailability = {
  ...free,
  days: { [DAY]: { date: DAY, slots: { am: "busy", pm: "free", ev: "free", fd: "busy" } } },
};
check("a booked slot reads busy", slotState(DAY, "am", booked, at("06:00")), "busy");
check("its neighbour stays free", slotState(DAY, "pm", booked, at("06:00")), "free");

const degraded: MonthAvailability = { ...free, degraded: true };
check("a failed read is unknown, never free", slotState(DAY, "am", degraded, at("06:00")), "unknown");
// Even degraded, a slot that has begun is gone — that is a fact about the
// clock, not about Google.
check("a lapsed slot beats degraded", slotState(DAY, "am", degraded, at("13:00")), "busy");

/* ── dayState ────────────────────────────────────────────────────────────── */

const bounds: DateBounds = { today: DAY, min: DAY, max: "2027-05-09" };

check("today, early, is free", dayState(DAY, free, bounds, at("06:00")), "free");
check("today, after the last slot begins, is full", dayState(DAY, free, bounds, at("20:00")), "full");
check("today with one slot gone is partial", dayState(DAY, free, bounds, at("09:00")), "partial");
check("yesterday is past", dayState("2026-11-09", free, bounds, at("06:00")), "past");
check("beyond the horizon is out of range", dayState("2027-06-01", free, bounds, at("06:00")), "outOfRange");

check("a full day is not selectable", isDaySelectable("full"), false);
check("a past day is not selectable", isDaySelectable("past"), false);
check("a partial day IS selectable", isDaySelectable("partial"), true);
check("an unknown day IS selectable", isDaySelectable("unknown"), true);

if (failures) {
  console.error(`\n${failures} availability check(s) failed.`);
  process.exit(1);
}
console.log("All availability checks passed.");
