/**
 * Writing bookings into the room calendars.
 *
 * TWO-STAGE, because the studio confirms with the client before committing:
 *
 *   request  ->  transparency "transparent", status "tentative"
 *                Visible in the calendar as "⏳ PEDIDO", but Google reports it
 *                as FREE, so it does not block the slot and does not stop
 *                anyone else booking it. The event is also the storage: this
 *                project has no database, and the pending booking has to
 *                survive between the request and the studio's click.
 *
 *   confirmed ->  transparency "opaque", status "confirmed"
 *                Now it blocks, and freebusy reports it busy.
 *
 * Only "opaque" counts as busy in freebusy. Getting that backwards would
 * either block every unconfirmed request or never block anything.
 */

import type { ResourceId } from "@/data/types";
import { slotById, slotTimeLabel } from "@/data/booking";
import { spaceById } from "@/data/spaces";
import { resourcesForSpace, resourceLabel } from "@/data/resources";
import type { Quote } from "@/lib/quote";
import type { ISODate } from "@/lib/date";
import { formatDateHuman } from "@/lib/date";
import { eur } from "@/lib/money";
import { gcalDelete, gcalGet, gcalPatch, gcalPost } from "./client";
import { allCalendarIds, calendarIdFor } from "./calendars";

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
    summary: `⏳ PEDIDO · ${resourceLabel(resource).toUpperCase()} · ${input.name}`,
    description: describe(input),
    // Wall clock plus IANA zone: Google resolves DST, we never compute an
    // offset. This is why a July 08:00 booking cannot land an hour out.
    start: { dateTime: `${input.date}T${slot.startLocal}:00`, timeZone: "Europe/Lisbon" },
    end: { dateTime: `${input.date}T${slot.endLocal}:00`, timeZone: "Europe/Lisbon" },
    status: "tentative",
    // TRANSPARENT on purpose: an unconfirmed request must not hold the slot.
    // confirmBooking() flips this to "opaque".
    transparency: "transparent",
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
        // Needed by findBooking() to render the confirmation page and to email
        // the client, without re-parsing the description.
        name: input.name,
        email: input.email,
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
 * Create the pending (non-blocking) events.
 *
 * NOT ATOMIC for `both`: the write spans two calendars and Google has no
 * multi-calendar transaction. If the second insert fails we delete the first,
 * best-effort, rather than leave the studio half-blocked — correct in the
 * common case, still racy in the pathological one. That is the strongest
 * argument for eventually keeping our own record of bookings.
 */
export async function createPendingBooking(
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


/* ── Confirm / decline ───────────────────────────────────────────────────── */

export interface PendingBooking {
  ref: string;
  date: ISODate;
  spaceId: string;
  slotId: string;
  name: string;
  email: string;
  total: string;
  /** Already confirmed — the studio clicked before, or clicked twice. */
  confirmed: boolean;
  events: { calId: string; eventId: string }[];
  description: string;
}

/** Every event carrying this booking reference, across both calendars. */
export async function findBooking(
  ref: string,
  date: ISODate
): Promise<PendingBooking | null> {
  const cals = Object.values(allCalendarIds());
  const events: { calId: string; eventId: string }[] = [];
  let meta: Record<string, string> | undefined;
  let confirmed = false;
  let description = "";

  for (const calId of cals) {
    const res = await gcalGet<{
      items?: (GEvent & {
        description?: string;
        transparency?: string;
        summary?: string;
      })[];
    }>(`/calendars/${encodeURIComponent(calId)}/events`, {
      privateExtendedProperty: `bookingRef=${ref}`,
      timeMin: `${date}T00:00:00Z`,
      timeMax: `${date}T23:59:59Z`,
      singleEvents: "true",
    });

    for (const ev of res.items ?? []) {
      if (ev.status === "cancelled") continue;
      events.push({ calId, eventId: ev.id });
      meta ??= ev.extendedProperties?.private;
      description ||= ev.description ?? "";
      // Anything already opaque means this booking is live.
      if (ev.transparency !== "transparent") confirmed = true;
    }
  }

  if (!meta || events.length === 0) return null;

  return {
    ref,
    date,
    spaceId: meta.spaceId ?? "",
    slotId: meta.slotId ?? "",
    name: meta.name ?? "",
    email: meta.email ?? "",
    total: meta.total ?? "0",
    confirmed,
    events,
    description,
  };
}

/**
 * Make the booking real: opaque (so freebusy reports it busy) and confirmed.
 *
 * Idempotent — clicking the email link twice is expected, and the second click
 * simply re-applies the same state.
 */
export async function confirmBooking(booking: PendingBooking): Promise<void> {
  for (const e of booking.events) {
    await gcalPatch(
      `/calendars/${encodeURIComponent(e.calId)}/events/${e.eventId}`,
      {
        status: "confirmed",
        transparency: "opaque",
        summary: await confirmedSummary(e.calId, booking),
      },
      { sendUpdates: "none" }
    );
  }
}

async function confirmedSummary(calId: string, booking: PendingBooking): Promise<string> {
  const ids = allCalendarIds();
  const resource = (Object.keys(ids) as ResourceId[]).find((r) => ids[r] === calId);
  const room = resource ? resourceLabel(resource).toUpperCase() : "STUDIO";
  return `${room} · ${booking.name}`;
}

/** Remove the request entirely — it never held the slot, so nothing is freed. */
export async function declineBooking(booking: PendingBooking): Promise<void> {
  for (const e of booking.events) {
    await gcalDelete(`/calendars/${encodeURIComponent(e.calId)}/events/${e.eventId}`, {
      sendUpdates: "none",
    }).catch(() => {
      console.error(`[GCAL] could not delete ${e.eventId} while declining ${booking.ref}`);
    });
  }
}
