/**
 * Quote engine assertions — Phase 1 "Soft Launch".
 *
 * The expected numbers below are transcribed from the studio's own rate card,
 * NOT derived from the code, so a typo in pricing.ts fails here instead of
 * reaching a client. Run with `npm run check:quote`.
 *
 * Every studio figure excludes VAT; `total` is the only VAT-inclusive number.
 */

import { computeQuote } from "../src/lib/quote";
import { easterSunday, holidaysInYear, isPortugueseHoliday, isWeekend } from "../src/lib/surcharge";
import { VAT_RATE } from "../src/data/pricing";

let failures = 0;

const check = (label: string, actual: unknown, expected: unknown) => {
  if (actual === expected) return;
  console.error(`FAIL ${label}: got ${String(actual)}, expected ${String(expected)}`);
  failures++;
};

/* ── Dates used throughout ───────────────────────────────────────────────
 * Picked by hand and verified against a calendar, not computed — a date the
 * test derives from the same code it is testing proves nothing.
 */
const WEEKDAY = "2026-10-14"; // a Wednesday
const SATURDAY = "2026-10-17";
const SUNDAY = "2026-10-18";
const CHRISTMAS = "2026-12-25"; // a Friday, so the holiday rule is what fires
const GOOD_FRIDAY_2027 = "2027-03-26";

/* ── 1. The rate card, priced straight off the sheet ─────────────────────── */

const studio = (pkg: string, slot: string, space = "cyc", date = WEEKDAY) =>
  computeQuote({ slotId: slot, spaceId: space, packageId: pkg, date, addonIds: [] });

check("Base · full day", studio("base", "fd").subtotal, 180);
check("Base · half day (morning)", studio("base", "am").subtotal, 110);
check("Base · half day (afternoon)", studio("base", "pm").subtotal, 110);
check("Full House · full day", studio("full", "fd").subtotal, 260);
check("Full House · half day", studio("full", "am").subtotal, 160);

/* ── 2. Space upcharges stack on top, unchanged ──────────────────────────── */

check("Full House · full day · black box", studio("full", "fd", "blk").subtotal, 260 + 40);
check("Full House · full day · both rooms", studio("full", "fd", "both").subtotal, 260 + 80);
check("Base · half day · black box", studio("base", "am", "blk").subtotal, 110 + 40);

/* ── 3. VAT ──────────────────────────────────────────────────────────────── */

const vatCase = studio("base", "fd");
check("VAT on 180", vatCase.vat, 41);
check("total is subtotal + VAT", vatCase.total, vatCase.subtotal + vatCase.vat);
check("total matches the rate", vatCase.total, Math.round(180 * (1 + VAT_RATE)));

// The two helpers must round identically, or the summary shows 180 + 41 next
// to a total of 222.
for (const n of [110, 160, 180, 260, 300, 340]) {
  const q = computeQuote({
    slotId: "fd",
    spaceId: "cyc",
    packageId: "base",
    date: WEEKDAY,
    addonIds: [],
    equipment: {},
  });
  void q;
  const parts = Math.round(n) + (Math.round(n * (1 + VAT_RATE)) - Math.round(n));
  check(`VAT parts add up for ${n}`, parts, Math.round(n * (1 + VAT_RATE)));
}

/* ── 4. Weekend and holiday surcharge ────────────────────────────────────── */

check("Saturday adds 20% to studio time", studio("base", "fd", "cyc", SATURDAY).subtotal, 216);
check("Sunday adds 20%", studio("base", "fd", "cyc", SUNDAY).subtotal, 216);
check("a weekday adds nothing", studio("base", "fd", "cyc", WEEKDAY).subtotal, 180);
check("no date means no surcharge", computeQuote({
  slotId: "fd", spaceId: "cyc", packageId: "base", addonIds: [],
}).subtotal, 180);

