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
import { TIME_SLOTS, slotById } from "./booking";

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
 * Has this slot already begun?
 *
 * Same-day booking is allowed, so this is what stops the site offering the
 * 08:00 morning slot at six in the evening. Compared as instants via the
 * timezone-aware helper, never by string, so it is correct across DST.
 *
 * `nowMs` is passed in rather than read here: the booking page is statically
 * prerendered, and a clock read during render would bake the build time into
 * the shipped HTML.
 */
export function slotHasStarted(date: ISODate, slotId: string, nowMs: number): boolean {
  const slot = slotById(slotId);
  if (!slot) return false;
  return zonedInstant(date, slot.startLocal) <= nowMs;
}

export function slotState(
  date: ISODate,
  slotId: string,
  m: MonthAvailability | null,
  nowMs?: number
): SlotAvailability {
  // A slot that has begun is gone regardless of what the calendar says.
  if (nowMs !== undefined && slotHasStarted(date, slotId, nowMs)) return "busy";
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
  // Today, once the last slot has begun, there is nothing left to sell — even
  // though the calendar itself is empty.
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
