import "server-only";

/**
 * Everything that arrives from the site: booking requests and contact
 * messages, in one table.
 *
 * WHY ONE TABLE
 *
 * A message legitimately becomes a booking — the studio talks to someone who
 * wrote in, and fills in a date. One table means that is an UPDATE, not a
 * migration between tables. The kanban is one query, and both kinds hang off
 * the same client. The columns that do not apply to a message are kept null by
 * check constraints in the migration, not by convention.
 *
 * WHY EVERY WRITE IS ONE STATEMENT
 *
 * No transactions, no interactive round trips, and therefore no connection
 * pool — see src/lib/db/client.ts. A single statement with CTEs is atomic on
 * its own, and the one thing that genuinely needed to be read mid-transaction
 * (the client's id) is resolved inside the statement instead.
 */

import type { Quote } from "@/lib/quote";
import type { ISODate } from "@/lib/date";
import { DbError, WRITE_TIMEOUT_MS, db, rows, withTimeout } from "./client";

export type RequestKind = "booking" | "message";
export type RequestStatus = "new" | "talking" | "confirmed" | "done" | "lost";

/** In the order they appear on the board. */
export const STATUSES: readonly RequestStatus[] = [
  "new",
  "talking",
  "confirmed",
  "done",
  "lost",
];

export const STATUS_LABELS: Record<RequestStatus, string> = {
  new: "NEW",
  talking: "IN CONVERSATION",
  confirmed: "CONFIRMED",
  done: "COMPLETED",
  lost: "LOST",
};

/* ── Inserting ───────────────────────────────────────────────────────────── */

export interface BookingInsert {
  ref: string;
  name: string;
  email: string;
  phone: string;
  company: string;
  crewSize: string;
  brief: string;
  date: ISODate;
  slotId: string;
  spaceId: string;
  packageId: string;
  addonIds: readonly string[];
  bundleIds: readonly string[];
  equipment: Readonly<Record<string, number>>;
  quote: Quote;
  /** null when the caller sent none. NEVER "" — see the parser and the schema. */
  idempotencyKey: string | null;
}

export interface MessageInsert {
  ref: string;
  name: string;
  email: string;
  phone: string;
  company: string;
  /** The subject line becomes the first line of the brief. */
  subject: string;
  message: string;
}

export interface InsertResult {
  ref: string;
  /** True when this exact submission had already been stored. */
  duplicate: boolean;
}

/**
 * The client upsert, as a CTE that ALWAYS returns a row.
 *
 * `on conflict do nothing` here would be a trap: an existing client returns
 * zero rows, the outer `insert ... select ... from c` then inserts nothing, and
 * the booking is lost with no error at all. `do update` guarantees a row.
 *
 * The coalesce matters too. A later, sloppier submission — someone who types
 * only their first name — must not blank a company or phone the studio has
 * since curated on the client record.
 */
export async function insertBooking(b: BookingInsert): Promise<InsertResult> {
  const sql = db();
  const totalCents = Math.round(b.quote.total * 100);

  const inserted = await withTimeout(
    rows<{ ref: string }>(sql`
      with c as (
        insert into clients (email, name, phone, company)
        values (lower(${b.email}), nullif(${b.name},''), nullif(${b.phone},''), nullif(${b.company},''))
        on conflict (email) do update set
          name    = coalesce(excluded.name,    clients.name),
          phone   = coalesce(excluded.phone,   clients.phone),
          company = coalesce(excluded.company, clients.company),
          updated_at = now()
        returning id
      )
      insert into requests (
        ref, kind, status, client_id,
        name, email, phone, company, crew_size, brief,
        date, slot_id, space_id, package_id,
        addon_ids, bundle_ids, equipment,
        quote, total_cents, idempotency_key
      )
      select ${b.ref}, 'booking', 'new', c.id,
             ${b.name}, lower(${b.email}), ${b.phone}, ${b.company}, ${b.crewSize}, ${b.brief},
             ${b.date}::date, ${b.slotId}, ${b.spaceId}, ${b.packageId},
             ${[...b.addonIds]}::text[], ${[...b.bundleIds]}::text[],
             ${JSON.stringify(b.equipment)}::jsonb,
             ${JSON.stringify(b.quote)}::jsonb, ${totalCents}, ${b.idempotencyKey}
        from c
      on conflict (idempotency_key) do nothing
      returning ref
    `),
    WRITE_TIMEOUT_MS,
    "booking insert"
  );

  if (inserted.length > 0) return { ref: inserted[0].ref, duplicate: false };

  /*
   * Zero rows means the idempotency key was already stored — the same
   * submission arriving twice. Answer with the ORIGINAL reference rather than
   * an error, which is what the customer's browser is expecting after a retry.
   */
  const existing = await rows<{ ref: string }>(sql`
    select ref from requests where idempotency_key = ${b.idempotencyKey}
  `);
  if (existing.length > 0) return { ref: existing[0].ref, duplicate: true };

  // Neither inserted nor found: the conflict was on something else.
  throw new DbError("The request could not be stored.", 500);
}

