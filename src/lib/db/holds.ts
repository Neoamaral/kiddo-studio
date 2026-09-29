import "server-only";

/**
 * The calendar: which rooms are taken, when.
 *
 * A pending request holds NOTHING. That is deliberate and it matches what the
 * site did before: a request is an enquiry until a human approves it, so two
 * people may ask for the same slot and only one of them can be confirmed. The
 * second confirmation is refused by the database, not by a check in code —
 * see the exclusion constraint in db/migrations/001_bookings.sql.
 *
 * Every instant here is computed by zonedInstant(), the one tested piece of
 * Europe/Lisbon daylight-saving logic in the project. Postgres never does the
 * timezone arithmetic: two implementations of the same DST rule is how a
 * booking ends up an hour wrong between April and October only.
 */

import { resourcesForSpace, resourceLabel } from "@/data/resources";
import { slotById, slotTimeLabel } from "@/data/booking";
import { spaceById } from "@/data/spaces";
import type { ResourceId } from "@/data/types";
import type { ISODate } from "@/lib/date";
import { STUDIO_TZ, addDays, todayInZone, zonedInstant } from "@/lib/date";
import {
  DbError,
  PG,
  WRITE_TIMEOUT_MS,
  db,
  pgCode,
  rows,
  withTimeout,
} from "./client";
import { purgeAvailability } from "./availability-cache";

/** An instant pair, as ISO strings ready to bind. */
function range(startMs: number, endMs: number): [string, string] {
  return [new Date(startMs).toISOString(), new Date(endMs).toISOString()];
}

function slotRange(date: ISODate, slotId: string): [string, string] {
  const slot = slotById(slotId);
  if (!slot) throw new DbError(`Unknown slot "${slotId}"`, 400);
  return range(zonedInstant(date, slot.startLocal), zonedInstant(date, slot.endLocal));
}

/**
 * A whole day, in the studio's timezone.
 *
 * BOTH ends resolved independently, never `start + 24h`. The last Sunday in
 * October is twenty-five hours long, and the naive version would leave its
 * final hour bookable — an hour the studio believes it has off.
 */
function dayRange(date: ISODate): [string, string] {
  return range(zonedInstant(date, "00:00"), zonedInstant(addDays(date, 1), "00:00"));
}

/* ── Confirming ──────────────────────────────────────────────────────────── */

export type ConfirmResult =
  | { ok: true; alreadyConfirmed: boolean }
  | { ok: false; reason: "notFound" }
  | { ok: false; reason: "notABooking" }
  | { ok: false; reason: "clash"; clashes: Clash[] };

export interface Clash {
  resourceId: string;
  resourceLabel: string;
  /** The booking that already has it, when there is one. */
  ref: string | null;
  name: string | null;
  label: string | null;
}

/**
 * Flips the request to confirmed AND takes the rooms, in one statement.
 *
 * One statement, so it cannot half-happen: there is no state where the board
 * says confirmed and the calendar is still free. Nothing needs reading
 * mid-way — the rooms come from the product via resourcesForSpace and the
 * reference is already known — so no transaction is needed to achieve that.
 *
 * Two different failures, two different messages:
 *   23505  this request already holds that room — confirmed twice, which is
 *          not an error, just a second click
 *   23P01  another booking or a blocked day already has it
 */
