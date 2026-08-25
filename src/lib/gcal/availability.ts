/**
 * Reads a month of availability out of Google Calendar.
 *
 * Uses freebusy.query, NOT events.list, for the slot data. One request covers
 * both rooms for the whole month, it expands recurrences, it honours
 * transparency (so the studio can put "Nelson away (Free)" on a calendar
 * without blocking bookings) — and, decisively, /api/availability is public
 * and unauthenticated, so events.list there would publish client names, emails
 * and briefs to anyone with curl. freebusy returns intervals and nothing else.
 *
 * Equipment commitments DO need event payloads, so that read is separate,
 * filtered to this site's own events, and aggregated to bare counts before it
 * leaves the server.
 */

import type { ResourceId } from "@/data/types";
import type {
  DayAvailability,
  MonthAvailability,
  SlotAvailability,
} from "@/data/availability";
import { emptyMonth } from "@/data/availability";
import { TIME_SLOTS, slotById } from "@/data/booking";
import { ALL_ITEMS } from "@/data/equipment";
import { resourcesForSpace } from "@/data/resources";
import type { ISODate } from "@/lib/date";
import { addDays, daysInMonth, isoDate, parseISO, zonedInstant } from "@/lib/date";
import { unstable_cache, revalidateTag } from "next/cache";
import { gcalGet, gcalPost } from "./client";
import { calendarIdFor } from "./calendars";

/** Everything cached from the calendar hangs off this tag. */
export const AVAILABILITY_TAG = "availability";

interface BusyInterval {
  start: number;
  end: number;
}

interface FreeBusyResponse {
  calendars: Record<
    string,
    { busy?: { start: string; end: string }[]; errors?: { reason: string }[] }
  >;
}

interface EventListResponse {
  items?: {
    status?: string;
    description?: string;
    transparency?: string;
    start?: { date?: string; dateTime?: string };
    extendedProperties?: { private?: Record<string, string> };
  }[];
  nextPageToken?: string;
}

/**
 * Overlap, not equality — this is what makes FULL DAY (08:00–19:00) conflict
 * with an EVENING booking (18:00–22:00) over the shared hour.
 */
function overlaps(a: BusyInterval, b: BusyInterval): boolean {
  return a.start < b.end && a.end > b.start;
}

function slotWindow(date: ISODate, slotId: string): BusyInterval | null {
  const slot = slotById(slotId);
  if (!slot) return null;
  // Wall clock -> instant via Intl, so DST is never computed by hand.
  return {
    start: zonedInstant(date, slot.startLocal),
    end: zonedInstant(date, slot.endLocal),
  };
}

/** "YYYY-MM" -> the dates it contains. */
function datesInMonth(month: string): ISODate[] {
  const p = parseISO(`${month}-01`);
  if (!p) return [];
  return Array.from({ length: daysInMonth(p.y, p.m1) }, (_, i) =>
    isoDate(p.y, p.m1, i + 1)
  );
}

export async function readMonthAvailability(
  spaceId: string,
  month: string
): Promise<MonthAvailability> {
  const resources = resourcesForSpace(spaceId);
  if (resources.length === 0) return emptyMonth(spaceId, month, true);

  const dates = datesInMonth(month);
  if (dates.length === 0) return emptyMonth(spaceId, month, true);

  /*
   * Over-fetch by a day either side. freebusy's timeMin/timeMax want an
   * RFC3339 instant, and padding removes the need to reason about which UTC
   * offset the month boundary falls on. Two spare days cost nothing.
   */
  const timeMin = `${addDays(dates[0], -1)}T00:00:00Z`;
  const timeMax = `${addDays(dates[dates.length - 1], 2)}T00:00:00Z`;

  // Always query BOTH rooms: equipment is shared across them, and `both`
  // needs each one anyway.
  const roomIds: Record<ResourceId, string> = {
    "room-cyc": calendarIdFor("room-cyc"),
    "room-blk": calendarIdFor("room-blk"),
  };

  const fb = await gcalPost<FreeBusyResponse>("/freeBusy", {
    timeMin,
    timeMax,
    items: Object.values(roomIds).map((id) => ({ id })),
  });

  // A per-calendar error means we did NOT see that room's bookings. Claiming
  // "free" on the strength of a failed read is exactly how you double-book.
  const errors = Object.values(fb.calendars ?? {}).flatMap((c) => c.errors ?? []);
  if (errors.length > 0) {
    console.error("[GCAL] freebusy returned per-calendar errors", errors);
    return emptyMonth(spaceId, month, true);
  }

  const busyByResource = {} as Record<ResourceId, BusyInterval[]>;
  for (const [rid, calId] of Object.entries(roomIds) as [ResourceId, string][]) {
    busyByResource[rid] = (fb.calendars?.[calId]?.busy ?? []).map((b) => ({
      start: Date.parse(b.start),
      end: Date.parse(b.end),
    }));
  }

  const days: Record<ISODate, DayAvailability> = {};
  for (const date of dates) {
    const slots: Record<string, SlotAvailability> = {};
    let anyBusy = false;

    for (const slot of TIME_SLOTS) {
      const win = slotWindow(date, slot.id);
      if (!win) continue;
      // THE RULE: the product is free iff every resource it occupies is free.
      const busy = resources.some((rid) =>
        (busyByResource[rid] ?? []).some((iv) => overlaps(iv, win))
      );
      slots[slot.id] = busy ? "busy" : "free";
      if (busy) anyBusy = true;
    }
    // Sparse: only store days that actually constrain something.
    if (anyBusy) days[date] = { date, slots };
  }

  const equipmentRemaining = await readEquipmentRemaining(
    Object.values(roomIds),
    timeMin,
    timeMax
  );

  return {
    spaceId,
    month,
    days,
    equipmentRemaining,
    degraded: false,
    fetchedAt: new Date().toISOString(),
  };
}

