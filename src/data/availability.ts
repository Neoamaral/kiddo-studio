/**
 * Availability shapes and the pure resolution helpers over them.
 *
 * No I/O — importable from both client and server, same discipline as quote.ts.
 * Today the only producer is a stub (everything free, degraded); in phase 2 it
 * is a Google Calendar read. Consumers do not change between the two.
 *
 * "unknown" is a first-class state and must NEVER be rendered as "free": the
 * site would be promising a slot it has not checked.
 */

import type { ISODate } from "@/lib/date";
import { isBetween, zonedInstant } from "@/lib/date";
import { BOOKING_MIN_NOTICE_MINUTES, TIME_SLOTS, slotById } from "./booking";

export type SlotAvailability = "free" | "busy" | "unknown";

export interface DayAvailability {
  date: ISODate;
  /** Keyed by TIME_SLOTS id. A missing key means "free". */
  slots: Record<string, SlotAvailability>;
}

export interface MonthAvailability {
  spaceId: string;
  /** "YYYY-MM" */
  month: string;
  /** Sparse: an absent date means every slot is free. */
  days: Record<ISODate, DayAvailability>;
  /** Units of each equipment code still free that month, by date. Sparse. */
  equipmentRemaining: Record<ISODate, Record<string, number>>;
  /** The upstream read failed or has not happened. UI must not claim "free". */
  degraded: boolean;
  fetchedAt: string;
}

export type DayState =
  | "past"
  | "outOfRange"
  | "full"
  | "partial"
  | "free"
  | "unknown";

export interface DateBounds {
  /** Today in Lisbon. Separates "already gone" from "too soon to book". */
  today: ISODate;
  /** Earliest bookable date — today plus the lead time. */
  min: ISODate;
  max: ISODate;
}

/**
 * Is it too late to request this slot?
 *
 * True once the slot starts within BOOKING_MIN_NOTICE_MINUTES — which includes
 * slots that have already begun. Same-day booking is allowed, so without this
 * the site would offer the 08:00 morning slot at six in the evening, and would
 * also accept a request twenty minutes before the shoot that nobody could
 * approve in time.
 *
 * The comparison is between INSTANTS, resolved through the timezone-aware
 * helper — Lisbon is UTC+0 in winter and UTC+1 in summer, so comparing wall
 * clocks or assuming a fixed offset would be an hour wrong for half the year.
 *
 * `nowMs` is passed in rather than read here: /booking is statically
 * prerendered, and a clock read during render would bake build time into the
 * shipped HTML.
 */
export function slotTooSoon(date: ISODate, slotId: string, nowMs: number): boolean {
  const slot = slotById(slotId);
  if (!slot) return false;
  const startsAt = zonedInstant(date, slot.startLocal);
  return startsAt - nowMs < BOOKING_MIN_NOTICE_MINUTES * 60_000;
}

export function slotState(
  date: ISODate,
  slotId: string,
  m: MonthAvailability | null,
  nowMs?: number
): SlotAvailability {
  // Too close to start is gone regardless of what the calendar says.
  if (nowMs !== undefined && slotTooSoon(date, slotId, nowMs)) return "busy";
  if (!m) return "unknown";
  if (m.degraded) return "unknown";
  return m.days[date]?.slots[slotId] ?? "free";
}

export function dayState(
  date: ISODate,
  m: MonthAvailability | null,
  bounds: DateBounds,
  nowMs?: number
): DayState {
  if (date < bounds.today) return "past";
  // Inside the lead time, or past the horizon: real dates, just not bookable.
  if (!isBetween(date, bounds.min, bounds.max)) return "outOfRange";

  const states = TIME_SLOTS.map((s) => slotState(date, s.id, m, nowMs));
  // Once every slot is inside the notice window there is nothing left to sell
  // today, even though the calendar itself is empty.
  if (states.every((s) => s === "busy")) return "full";
  if (!m || m.degraded) return "unknown";
  if (states.some((s) => s === "busy")) return "partial";
  return "free";
}

/** A day is selectable unless it is out of range or every slot is taken. */
export function isDaySelectable(state: DayState): boolean {
  return state !== "past" && state !== "outOfRange" && state !== "full";
}

/**
 * Units of `code` still bookable on `date`.
 *
 * Equipment is committed for the WHOLE day (it is billed at the full day rate
 * regardless of slot), and it belongs to no room — so this is not per-space.
 * Returns `fallback` (the static inStock) when availability is unknown.
 */
export function equipmentRemaining(
  date: ISODate | null,
  code: string,
  m: MonthAvailability | null,
  fallback: number
): number {
  if (!date || !m || m.degraded) return fallback;
  const forDate = m.equipmentRemaining[date];
  if (!forDate || forDate[code] === undefined) return fallback;
  return Math.max(0, Math.min(fallback, forDate[code]));
}

/** An all-free month — phase 1's producer, and the fallback when a read fails. */
export function emptyMonth(spaceId: string, month: string, degraded = true): MonthAvailability {
  return {
    spaceId,
    month,
    days: {},
    equipmentRemaining: {},
    degraded,
    fetchedAt: new Date().toISOString(),
  };
}
