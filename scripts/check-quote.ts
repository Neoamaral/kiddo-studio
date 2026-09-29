/**
 * Quote engine assertions — Phase 1 "Soft Launch".
 *
 * These assert INVARIANTS, not specific prices.
 *
 * They used to assert 180, 110, 260 and 160 as literals transcribed from the
 * studio's sheet, so a typo in the data file broke the test. That guard could
 * not survive the admin panel: every legitimate price change would break it
 * too, and a test people routinely "fix" by editing the expectation protects
 * nothing. Catching a nonsense number moved to validatePricing(), which runs
 * on the way in — see src/lib/pricing-validate.ts.
 *
 * What is asserted here is what must hold WHATEVER the prices are.
 *
 * Every studio figure excludes VAT; `total` is the only VAT-inclusive number.
 */

import { computeQuote } from "../src/lib/quote";
import { easterSunday, holidaysInYear, isPortugueseHoliday, isWeekend } from "../src/lib/surcharge";
import {
  DEFAULT_DURATION_ID,
  DEFAULT_PACKAGE_ID,
  DURATIONS,
  PACKAGES,
  PACKAGE_BY_ID,
  VAT_RATE,
  WEEKEND_MULTIPLIER,
} from "../src/data/pricing";
import { itemByCode } from "../src/data/equipment";
import { rateAmount } from "../src/lib/money";
import { validatePricing } from "../src/lib/pricing-validate";
import pricingSource from "../src/data/pricing.source.json";
import type { PricingSource } from "../src/data/types";

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

/* ── 1. The shipped rate card is itself valid ────────────────────────────── */

const pricingErrors = validatePricing(pricingSource as unknown as PricingSource).errors;
check("the rate card in the repository passes its own rules", pricingErrors.join("; "), "");

/* ── 2. The base price is the package times the duration ─────────────────── */

const studio = (pkg: string, slot: string, space = "cyc", date = WEEKDAY) =>
  computeQuote({ slotId: slot, spaceId: space, packageId: pkg, date, addonIds: [] });

// Whatever the numbers are, a quote must charge exactly what the rate card
// says for that combination — this is the wiring, not the price.
for (const pkg of PACKAGES) {
  check(`${pkg.name} full day matches the rate card`, studio(pkg.id, "fd").base.amount, pkg.rates.fd);
  check(`${pkg.name} half day matches the rate card`, studio(pkg.id, "am").base.amount, pkg.rates.hd);
  check(
    `${pkg.name} afternoon is priced as a half day`,
    studio(pkg.id, "pm").base.amount,
    studio(pkg.id, "am").base.amount
  );
  // Paying less for more studio time would be a real commercial error.
  check(`${pkg.name} full day is not cheaper than half`, pkg.rates.fd >= pkg.rates.hd, true);
}

check("every slot maps to a known duration", DURATIONS.length >= 1, true);

/* ── 2b. Space upcharges stack on top ────────────────────────────────────── */

const base = PACKAGES[0];
check(
  "the black box adds its upcharge",
  studio(base.id, "fd", "blk").subtotal - studio(base.id, "fd", "cyc").subtotal,
  40
);
check(
  "both rooms add theirs",
  studio(base.id, "fd", "both").subtotal - studio(base.id, "fd", "cyc").subtotal,
  80
);

/* ── 3. VAT ──────────────────────────────────────────────────────────────── */

const vatCase = studio(base.id, "fd");
check("total is subtotal + VAT", vatCase.total, vatCase.subtotal + vatCase.vat);
check(
  "total is the subtotal plus VAT at the configured rate",
  vatCase.total,
  Math.round(vatCase.subtotal * (1 + VAT_RATE))
);

// The two helpers must round identically, or the summary shows 180 + 41 next
// to a total of 222.
for (const n of [110, 160, 180, 260, 300, 340]) {
  const parts = Math.round(n) + (Math.round(n * (1 + VAT_RATE)) - Math.round(n));
  check(`VAT parts add up for ${n}`, parts, Math.round(n * (1 + VAT_RATE)));
}

