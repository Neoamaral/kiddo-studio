/**
 * Regression net for the availability rules.
 *
 *   npm run check:availability
 *
 * Two things worth pinning down: the resource-intersection rule that makes
 * "both" work with two calendars instead of three, and the two-hour approval
 * window, which decides whether a slot is still offered close to its start.
 */

import {
  dayState,
  isDaySelectable,
  slotTooSoon,
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

/* ── The 2-hour approval window ──────────────────────────────────────────── */

const DAY = "2026-11-10"; // winter, Lisbon is UTC+0
const at = (hhmm: string) => zonedInstant(DAY, hhmm);

// MORNING starts 08:00, so the cutoff is 06:00.
check("at 05:59, morning is still bookable", slotTooSoon(DAY, "am", at("05:59")), false);
check("at 06:01, morning is inside the window", slotTooSoon(DAY, "am", at("06:01")), true);
check("at 08:30, morning has begun — still closed", slotTooSoon(DAY, "am", at("08:30")), true);

// AFTERNOON starts 13:00 -> cutoff 11:00.
check("at 10:59, afternoon is bookable", slotTooSoon(DAY, "pm", at("10:59")), false);
check("at 11:30, afternoon is closed", slotTooSoon(DAY, "pm", at("11:30")), true);
// The morning being gone must not close the afternoon.
check("at 09:00 the afternoon is unaffected", slotTooSoon(DAY, "pm", at("09:00")), false);

// EVENING starts 18:00 -> cutoff 16:00.
check("at 15:59, evening is bookable", slotTooSoon(DAY, "ev", at("15:59")), false);
check("at 16:30, evening is closed", slotTooSoon(DAY, "ev", at("16:30")), true);

check("an unknown slot is never closed", slotTooSoon(DAY, "nope", at("23:00")), false);

// Summer: Lisbon is UTC+1, so the same wall clock is a different instant.
// Comparing wall clocks, or assuming a fixed offset, breaks exactly here.
const SUMMER = "2026-07-10";
check(
  "summer 05:59 — morning still bookable",
  slotTooSoon(SUMMER, "am", zonedInstant(SUMMER, "05:59")),
  false
);
check(
  "summer 06:01 — morning closed",
  slotTooSoon(SUMMER, "am", zonedInstant(SUMMER, "06:01")),
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

check("an empty calendar leaves the slot free", slotState(DAY, "am", free, at("05:00")), "free");
check("a slot inside the window reads busy anyway", slotState(DAY, "am", free, at("07:00")), "busy");
check("without a clock, only the calendar matters", slotState(DAY, "am", free), "free");

const booked: MonthAvailability = {
  ...free,
  days: { [DAY]: { date: DAY, slots: { am: "busy", pm: "free", ev: "free", fd: "busy" } } },
};
check("a booked slot reads busy", slotState(DAY, "am", booked, at("05:00")), "busy");
check("its neighbour stays free", slotState(DAY, "pm", booked, at("05:00")), "free");

const degraded: MonthAvailability = { ...free, degraded: true };
check("a failed read is unknown, never free", slotState(DAY, "am", degraded, at("05:00")), "unknown");
// Even degraded, the notice window still applies — that is a fact about the
// clock, not about Google.
check("the window beats degraded", slotState(DAY, "am", degraded, at("13:00")), "busy");

/* ── dayState ────────────────────────────────────────────────────────────── */

const bounds: DateBounds = { today: DAY, min: DAY, max: "2027-05-09" };

check("today, well before anything, is free", dayState(DAY, free, bounds, at("05:00")), "free");
check("today, once every slot is inside the window, is full", dayState(DAY, free, bounds, at("17:00")), "full");
check("today with only the morning gone is partial", dayState(DAY, free, bounds, at("07:00")), "partial");
check("yesterday is past", dayState("2026-11-09", free, bounds, at("05:00")), "past");
check("beyond the horizon is out of range", dayState("2027-06-01", free, bounds, at("05:00")), "outOfRange");

check("a full day is not selectable", isDaySelectable("full"), false);
check("a past day is not selectable", isDaySelectable("past"), false);
check("a partial day IS selectable", isDaySelectable("partial"), true);
check("an unknown day IS selectable", isDaySelectable("unknown"), true);

if (failures) {
  console.error(`\n${failures} availability check(s) failed.`);
  process.exit(1);
}
console.log("All availability checks passed.");