/** `CAM-01:1,LNS-02:2` — what the booking route writes on the event. */
function parseEquipmentProperty(value: string | undefined): Record<string, number> {
  const out: Record<string, number> = {};
  if (!value) return out;
  for (const part of value.split(",")) {
    const [code, qty] = part.split(":");
    const n = Number(qty);
    if (code && Number.isFinite(n) && n > 0) out[code.trim()] = n;
  }
  return out;
}

/**
 * `EQUIP: CAM-01 x1, LNS-02 x2` in the description of a hand-entered booking.
 *
 * Bookings the studio types straight into Calendar carry no extended
 * properties, so without this convention their gear is invisible to the count
 * and the site would happily promise a camera that is already out. It is not
 * proof against someone forgetting the line — that limitation is documented.
 */
function parseEquipmentFromDescription(desc: string | undefined): Record<string, number> {
  const out: Record<string, number> = {};
  if (!desc) return out;
  const line = /^\s*EQUIP:\s*(.+)$/im.exec(desc);
  if (!line) return out;
  for (const part of line[1].split(",")) {
    const m = /([A-Za-z0-9-]+)\s*[x×]\s*(\d+)/i.exec(part);
    if (m) out[m[1].toUpperCase()] = Number(m[2]);
  }
  return out;
}

function eventDate(ev: { start?: { date?: string; dateTime?: string } }): ISODate | null {
  const raw = ev.start?.date ?? ev.start?.dateTime;
  return raw ? raw.slice(0, 10) : null;
}

/**
 * Units of each item still free, per date.
 *
 * Reads event payloads — which freebusy cannot give — but aggregates to bare
 * counts here on the server, so the public endpoint never emits a client name.
 * Equipment belongs to no room, so both calendars are counted together, and
 * the granularity is the whole day because gear is billed at the full day rate
 * whatever the slot.
 */
async function readEquipmentRemaining(
  calendarIds: string[],
  timeMin: string,
  timeMax: string
): Promise<Record<ISODate, Record<string, number>>> {
  const committed: Record<ISODate, Record<string, number>> = {};

  for (const calId of calendarIds) {
    let pageToken: string | undefined;
    do {
      const res: EventListResponse = await gcalGet<EventListResponse>(
        `/calendars/${encodeURIComponent(calId)}/events`,
        {
          timeMin,
          timeMax,
          singleEvents: "true",
          maxResults: "2500",
          pageToken,
        }
      );
      for (const ev of res.items ?? []) {
        if (ev.status === "cancelled") continue;
        // Unconfirmed requests are transparent: they do not hold the slot, so
        // they must not hold the gear either. Counting them would let a single
        // un-actioned request make an item look sold out indefinitely.
        if (ev.transparency === "transparent") continue;
        const date = eventDate(ev);
        if (!date) continue;

        const fromProps = parseEquipmentProperty(ev.extendedProperties?.private?.equipment);
        const fromDesc = parseEquipmentFromDescription(ev.description);
        const merged = { ...fromDesc, ...fromProps };
        if (Object.keys(merged).length === 0) continue;

        committed[date] ??= {};
        for (const [code, qty] of Object.entries(merged)) {
          committed[date][code] = (committed[date][code] ?? 0) + qty;
        }
      }
      pageToken = res.nextPageToken;
    } while (pageToken);
  }

  const remaining: Record<ISODate, Record<string, number>> = {};
  for (const [date, counts] of Object.entries(committed)) {
    remaining[date] = {};
    for (const [code, used] of Object.entries(counts)) {
      const item = ALL_ITEMS.find((i) => i.code === code);
      if (!item) continue;
      remaining[date][code] = Math.max(0, item.inStock - used);
    }
  }
  return remaining;
}


/**
 * Cached read, purgeable the instant a booking changes.
 *
 * The CDN cannot do this job: a Cache-Control max-age is a promise about time,
 * and there is no way to take it back when the studio approves a request. That
 * showed up as 80 seconds of the site still advertising a slot that had just
 * been confirmed — long enough for a second client to book it and only find
 * out at the conflict screen.
 *
 * So the response itself is uncacheable and the expensive part — the Google
 * round trip — is cached here instead, keyed by tag. confirm/decline calls
 * purgeAvailability() and the very next request is fresh.
 */
export function readMonthAvailabilityCached(
  spaceId: string,
  month: string
): Promise<MonthAvailability> {
  return unstable_cache(
    () => readMonthAvailability(spaceId, month),
    ["availability", spaceId, month],
    { tags: [AVAILABILITY_TAG], revalidate: 60 }
  )();
}

export function purgeAvailability(): void {
  revalidateTag(AVAILABILITY_TAG);
}
