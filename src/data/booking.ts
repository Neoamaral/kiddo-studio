/**
 * Booking flow options — time slots and bookable add-ons.
 *
 * Each slot names how much studio time it buys, so the base price is that
 * duration priced against the chosen package, never a hardcoded number.
 *
 * Every slot sits inside STUDIO_DAY (09:00—19:00) ON PURPOSE. Phase 1 bills
 * anything before 09:00 or after 19:00 at the off-hours overtime rate, so a
 * slot crossing that line would quote one price and invoice another. The old
 * 08:00 morning and 18:00—22:00 evening did exactly that.
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
 * to parse. One source of truth, no drift — and the hours here now agree with
 * DURATIONS in pricing.ts (4 and 10), which the old 08:00—19:00 full day did
 * not.
 */
export const TIME_SLOTS: readonly TimeSlot[] = [
  {
    id: "am",
    label: "MORNING",
    startLocal: "09:00",
    endLocal: "13:00",
    note: "Best light through east windows",
    durationId: "hd",
  },
  {
    id: "pm",
    label: "AFTERNOON",
    startLocal: "14:00",
    endLocal: "18:00",
    note: "Tungsten balanced inside",
    durationId: "hd",
  },
  {
    id: "fd",
    label: "FULL DAY",
    startLocal: "09:00",
    endLocal: "19:00",
    note: "10 hours · best value",
    durationId: "fd",
  },
];

/** "09:00 — 13:00". The em-dash (U+2014) is the house style. */
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