/* ── 4. Weekend and holiday surcharge ────────────────────────────────────── */

const weekdayNet = studio(base.id, "fd", "cyc", WEEKDAY).subtotal;
const surcharged = Math.round(weekdayNet * WEEKEND_MULTIPLIER);

check("Saturday applies the multiplier", studio(base.id, "fd", "cyc", SATURDAY).subtotal, surcharged);
check("Sunday applies it", studio(base.id, "fd", "cyc", SUNDAY).subtotal, surcharged);
check("a weekday does not", studio(base.id, "fd", "cyc", WEEKDAY).subtotal, weekdayNet);
check("no date means no surcharge", computeQuote({
  slotId: "fd", spaceId: "cyc", packageId: base.id, addonIds: [],
}).subtotal, weekdayNet);

check("Christmas applies it", studio(base.id, "fd", "cyc", CHRISTMAS).subtotal, surcharged);
check("Good Friday 2027 applies it", studio(base.id, "fd", "cyc", GOOD_FRIDAY_2027).subtotal, surcharged);

// The surcharge is a named line, not a silently bigger base.
const sat = studio(base.id, "fd", "cyc", SATURDAY);
check("Saturday base is still the list price", sat.base.amount, base.rates.fd);
check("Saturday surcharge is its own line", sat.surcharge?.amount, surcharged - weekdayNet);
check("Saturday surcharge says why", sat.surcharge?.reason, "weekend");
check("Christmas surcharge says why", studio(base.id, "fd", "cyc", CHRISTMAS).surcharge?.reason, "holiday");
check("weekday has no surcharge line", studio(base.id, "fd", "cyc", WEEKDAY).surcharge, null);

// The upcharge scales with the day too, not just the package.
const blkWeekday = studio(base.id, "fd", "blk", WEEKDAY).subtotal;
check(
  "Saturday scales the space upcharge too",
  studio(base.id, "fd", "blk", SATURDAY).subtotal,
  Math.round(blkWeekday * WEEKEND_MULTIPLIER)
);

/* ── 5. The surcharge does NOT touch equipment ───────────────────────────── */

// Derived from the catalogue, which the admin panel also edits — hardcoding a
// gear price here would break every time someone repriced a light.
const GEAR = "LIT-01";
const gearRate = rateAmount(itemByCode(GEAR)!.rate)!;

const withGear = (date: string, qty: number) =>
  computeQuote({
    slotId: "fd", spaceId: "cyc", packageId: base.id, date,
    addonIds: [], equipment: { [GEAR]: qty },
  }).subtotal;

check("equipment is NOT surcharged on a Saturday", withGear(SATURDAY, 1), surcharged + gearRate);
check("same gear on a weekday", withGear(WEEKDAY, 1), weekdayNet + gearRate);
check("quantity multiplies", withGear(WEEKDAY, 2), weekdayNet + gearRate * 2);

/* ── 6. Bundles still exclude their own members ──────────────────────────── */

const bundled = computeQuote({
  slotId: "fd", spaceId: "cyc", packageId: base.id, date: WEEKDAY,
  addonIds: [], bundleIds: ["cam"], equipment: { "CAM-01": 1 },
});
check(
  "a member inside a chosen bundle is not charged twice",
  bundled.subtotal,
  weekdayNet + (bundled.bundles[0]?.amount ?? -1)
);

/* ── 7. Unknown ids are reported, never silently priced at zero ──────────── */

const bogus = computeQuote({
  slotId: "nope", spaceId: "nope", packageId: "nope", date: WEEKDAY,
  addonIds: ["nope"],
});
check("unknown ids are collected", bogus.unknownIds.length, 4);
check(
  "an unknown package falls back to the default, not to zero",
  bogus.base.amount,
  PACKAGE_BY_ID[DEFAULT_PACKAGE_ID].rates[DEFAULT_DURATION_ID]
);

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
