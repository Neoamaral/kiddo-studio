/**
 * Turns busy intervals into a month of availability.
 *
 * WHY THIS IS ITS OWN FILE
 *
 * The site is moving from Google Calendar to its own calendar, and the bet is
 * that no UI changes: BookingCalendar receives availability as a prop
 * precisely so the source can be swapped. The obvious way to keep that promise
 * is a test comparing the two readers' output.
 *
 * This is stronger than a test. Both readers call this function, so they cannot
 * disagree — there is one implementation of the rule, and the readers differ
 * only in where they get the intervals. The test then only has to prove this
 * function is right, which needs no network and no database.
 *
 * Pure: no I/O, no clock beyond the caller's `fetchedAt`, no environment.
 */

import type { DayAvailability, MonthAvailability, SlotAvailability } from "@/data/availability";
import { TIME_SLOTS, slotById } from "@/data/booking";
import { resourcesForSpace } from "@/data/resources";
import type { EquipmentItem, ResourceId } from "@/data/types";
import type { ISODate } from "@/lib/date";
import { daysInMonth, isoDate, parseISO, zonedInstant } from "@/lib/date";

/** Epoch milliseconds, half-open: [start, end). */
export interface BusyInterval {
  start: number;
  end: number;
}

/**
 * Overlap, not equality — this is what makes FULL DAY (09:00–19:00) conflict
 * with a MORNING booking (09:00–13:00) over the shared hours. Half-open, so a
 * 13:00 end does not collide with a 13:00 start.
 */
export function overlaps(a: BusyInterval, b: BusyInterval): boolean {
  return a.start < b.end && a.end > b.start;
}

/** The instants a slot occupies on a given date, in Europe/Lisbon. */
export function slotWindow(date: ISODate, slotId: string): BusyInterval | null {
  const slot = slotById(slotId);
  if (!slot) return null;
  // Wall clock -> instant via Intl, so DST is never computed by hand.
  return {
    start: zonedInstant(date, slot.startLocal),
    end: zonedInstant(date, slot.endLocal),
  };
}

/** "YYYY-MM" -> the dates it contains. */
export function datesInMonth(month: string): ISODate[] {
  const p = parseISO(`${month}-01`);
  if (!p) return [];
  return Array.from({ length: daysInMonth(p.y, p.m1) }, (_, i) => isoDate(p.y, p.m1, i + 1));
}

/**
 * Which slots of which days are taken, for the product the caller asked about.
 *
 * `busyByResource` must cover every resource the product occupies. A resource
 * missing from the map is treated as free, which is only correct when the
 * caller has genuinely established that — hence both readers fail to a
 * `degraded` month rather than calling this with a partial map.
 */
export function buildDays(
  spaceId: string,
  month: string,
  busyByResource: Partial<Record<ResourceId, readonly BusyInterval[]>>
): Record<ISODate, DayAvailability> {
  const resources = resourcesForSpace(spaceId);
  const days: Record<ISODate, DayAvailability> = {};

  for (const date of datesInMonth(month)) {
    const slots: Record<string, SlotAvailability> = {};
    let anyBusy = false;

    for (const slot of TIME_SLOTS) {
      const win = slotWindow(date, slot.id);
      if (!win) continue;
      // THE RULE: the product is free iff every resource it occupies is free.
      // `both` needs no special case — it simply occupies two resources.
      const busy = resources.some((rid) =>
        (busyByResource[rid] ?? []).some((iv) => overlaps(iv, win))
      );
      slots[slot.id] = busy ? "busy" : "free";
      if (busy) anyBusy = true;
    }

    // Sparse: only store days that actually constrain something.
    if (anyBusy) days[date] = { date, slots };
  }

  return days;
}

/**
 * How many units of each item are left, per date.
 *
 * `usedByDate` counts units already committed. Sparse in both directions: a
 * date with nothing committed is absent, and so is an item at full stock —
 * the consumer falls back to `inStock` for anything missing.
 */
export function buildEquipmentRemaining(
  usedByDate: Record<ISODate, Record<string, number>>,
  items: readonly EquipmentItem[]
): Record<ISODate, Record<string, number>> {
  const stock = new Map(items.map((i) => [i.code, i.inStock]));
  const out: Record<ISODate, Record<string, number>> = {};

  for (const [date, used] of Object.entries(usedByDate)) {
    const remaining: Record<string, number> = {};
    for (const [code, count] of Object.entries(used)) {
      const inStock = stock.get(code);
      if (inStock === undefined) continue; // no longer in the catalogue
      remaining[code] = Math.max(0, inStock - count);
    }
    if (Object.keys(remaining).length > 0) out[date] = remaining;
  }

  return out;
}

/** Assembles the whole answer, so both readers return an identical shape. */
export function buildMonth(opts: {
  spaceId: string;
  month: string;
  busyByResource: Partial<Record<ResourceId, readonly BusyInterval[]>>;
  usedByDate: Record<ISODate, Record<string, number>>;
  items: readonly EquipmentItem[];
}): MonthAvailability {
  return {
    spaceId: opts.spaceId,
    month: opts.month,
    days: buildDays(opts.spaceId, opts.month, opts.busyByResource),
    equipmentRemaining: buildEquipmentRemaining(opts.usedByDate, opts.items),
    degraded: false,
    fetchedAt: new Date().toISOString(),
  };
}
