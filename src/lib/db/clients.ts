import "server-only";

/**
 * The CRM: people, and everything they have ever asked for.
 *
 * WHY NOTHING HERE IS STORED
 *
 * Total spend, last visit and the number of shoots are computed by query every
 * time. Kept as columns they would need updating on every change to every
 * request, and the first one anybody forgot would leave a figure that is
 * confidently wrong — which is worse than no figure. The tables are small and
 * the aggregate is cheap.
 *
 * WHAT COUNTS AS SPEND
 *
 * Only confirmed and completed work. Counting enquiries would flatter every
 * number on the page and make the studio's best-looking clients the ones who
 * never booked.
 */

import { db, rows } from "./client";
import type { ISODate } from "@/lib/date";
import type { Quote } from "@/lib/quote";
import type { RequestKind, RequestStatus } from "./requests";

export interface ClientRow {
  id: string;
  email: string;
  name: string | null;
  phone: string | null;
  company: string | null;
  tags: string[];
  createdAt: string;
  /** Confirmed and completed only. */
  bookings: number;
  /** Everything, including enquiries that went nowhere. */
  enquiries: number;
  /** Cents, confirmed and completed only. */
  spentCents: number;
  /** The most recent confirmed date, past or future. */
  lastDate: ISODate | null;
  /** The next confirmed date from today onwards. */
  nextDate: ISODate | null;
}

/**
 * `todayInLisbon()` is passed in rather than read from the database.
 *
 * `date >= now()` would cast through the session timezone, which is UTC on a
 * managed Postgres — so late in the evening the studio's "upcoming" would
 * already have rolled over. One source of truth for what day it is, and it is
 * not the database.
 */
export async function listClients(today: ISODate, limit = 500): Promise<ClientRow[]> {
  const sql = db();
  return rows<ClientRow>(sql`
    select c.id,
           c.email,
           c.name,
           c.phone,
           c.company,
           c.tags,
           c.created_at::text as "createdAt",
           count(r.ref) filter (where r.status in ('confirmed','done'))::int as bookings,
           count(r.ref)::int as enquiries,
           coalesce(sum(r.total_cents) filter (where r.status in ('confirmed','done')), 0)::int
             as "spentCents",
           max(r.date) filter (where r.status in ('confirmed','done'))::text as "lastDate",
           min(r.date) filter (
             where r.status in ('confirmed','done') and r.date >= ${today}::date
           )::text as "nextDate"
      from clients c
      left join requests r on r.client_id = c.id
     group by c.id
     order by max(r.created_at) desc nulls last, c.created_at desc
     limit ${limit}
  `);
}

export interface ClientHistoryItem {
  ref: string;
  kind: RequestKind;
  status: RequestStatus;
  date: ISODate | null;
  slotId: string | null;
  spaceId: string | null;
  totalCents: number | null;
  createdAt: string;
  brief: string | null;
  /** Frozen at request time. Render it; never recompute. */
  quote: Quote | null;
}

export interface ClientDetail extends ClientRow {
  notes: string;
  history: ClientHistoryItem[];
}

export async function getClient(id: string, today: ISODate): Promise<ClientDetail | null> {
  const sql = db();
  const found = await rows<ClientRow & { notes: string }>(sql`
    select c.id,
           c.email,
           c.name,
           c.phone,
           c.company,
           c.tags,
           c.notes,
           c.created_at::text as "createdAt",
           count(r.ref) filter (where r.status in ('confirmed','done'))::int as bookings,
           count(r.ref)::int as enquiries,
           coalesce(sum(r.total_cents) filter (where r.status in ('confirmed','done')), 0)::int
             as "spentCents",
           max(r.date) filter (where r.status in ('confirmed','done'))::text as "lastDate",
           min(r.date) filter (
             where r.status in ('confirmed','done') and r.date >= ${today}::date
           )::text as "nextDate"
      from clients c
      left join requests r on r.client_id = c.id
     where c.id = ${id}::uuid
     group by c.id
  `);
  if (found.length === 0) return null;

  const history = await rows<ClientHistoryItem>(sql`
    select ref, kind, status,
           date::text       as "date",
           slot_id          as "slotId",
           space_id         as "spaceId",
           total_cents      as "totalCents",
           created_at::text as "createdAt",
           brief,
           quote
      from requests
     where client_id = ${id}::uuid
     order by created_at desc
  `);

  return { ...found[0], history };
}

export async function updateClient(
  id: string,
  patch: { notes?: string; tags?: string[]; name?: string; phone?: string; company?: string }
): Promise<boolean> {
  const sql = db();
  /*
   * coalesce on the parameter, so an omitted field is left alone rather than
   * blanked. The panel sends whole records, but a future caller sending one
   * field should not wipe the rest.
   */
  const updated = await rows<{ id: string }>(sql`
    update clients
       set notes   = coalesce(${patch.notes ?? null}, notes),
           tags    = coalesce(${patch.tags ? [...patch.tags] : null}::text[], tags),
           name    = coalesce(${patch.name ?? null}, name),
           phone   = coalesce(${patch.phone ?? null}, phone),
           company = coalesce(${patch.company ?? null}, company)
     where id = ${id}::uuid
     returning id
  `);
  return updated.length > 0;
}

/**
 * Erases a person and everything they sent.
 *
 * Declining used to hard-delete the calendar event, so a refused enquiry
 * genuinely evaporated. Rows persist now, which brings a retention obligation
 * with them, and this is the path that honours it. Requests go first so their
 * holds go with them through `on delete cascade` — leaving the rooms blocked
 * by a booking whose owner no longer exists would be the worst of both.
 */
export async function deleteClient(id: string): Promise<{ requests: number }> {
  const sql = db();
  const gone = await rows<{ ref: string }>(sql`
    delete from requests where client_id = ${id}::uuid returning ref
  `);
  await sql`delete from clients where id = ${id}::uuid`;
  return { requests: gone.length };
}
