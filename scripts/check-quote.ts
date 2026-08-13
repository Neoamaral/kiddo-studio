/**
 * Regression net for the booking price maths.
 *
 * The expected values below are the ones the site shipped BEFORE quote.ts
 * existed, when BookingSummary and handleSubmit each inlined
 *   basePrice = slot === "fd" ? 280 : 140
 *   spaceUp   = space === "blk" ? 40 : space === "both" ? 80 : 0
 * Run after touching quote.ts, booking.ts, pricing.ts or spaces.ts:
 *
 *   npx tsx scripts/check-quote.ts
 */

import { computeQuote } from "../src/lib/quote";
import { ADDON_OPTIONS } from "../src/data/booking";

const SLOTS = ["am", "pm", "ev", "fd"] as const;
const SPACES = ["cyc", "blk", "both"] as const;

/** The pre-refactor formula, written out independently. */
const legacyBase = (slot: string) => (slot === "fd" ? 280 : 140);
const legacyUpcharge = (space: string) =>
  space === "blk" ? 40 : space === "both" ? 80 : 0;

const ALL_ADDON_IDS = ADDON_OPTIONS.map((a) => a.id);
const LEGACY_ADDON_TOTAL = 180 + 30 + 240 + 180 + 20 + 100; // 750

let failures = 0;
const check = (label: string, actual: number, expected: number) => {
  if (actual === expected) return;
  console.error(`FAIL ${label}: got ${actual}, expected ${expected}`);
  failures++;
};

for (const slot of SLOTS) {
  for (const space of SPACES) {
    check(
      `${slot}/${space} bare`,
      computeQuote({ slotId: slot, spaceId: space, addonIds: [] }).total,
      legacyBase(slot) + legacyUpcharge(space)
    );
    check(
      `${slot}/${space} all add-ons`,
      computeQuote({ slotId: slot, spaceId: space, addonIds: ALL_ADDON_IDS })
        .total,
      legacyBase(slot) + legacyUpcharge(space) + LEGACY_ADDON_TOTAL
    );
  }
}

// Empty selection: the summary panel has always shown a 140€ half-day base.
check(
  "empty selection",
  computeQuote({ slotId: "", spaceId: "", addonIds: [] }).total,
  140
);

// Unknown ids must be reported, not silently priced.
const bogus = computeQuote({
  slotId: "nope",
  spaceId: "nope",
  addonIds: ["nope"],
});
if (bogus.unknownIds.length !== 3) {
  console.error(
    `FAIL unknown ids: got ${JSON.stringify(bogus.unknownIds)}, expected 3`
  );
  failures++;
}

if (failures) {
  console.error(`\n${failures} check(s) failed.`);
  process.exit(1);
}
console.log(
  `All ${SLOTS.length * SPACES.length * 2 + 2} quote checks passed.`
);