export async function insertMessage(m: MessageInsert): Promise<InsertResult> {
  const sql = db();
  const brief = [m.subject && `Subject: ${m.subject}`, m.message]
    .filter(Boolean)
    .join("\n\n");

  const inserted = await withTimeout(
    rows<{ ref: string }>(sql`
      with c as (
        insert into clients (email, name, phone, company)
        values (lower(${m.email}), nullif(${m.name},''), nullif(${m.phone},''), nullif(${m.company},''))
        on conflict (email) do update set
          name    = coalesce(excluded.name,    clients.name),
          phone   = coalesce(excluded.phone,   clients.phone),
          company = coalesce(excluded.company, clients.company),
          updated_at = now()
        returning id
      )
      insert into requests (ref, kind, status, client_id, name, email, phone, company, brief)
      select ${m.ref}, 'message', 'new', c.id,
             ${m.name}, lower(${m.email}), ${m.phone}, ${m.company}, ${brief}
        from c
      returning ref
    `),
    WRITE_TIMEOUT_MS,
    "message insert"
  );
  if (inserted.length === 0) throw new DbError("The message could not be stored.", 500);
  return { ref: inserted[0].ref, duplicate: false };
}

/* ── Reading ─────────────────────────────────────────────────────────────── */

/** What a kanban card shows. Deliberately not the whole row. */
export interface BoardCard {
  ref: string;
  kind: RequestKind;
  status: RequestStatus;
  name: string | null;
  email: string | null;
  company: string | null;
  date: ISODate | null;
  slotId: string | null;
  spaceId: string | null;
  totalCents: number | null;
  createdAt: string;
  updatedAt: string;
  /** First line of the brief, for the card. */
  preview: string | null;
}

export async function listBoard(limit = 400): Promise<BoardCard[]> {
  const sql = db();
  return rows<BoardCard>(sql`
    select ref,
           kind,
           status,
           name,
           email,
           company,
           date::text                       as "date",
           slot_id                          as "slotId",
           space_id                         as "spaceId",
           total_cents                      as "totalCents",
           created_at::text                 as "createdAt",
           updated_at::text                 as "updatedAt",
           nullif(left(coalesce(brief,''), 160), '') as preview
      from requests
     order by created_at desc
     limit ${limit}
  `);
}

/** The whole row, for the detail panel. Admin only. */
export interface RequestDetail extends BoardCard {
  clientId: string | null;
  phone: string | null;
  crewSize: string | null;
  brief: string | null;
  packageId: string | null;
  addonIds: string[];
  bundleIds: string[];
  equipment: Record<string, number> | null;
  /**
   * The quote as it was sent. RENDER IT, never recompute it: the rate card is
   * editable, so recomputing would silently re-price an old enquiry and the
   * figure here would stop matching the one the customer received.
   */
  quote: Quote | null;
  lostReason: string | null;
  notes: string;
}

export async function getRequest(ref: string): Promise<RequestDetail | null> {
  const sql = db();
  const found = await rows<RequestDetail>(sql`
    select ref, kind, status,
           client_id        as "clientId",
           name, email, phone, company,
           crew_size        as "crewSize",
           brief,
           date::text       as "date",
           slot_id          as "slotId",
           space_id         as "spaceId",
           package_id       as "packageId",
           addon_ids        as "addonIds",
           bundle_ids       as "bundleIds",
           equipment,
           quote,
           total_cents      as "totalCents",
           lost_reason      as "lostReason",
           notes,
           created_at::text as "createdAt",
           updated_at::text as "updatedAt",
           nullif(left(coalesce(brief,''), 160), '') as preview
      from requests
     where ref = ${ref}
  `);
  return found[0] ?? null;
}

/* ── Changing ────────────────────────────────────────────────────────────── */

/**
 * Moves a card between columns.
 *
 * Confirming is NOT done here: it has to take the rooms in the same statement,
 * so it lives in holds.ts. This handles every other move, and clears the hold
 * when a confirmed booking leaves the confirmed column — otherwise flipping a
 * booking to "lost" would leave the day blocked forever.
 */
export async function setStatus(
  ref: string,
  status: Exclude<RequestStatus, "confirmed">,
  lostReason?: string
): Promise<boolean> {
  const sql = db();
  const updated = await rows<{ ref: string }>(sql`
    update requests
       set status = ${status},
           lost_reason = case when ${status} = 'lost' then ${lostReason ?? null} else null end
     where ref = ${ref}
     returning ref
  `);
  return updated.length > 0;
}

export async function setNotes(ref: string, notes: string): Promise<boolean> {
  const sql = db();
  const updated = await rows<{ ref: string }>(sql`
    update requests set notes = ${notes} where ref = ${ref} returning ref
  `);
  return updated.length > 0;
}

/**
 * Permanent erasure, for a subject-access request.
 *
 * Declining used to hard-delete the calendar event, so a refused enquiry
 * genuinely evaporated. Rows persist now, which brings a retention obligation
 * with them — this is the path that honours it. The hold goes with the request
 * through `on delete cascade`.
 */
export async function deleteRequest(ref: string): Promise<boolean> {
  const sql = db();
  const gone = await rows<{ ref: string }>(sql`
    delete from requests where ref = ${ref} returning ref
  `);
  return gone.length > 0;
}
