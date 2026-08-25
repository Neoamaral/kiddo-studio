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
/**
 * Services only. The camera (240) and lighting (180) bundles used to be add-ons
 * and are now equipment presets, so this dropped from 750 to 330. The slot and
 * space assertions below did NOT change — if they ever do, something touched
 * studio pricing, which this file exists to prevent.
 */
const LEGACY_ADDON_TOTAL = 180 + 30 + 20 + 100; // 330

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

/* ── Equipment: must be purely additive ──────────────────────────────────── */

check("equipment absent === legacy", computeQuote({ slotId: "fd", spaceId: "cyc", addonIds: [] }).total, 280);
check(
  "equipment empty object changes nothing",
  computeQuote({ slotId: "fd", spaceId: "cyc", addonIds: [], equipment: {} }).total,
  280
);
// CAM-01 (Sony FX6) is 150/day.
check(
  "one item adds its day rate",
  computeQuote({ slotId: "fd", spaceId: "cyc", addonIds: [], equipment: { "CAM-01": 1 } }).total,
  280 + 150
);
check(
  "quantity multiplies",
  computeQuote({ slotId: "fd", spaceId: "cyc", addonIds: [], equipment: { "CAM-01": 2 } }).total,
  280 + 300
);
// A half day pays the SAME equipment rate as a full day.
check(
  "half day pays the full equipment day rate",
  computeQuote({ slotId: "am", spaceId: "cyc", addonIds: [], equipment: { "CAM-01": 1 } }).total,
  140 + 150
);
check(
  "zero and negative quantities are ignored",
  computeQuote({
    slotId: "fd",
    spaceId: "cyc",
    addonIds: [],
    equipment: { "CAM-01": 0, "LNS-01": -3 },
  }).total,
  280
);

// GRP-04 (C-stand kit) is free but must still appear on the booking.
const freeItem = computeQuote({
  slotId: "fd",
  spaceId: "cyc",
  addonIds: [],
  equipment: { "GRP-04": 1 },
});
check("free item costs nothing", freeItem.total, 280);
check("free item still gets a line", freeItem.equipment.length, 1);
check("free item line is 0", freeItem.equipment[0].amount, 0);

// Bundles price as the bundle and swallow their members.
const bundled = computeQuote({ slotId: "fd", spaceId: "cyc", addonIds: [], bundleIds: ["cam"] });
check("camera bundle costs 240", bundled.total, 280 + 240);
check("camera bundle is one line", bundled.bundles.length, 1);

const bundlePlusMember = computeQuote({
  slotId: "fd",
  spaceId: "cyc",
  addonIds: [],
  bundleIds: ["cam"],
  equipment: { "CAM-01": 1 }, // the FX6 is inside the camera bundle
});
check("a member inside a chosen bundle is not charged twice", bundlePlusMember.total, 280 + 240);
check("the duplicated member produces no item line", bundlePlusMember.equipment.length, 0);

const bundlePlusOther = computeQuote({
  slotId: "fd",
  spaceId: "cyc",
  addonIds: [],
  bundleIds: ["cam"],
  equipment: { "AUD-01": 1 }, // 30/day, not in the bundle
});
check("an item outside the bundle is still charged", bundlePlusOther.total, 280 + 240 + 30);

// Unknown codes are reported, never silently priced at zero.
const badEquip = computeQuote({
  slotId: "fd",
  spaceId: "cyc",
  addonIds: [],
  equipment: { "NOPE-99": 1 },
  bundleIds: ["nope"],
});
check("unknown equipment does not change the total", badEquip.total, 280);
check("unknown equipment and bundle are both reported", badEquip.unknownIds.length, 2);

if (failures) {
  console.error(`\n${failures} check(s) failed.`);
  process.exit(1);
}
console.log("All quote checks passed.");