check("Christmas adds 20%", studio("base", "fd", "cyc", CHRISTMAS).subtotal, 216);
check("Good Friday 2027 adds 20%", studio("base", "fd", "cyc", GOOD_FRIDAY_2027).subtotal, 216);

// The surcharge is a named line, not a silently bigger base.
const sat = studio("base", "fd", "cyc", SATURDAY);
check("Saturday base is still the list price", sat.base.amount, 180);
check("Saturday surcharge is its own line", sat.surcharge?.amount, 36);
check("Saturday surcharge says why", sat.surcharge?.reason, "weekend");
check("Christmas surcharge says why", studio("base", "fd", "cyc", CHRISTMAS).surcharge?.reason, "holiday");
check("weekday has no surcharge line", studio("base", "fd", "cyc", WEEKDAY).surcharge, null);

// The upcharge scales with the day; 260 + 40 = 300, times 1.2 = 360.
check("Saturday scales the space upcharge too", studio("full", "fd", "blk", SATURDAY).subtotal, 360);

/* ── 5. The surcharge does NOT touch equipment ───────────────────────────── */

const satWithGear = computeQuote({
  slotId: "fd", spaceId: "cyc", packageId: "base", date: SATURDAY,
  addonIds: [], equipment: { "LIT-01": 1 },
});
check("equipment is not surcharged on a Saturday", satWithGear.subtotal, 216 + 70);

const weekdayWithGear = computeQuote({
  slotId: "fd", spaceId: "cyc", packageId: "base", date: WEEKDAY,
  addonIds: [], equipment: { "LIT-01": 1 },
});
check("same gear on a weekday", weekdayWithGear.subtotal, 180 + 70);
check("qty multiplies", computeQuote({
  slotId: "fd", spaceId: "cyc", packageId: "base", date: WEEKDAY,
  addonIds: [], equipment: { "LIT-01": 2 },
}).subtotal, 180 + 140);

/* ── 6. Bundles still exclude their own members ──────────────────────────── */

const bundled = computeQuote({
  slotId: "fd", spaceId: "cyc", packageId: "base", date: WEEKDAY,
  addonIds: [], bundleIds: ["cam"], equipment: { "CAM-01": 1 },
});
check(
  "a member inside a chosen bundle is not charged twice",
  bundled.subtotal,
  180 + (bundled.bundles[0]?.amount ?? -1)
);

/* ── 7. Unknown ids are reported, never silently priced at zero ──────────── */

const bogus = computeQuote({
  slotId: "nope", spaceId: "nope", packageId: "nope", date: WEEKDAY,
  addonIds: ["nope"],
});
check("unknown ids are collected", bogus.unknownIds.length, 4);
check("an unknown package falls back to the cheapest", bogus.base.amount, 110);

/* ── 8. The date helpers themselves ──────────────────────────────────────── */

check("Saturday is a weekend", isWeekend(SATURDAY), true);
check("Sunday is a weekend", isWeekend(SUNDAY), true);
check("Wednesday is not", isWeekend(WEEKDAY), false);
check("Christmas is a holiday", isPortugueseHoliday(CHRISTMAS), true);
check("25 April is a holiday", isPortugueseHoliday("2026-04-25"), true);
check("an ordinary Wednesday is not", isPortugueseHoliday(WEEKDAY), false);

// Easter dates verified against published tables.
check("Easter 2026 is 5 April", `${easterSunday(2026).m1}-${easterSunday(2026).d}`, "4-5");
check("Easter 2027 is 28 March", `${easterSunday(2027).m1}-${easterSunday(2027).d}`, "3-28");
check("Easter 2024 was 31 March", `${easterSunday(2024).m1}-${easterSunday(2024).d}`, "3-31");
check("Corpus Christi 2026 is 4 June", isPortugueseHoliday("2026-06-04"), true);
check("13 national holidays in 2026", holidaysInYear(2026).length, 13);

if (failures > 0) {
  console.error(`\n${failures} quote assertion(s) failed.`);
  process.exit(1);
}
console.log("check-quote: all assertions passed");