export async function confirmBooking(ref: string): Promise<ConfirmResult> {
  const sql = db();

  const found = await rows<{
    kind: string;
    status: string;
    date: ISODate | null;
    slot_id: string | null;
    space_id: string | null;
    name: string | null;
  }>(sql`
    select kind, status, date::text as date, slot_id, space_id, name
      from requests where ref = ${ref}
  `);
  const r = found[0];
  if (!r) return { ok: false, reason: "notFound" };
  if (r.kind !== "booking" || !r.date || !r.slot_id || !r.space_id) {
    return { ok: false, reason: "notABooking" };
  }

  const resources = resourcesForSpace(r.space_id);
  if (resources.length === 0) return { ok: false, reason: "notABooking" };

  const [startIso, endIso] = slotRange(r.date, r.slot_id);
  const slot = slotById(r.slot_id);
  const space = spaceById(r.space_id);
  const label = `${ref} · ${slot?.label ?? r.slot_id} · ${space?.label ?? r.space_id}`;

  try {
    const taken = await withTimeout(
      rows<{ id: number }>(sql`
        with confirmed as (
          update requests
             set status = 'confirmed', lost_reason = null
           where ref = ${ref} and status <> 'confirmed'
           returning ref
        )
        insert into holds (resource_id, during, kind, request_ref, label)
        select rid,
               tstzrange(${startIso}::timestamptz, ${endIso}::timestamptz, '[)'),
               'booking',
               confirmed.ref,
               ${label}
          from confirmed, unnest(${[...resources]}::text[]) as rid
        returning id
      `),
      WRITE_TIMEOUT_MS,
      "confirm"
    );

    purgeAvailability();

    /*
     * No rows means the UPDATE matched nothing, which means it was already
     * confirmed. Not an error — the studio clicked twice, or two tabs are
     * open. Idempotent, exactly as the Google version was.
     */
    return { ok: true, alreadyConfirmed: taken.length === 0 };
  } catch (err) {
    const code = pgCode(err);

    if (code === PG.UNIQUE) {
      // This request already holds that room. Same meaning as above, reached
      // by a different route when the status was already 'confirmed'.
      return { ok: true, alreadyConfirmed: true };
    }

    if (code === PG.EXCLUSION) {
      // Say WHICH booking has it. "That slot is taken" without a name is not
      // something the studio can act on.
      const clashes = await rows<Clash>(sql`
        select h.resource_id as "resourceId",
               h.request_ref as ref,
               r.name        as name,
               h.label       as label
          from holds h
          left join requests r on r.ref = h.request_ref
         where h.resource_id = any(${[...resources]}::text[])
           and h.during && tstzrange(${startIso}::timestamptz, ${endIso}::timestamptz, '[)')
      `);
      return {
        ok: false,
        reason: "clash",
        clashes: clashes.map((c) => ({
          ...c,
          resourceLabel: resourceLabel(c.resourceId as ResourceId),
        })),
      };
    }

    throw err;
  }
}

/**
 * Gives the rooms back.
 *
 * Must be called whenever a confirmed booking stops being confirmed. Changing
 * `requests.status` alone would leave the day blocked forever — the exclusion
 * constraint cannot be made status-aware, because status lives on the other
 * table. Holds are the calendar; requests are the history.
 */
export async function releaseBooking(ref: string): Promise<number> {
  const sql = db();
  const gone = await rows<{ id: number }>(sql`
    delete from holds where request_ref = ${ref} returning id
  `);
  purgeAvailability();
  return gone.length;
}

/* ── Blocking time by hand ───────────────────────────────────────────────── */

export type BlockResult =
  | { ok: true; created: number }
  | { ok: false; clashes: Clash[] };

/**
 * Marks time as unavailable, with no booking behind it.
 *
 * ONE ROW PER ROOM. A single row against the cyclorama would leave the black
 * box bookable, because availability is decided per room — the commonest way
 * to get this wrong.
 *
 * Subject to the same exclusion constraint, so a day that already has a
 * confirmed shoot cannot be blocked over. The studio will try; they get told
 * which booking is in the way.
 */
