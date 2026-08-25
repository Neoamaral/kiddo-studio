/**
 * Writing bookings into the room calendars.
 *
 * One tentative event per room the product occupies. Tentative is what makes
 * the "hold the slot, the studio confirms by hand" model work — and it really
 * does count as busy in freebusy, which scripts/gcal-smoke.ts asserts rather
 * than assumes.
 */

import type { ResourceId } from "@/data/types";
import { slotById, slotTimeLabel } from "@/data/booking";
import { spaceById } from "@/data/spaces";
import { resourcesForSpace, resourceLabel } from "@/data/resources";
import type { Quote } from "@/lib/quote";
import type { ISODate } from "@/lib/date";
import { formatDateHuman } from "@/lib/date";
import { eur } from "@/lib/money";
import { gcalDelete, gcalGet, gcalPost } from "./client";
import { calendarIdFor } from "./calendars";

export interface BookingEventInput {
  ref: string;
  idempotencyKey: string;
  date: ISODate;
  slotId: string;
  spaceId: string;
  name: string;
  email: string;
  company: string;
  crewSize: string;
  brief: string;
  quote: Quote;
}

interface GEvent {
  id: string;
  status?: string;
  created?: string;
  extendedProperties?: { private?: Record<string, string> };
}

/** "CAM-01:1,LNS-02:2" — the machine-readable form the stock count reads. */
function encodeEquipment(quote: Quote): string {
  return quote.equipment.map((e) => `${e.id}:${e.qty}`).join(",");
}

function describe(input: BookingEventInput): string {
  const q = input.quote;
  const gear = [
    ...q.bundles.map((b) => `  ${b.label} — ${eur(b.amount)}`),
    // Names, not codes: this is what the studio reads in the calendar.
    ...q.equipment.map(
      (e) => `  ${e.label}${e.qty > 1 ? ` ×${e.qty}` : ""} — ${eur(e.amount)}`
    ),
  ];
  return [
    `Ref ${input.ref}`,
    `Email: ${input.email}`,
    `Company: ${input.company || "—"}`,
    `Crew: ${input.crewSize || "—"}`,
    `Add-ons: ${q.addons.map((a) => a.label).join(", ") || "—"}`,
    "",
    gear.length ? "Equipment:" : "Equipment: —",
    ...gear,
    "",
    `TOTAL: ${eur(q.total)}`,
    "",
    "Brief:",
    input.brief || "—",
  ].join("\n");
}

function buildEvent(input: BookingEventInput, resource: ResourceId) {
  const slot = slotById(input.slotId);
  const space = spaceById(input.spaceId);
  if (!slot) throw new Error(`unknown slot ${input.slotId}`);

  return {
    summary: `PENDING · ${resourceLabel(resource).toUpperCase()} · ${input.name}`,
    description: describe(input),
    // Wall clock plus IANA zone: Google resolves DST, we never compute an
    // offset. This is why a July 08:00 booking cannot land an hour out.
    start: { dateTime: `${input.date}T${slot.startLocal}:00`, timeZone: "Europe/Lisbon" },
    end: { dateTime: `${input.date}T${slot.endLocal}:00`, timeZone: "Europe/Lisbon" },
    status: "tentative",
    // Explicit: inheriting "transparent" from a template would silently stop
    // every booking from blocking anything.
    transparency: "opaque",
    extendedProperties: {
      private: {
        bookingRef: input.ref,
        idempotencyKey: input.idempotencyKey,
        spaceId: input.spaceId,
        slotId: input.slotId,
        resourceId: resource,
        spaceLabel: space?.label ?? input.spaceId,
        total: String(input.quote.total),
        source: "website",
        equipment: encodeEquipment(input.quote),
      },
    },
  };
}

/** Has this exact submission already been written? Guards double-submit. */
export async function findByIdempotencyKey(
  key: string,
  date: ISODate
): Promise<string | null> {
  if (!key) return null;
  const calId = calendarIdFor("room-cyc");
  const res = await gcalGet<{ items?: GEvent[] }>(
    `/calendars/${encodeURIComponent(calId)}/events`,
    {
      privateExtendedProperty: `idempotencyKey=${key}`,
      timeMin: `${date}T00:00:00Z`,
      timeMax: `${date}T23:59:59Z`,
      singleEvents: "true",
      maxResults: "5",
    }
  );
  const hit = (res.items ?? []).find((e) => e.status !== "cancelled");
  return hit?.extendedProperties?.private?.bookingRef ?? null;
}

export interface WriteResult {
  ok: boolean;
  /** Set when an identical submission had already been written. */
  duplicateOfRef?: string;
}

/**
 * Create the tentative events.
 *
 * NOT ATOMIC for `both`: the write spans two calendars and Google has no
 * multi-calendar transaction. If the second insert fails we delete the first,
 * best-effort, rather than leave the studio half-blocked — correct in the
 * common case, still racy in the pathological one. That is the strongest
 * argument for eventually keeping our own record of bookings.
 */
export async function createTentativeBooking(
  input: BookingEventInput
): Promise<WriteResult> {
  const duplicate = await findByIdempotencyKey(input.idempotencyKey, input.date);
  if (duplicate) return { ok: true, duplicateOfRef: duplicate };

  const resources = resourcesForSpace(input.spaceId);
  if (resources.length === 0) throw new Error(`unknown space ${input.spaceId}`);

  const created: { calId: string; eventId: string }[] = [];
  try {
    for (const resource of resources) {
      const calId = calendarIdFor(resource);
      const ev = await gcalPost<GEvent>(
        `/calendars/${encodeURIComponent(calId)}/events`,
        buildEvent(input, resource),
        { sendUpdates: "none" }
      );
      created.push({ calId, eventId: ev.id });
    }
    return { ok: true };
  } catch (err) {
    for (const c of created) {
      await gcalDelete(`/calendars/${encodeURIComponent(c.calId)}/events/${c.eventId}`, {
        sendUpdates: "none",
      }).catch(() => {
        console.error(`[GCAL] could not roll back ${c.eventId} on ${c.calId}`);
      });
    }
    throw err;
  }
}
