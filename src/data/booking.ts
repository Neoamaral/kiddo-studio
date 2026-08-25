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

/**
 * Same-day bookings are allowed (0 = today is bookable).
 *
 * The real cutoff is per-slot, not per-day: see BOOKING_MIN_NOTICE_MINUTES.
 */
export const BOOKING_LEAD_TIME_DAYS = 0;

/**
 * How long before a slot starts it stops being bookable.
 *
 * This is the studio's approval window, not a formality: a request holds
 * nothing until a human confirms it, so a slot booked ten minutes before it
 * begins is a slot nobody can realistically approve in time. Two hours.
 *
 * Measured in Europe/Lisbon wall clock via zonedInstant, so it stays correct
 * across daylight saving — see slotTooSoon() in src/data/availability.ts.
 */
export const BOOKING_MIN_NOTICE_MINUTES = 120;
/** How far ahead the calendar lets you go. */
export const BOOKING_HORIZON_DAYS = 180;

/**
 * Times are MACHINE values (local wall clock in Europe/Lisbon) and the display
 * string is derived from them by slotTimeLabel(). They used to be a single
 * display string with an em-dash, which a calendar integration would have had
 * to parse — and PricingTier.hours disagreed with it (it says 8 for a slot that
 * runs 11 hours). One source of truth, no drift.
 */
export const TIME_SLOTS: readonly TimeSlot[] = [
  {
    id: "am",
    label: "MORNING",
    startLocal: "08:00",
    endLocal: "12:00",
    note: "Best light through east windows",
    tierId: "hd",
  },
  {
    id: "pm",
    label: "AFTERNOON",
    startLocal: "13:00",
    endLocal: "17:00",
    note: "Tungsten balanced inside",
    tierId: "hd",
  },
  {
    id: "ev",
    label: "EVENING",
    startLocal: "18:00",
    endLocal: "22:00",
    note: "Dark room only after sunset",
    tierId: "hd",
  },
  {
    id: "fd",
    label: "FULL DAY",
    startLocal: "08:00",
    endLocal: "19:00",
    note: "11 hours · best value",
    tierId: "fd",
  },
];

/** "08:00 — 12:00". The em-dash (U+2014) is the house style. */
export function slotTimeLabel(s: TimeSlot): string {
  return `${s.startLocal} — ${s.endLocal}`;
}

export function slotById(id: string | null): TimeSlot | undefined {
  return id ? TIME_SLOTS.find((s) => s.id === id) : undefined;
}

/**
 * SERVICES only. The two gear bundles that used to live here (cam 240, light
 * 180) moved to the equipment step as presets — otherwise a client could add
 * "Camera bundle" AND the FX6 individually and be charged for the body twice.
 */
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