export async function blockTime(opts: {
  date: ISODate;
  /** Omit for the whole day. */
  slotId?: string | null;
  /** Omit for every room. */
  resourceIds?: readonly ResourceId[] | null;
  reason: string;
}): Promise<BlockResult> {
  const sql = db();
  const resources = opts.resourceIds?.length
    ? [...opts.resourceIds]
    : (["room-cyc", "room-blk"] as ResourceId[]);

  const [startIso, endIso] = opts.slotId
    ? slotRange(opts.date, opts.slotId)
    : dayRange(opts.date);

  const slot = opts.slotId ? slotById(opts.slotId) : null;
  const when = slot ? `${slot.label} · ${slotTimeLabel(slot)}` : "ALL DAY";
  const label = `${opts.reason || "Blocked"} · ${when}`;

  try {
    const made = await withTimeout(
      rows<{ id: number }>(sql`
        insert into holds (resource_id, during, kind, request_ref, label)
        select rid,
               tstzrange(${startIso}::timestamptz, ${endIso}::timestamptz, '[)'),
               'blocked',
               null,
               ${label}
          from unnest(${resources}::text[]) as rid
        returning id
      `),
      WRITE_TIMEOUT_MS,
      "block"
    );
    purgeAvailability();
    return { ok: true, created: made.length };
  } catch (err) {
    if (pgCode(err) === PG.EXCLUSION) {
      const clashes = await rows<Clash>(sql`
        select h.resource_id as "resourceId",
               h.request_ref as ref,
               r.name        as name,
               h.label       as label
          from holds h
          left join requests r on r.ref = h.request_ref
         where h.resource_id = any(${resources}::text[])
           and h.during && tstzrange(${startIso}::timestamptz, ${endIso}::timestamptz, '[)')
      `);
      return {
        ok: false,
        clashes: clashes.map((c) => ({
          ...c,
          resourceLabel: resourceLabel(c.resourceId as ResourceId),
        })),
      };
    }
    throw err;
  }
}

export async function unblock(id: number): Promise<boolean> {
  const sql = db();
  // 'blocked' only: a booking's hold is released through releaseBooking, so a
  // stray click on the calendar cannot silently un-confirm a shoot.
  const gone = await rows<{ id: number }>(sql`
    delete from holds where id = ${id} and kind = 'blocked' returning id
  `);
  purgeAvailability();
  return gone.length > 0;
}

/* ── Reading, for the admin calendar ─────────────────────────────────────── */

/**
 * ADMIN ONLY. Carries names, unlike the public availability read.
 *
 * /api/availability must never return any of this — see the privacy note in
 * db/availability.ts. This is behind requireAdmin.
 */
export interface CalendarEntry {
  id: number;
  resourceId: string;
  resourceLabel: string;
  kind: "booking" | "blocked";
  startsAt: string;
  endsAt: string;
  date: ISODate;
  label: string | null;
  ref: string | null;
  name: string | null;
  email: string | null;
  slotId: string | null;
  spaceId: string | null;
  totalCents: number | null;
}

export async function listCalendar(from: ISODate, toExclusive: ISODate): Promise<CalendarEntry[]> {
  const sql = db();
  const [startIso, endIso] = range(
    zonedInstant(from, "00:00"),
    zonedInstant(toExclusive, "00:00")
  );
  const found = await rows<Omit<CalendarEntry, "resourceLabel" | "date">>(sql`
    select h.id,
           h.resource_id as "resourceId",
           h.kind,
           -- ISO instants. The day of the grid they belong to is worked out in
           -- JavaScript below, for the same reason every other instant here is:
           -- one implementation of the timezone rule, and it is not the
           -- database's tzdata version.
           to_char(lower(h.during) at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as "startsAt",
           to_char(upper(h.during) at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as "endsAt",
           h.label,
           h.request_ref as ref,
           r.name,
           r.email,
           r.slot_id     as "slotId",
           r.space_id    as "spaceId",
           r.total_cents as "totalCents"
      from holds h
      left join requests r on r.ref = h.request_ref
     where h.during && tstzrange(${startIso}::timestamptz, ${endIso}::timestamptz, '[)')
     order by lower(h.during), h.resource_id
  `);
  return found.map((e) => ({
    ...e,
    resourceLabel: resourceLabel(e.resourceId as ResourceId),
    date: todayInZone(STUDIO_TZ, new Date(e.startsAt)),
  }));
}
