/**
 * Parsing and validation for an inbound booking.
 *
 * Pure and I/O-free, mirroring quote.ts's "report, don't throw" convention, so
 * it can be unit-checked and reused by any future endpoint.
 *
 * Lengths are capped because in phase 2 these strings land in a Google Calendar
 * event description, and the date is range-checked because nothing else stops
 * someone POSTing a booking for the year 2400.
 */

import type { ISODate } from "@/lib/date";
import { addDays, isBetween, parseISO } from "@/lib/date";
import { BOOKING_HORIZON_DAYS, BOOKING_LEAD_TIME_DAYS, selectedAddonIds } from "@/data/booking";

export interface BookingRequest {
  name: string;
  email: string;
  company: string;
  crewSize: string;
  brief: string;
  date: ISODate;
  slotId: string;
  spaceId: string;
  addonIds: string[];
  equipment: Record<string, number>;
  bundleIds: string[];
  clientTotal: number | null;
  idempotencyKey: string;
}

export type ParseResult =
  | { ok: true; value: BookingRequest }
  | { ok: false; error: string };

const LIMITS = { name: 200, email: 320, company: 200, crewSize: 200, brief: 2000 };

function str(v: unknown, max: number): string {
  return typeof v === "string" ? v.trim().slice(0, max) : "";
}

/** Deliberately permissive — an over-strict email regex rejects real addresses. */
function looksLikeEmail(v: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}

export function parseBookingRequest(body: unknown, today: ISODate): ParseResult {
  if (!body || typeof body !== "object") return { ok: false, error: "Malformed request" };
  const b = body as Record<string, unknown>;

  // Honeypot: a real person never fills a field they cannot see.
  if (str(b.website, 100)) return { ok: false, error: "Rejected" };

  const name = str(b.name, LIMITS.name);
  const email = str(b.email, LIMITS.email);
  if (!name) return { ok: false, error: "Name is required" };
  if (!email) return { ok: false, error: "Email is required" };
  if (!looksLikeEmail(email)) return { ok: false, error: "That email doesn't look right" };

  const date = str(b.date, 10);
  if (!parseISO(date)) {
    return { ok: false, error: "Date must be a real calendar date in YYYY-MM-DD form" };
  }
  const min = addDays(today, BOOKING_LEAD_TIME_DAYS);
  const max = addDays(today, BOOKING_HORIZON_DAYS);
  if (!isBetween(date, min, max)) {
    return { ok: false, error: `Date must fall between ${min} and ${max}` };
  }

  const slotId = str(b.slot, 20);
  const spaceId = str(b.space, 20);
  if (!slotId) return { ok: false, error: "Slot is required" };
  if (!spaceId) return { ok: false, error: "Space is required" };

  // The client sends the add-on state map; ids are validated by computeQuote.
  const addonIds =
    b.addons && typeof b.addons === "object"
      ? selectedAddonIds(b.addons as Record<string, boolean>)
      : [];

  const equipment: Record<string, number> = {};
  if (b.equipment && typeof b.equipment === "object") {
    for (const [code, qty] of Object.entries(b.equipment as Record<string, unknown>)) {
      const n = Math.floor(Number(qty));
      if (!Number.isFinite(n) || n <= 0) continue;
      if (n > 99) return { ok: false, error: `Implausible quantity for ${code}` };
      equipment[str(code, 40)] = n;
    }
  }

  const bundleIds = Array.isArray(b.bundleIds)
    ? b.bundleIds.map((x) => str(x, 40)).filter(Boolean)
    : [];

  const rawTotal = Number(b.total);
  const clientTotal = Number.isFinite(rawTotal) ? rawTotal : null;

  const idempotencyKey = str(b.idempotencyKey, 100);

  return {
    ok: true,
    value: {
      name,
      email,
      company: str(b.company, LIMITS.company),
      crewSize: str(b.crewSize, LIMITS.crewSize),
      brief: str(b.brief, LIMITS.brief),
      date,
      slotId,
      spaceId,
      addonIds,
      equipment,
      bundleIds,
      clientTotal,
      idempotencyKey,
    },
  };
}
