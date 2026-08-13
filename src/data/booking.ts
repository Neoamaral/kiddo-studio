/**
 * Booking flow options — time slots and bookable add-ons.
 *
 * Each slot names the pricing tier it bills at, so the booking base price comes
 * from src/data/pricing.ts instead of a `slot === "fd" ? 280 : 140` ternary.
 *
 * KNOWN GAP: the hourly tier (40€/h) has no slot here — morning, afternoon and
 * evening all bill as half days. That predates this refactor; changing it is a
 * pricing decision, not a cleanup.
 */

import type { Addon, TimeSlot } from "./types";
import { EQUIPMENT_BUNDLES, bundleAmount } from "./equipment";

export const TIME_SLOTS: readonly TimeSlot[] = [
  {
    id: "am",
    label: "MORNING",
    time: "08:00 — 12:00",
    note: "Best light through east windows",
    tierId: "hd",
  },
  {
    id: "pm",
    label: "AFTERNOON",
    time: "13:00 — 17:00",
    note: "Tungsten balanced inside",
    tierId: "hd",
  },
  {
    id: "ev",
    label: "EVENING",
    time: "18:00 — 22:00",
    note: "Dark room only after sunset",
    tierId: "hd",
  },
  {
    id: "fd",
    label: "FULL DAY",
    time: "08:00 — 19:00",
    note: "11 hours · best value",
    tierId: "fd",
  },
];

export function slotById(id: string | null): TimeSlot | undefined {
  return id ? TIME_SLOTS.find((s) => s.id === id) : undefined;
}

/** Gear add-ons priced from the equipment catalogue, so they can't sell missing kit. */
function bundleAddon(bundleId: string, fallbackAmount: number): Addon {
  const bundle = EQUIPMENT_BUNDLES.find((b) => b.id === bundleId);
  const amount = bundle ? bundleAmount(bundle) : null;
  return {
    id: bundleId === "cam" ? "cam" : "light",
    label: bundle?.label ?? "Equipment bundle",
    rate: { kind: "fixed", amount: amount ?? fallbackAmount, per: "day" },
  };
}

export const ADDON_OPTIONS: readonly Addon[] = [
  {
    id: "coord",
    label: "Production coordinator",
    rate: { kind: "fixed", amount: 180, per: "day" },
  },
  {
    id: "mu",
    label: "Makeup station + mirror",
    rate: { kind: "fixed", amount: 30, per: "day" },
  },
  bundleAddon("cam", 240),
  bundleAddon("light", 180),
  {
    id: "park",
    label: "Parking (2 cars)",
    rate: { kind: "fixed", amount: 20, per: "day" },
  },
  {
    id: "stor",
    label: "Overnight set hold",
    rate: { kind: "fixed", amount: 100, per: "day" },
  },
];

export type AddonId = (typeof ADDON_OPTIONS)[number]["id"];

/** All add-ons off — derived, so adding an option needs no second edit. */
export function emptyAddonState(): Record<string, boolean> {
  return Object.fromEntries(ADDON_OPTIONS.map((a) => [a.id, false]));
}

export function selectedAddonIds(state: Record<string, boolean>): string[] {
  return Object.entries(state)
    .filter(([, on]) => on)
    .map(([id]) => id);
}
