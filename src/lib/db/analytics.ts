import "server-only";

/**
 * Writing a batch of events, and reading the funnel back.
 *
 * ONE STATEMENT PER BATCH. The house rule from db/client.ts — "every write is
 * a single statement using CTEs, which is atomic without any transaction
 * machinery" — and here it also means one Neon HTTP round trip per flush
 * rather than one per event.
 *
 * jsonb_to_recordset is how a variable-length batch goes through a tagged
 * template driver that only binds scalars. No dynamic SQL, no building a
 * string of N placeholders.
 */

import {
  db,
  isDbConfigured,
  rows,
  withTimeout,
  READ_TIMEOUT_MS,
  WRITE_TIMEOUT_MS,
} from "./client";

export interface SessionInput {
  id: string;
  landingPath: string | null;
  referrerHost: string | null;
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
  paid: boolean;
  device: string | null;
}

export interface EventInput {
  /** Milliseconds before now. The server owns the clock, not the browser. */
  ageMs: number;
  name: string;
  path: string | null;
  step: string | null;
  stepIndex: number | null;
  ref: string | null;
  props: Record<string, unknown>;
}

export async function writeBatch(session: SessionInput, events: EventInput[]): Promise<void> {
  if (!isDbConfigured() || events.length === 0) return;
  const sql = db();

  const payload = JSON.stringify(
    events.map((e) => ({
      // Clamped to six hours: a beacon can be minutes old, a broken clock
      // could claim anything. Ordering survives, nonsense does not.
      age: Math.min(Math.max(0, Math.round(e.ageMs)), 6 * 60 * 60 * 1000),
      name: e.name,
      path: e.path,
      step: e.step,
      step_index: e.stepIndex,
      ref: e.ref,
      props: e.props,
    }))
  );

  await withTimeout(
    sql`
      with s as (
        insert into analytics_sessions
          (id, landing_path, referrer_host, utm_source, utm_medium, utm_campaign,
           paid, device, events, last_at)
        values
          (${session.id}, ${session.landingPath}, ${session.referrerHost},
           ${session.utmSource}, ${session.utmMedium}, ${session.utmCampaign},
           ${session.paid}, ${session.device}, ${events.length}, now())
        on conflict (id) do update
           set last_at = now(),
               events  = analytics_sessions.events + excluded.events
        returning id
      )
      insert into analytics_events
        (session_id, at, name, path, step, step_index, ref, props)
      select (select id from s),
             now() - (e.age || ' milliseconds')::interval,
             e.name, e.path, e.step, e.step_index, e.ref, e.props
        from jsonb_to_recordset(${payload}::jsonb)
          as e(age bigint, name text, path text, step text,
               step_index smallint, ref text, props jsonb)
    `,
    WRITE_TIMEOUT_MS,
    "write analytics batch"
  );
}

/* ── Reading, for the dashboard ──────────────────────────────────────────── */

export interface FunnelRow {
  stepIndex: number;
  step: string;
  sessions: number;
}

export interface Totals {
  sessions: number;
  pageViews: number;
  bookingStarts: number;
  /** From `requests`, not from events: server truth, immune to ad blockers. */
  submitted: number;
  confirmed: number;
  revenueCents: number;
  /** Submissions the events saw, to derive how many visitors consented. */
  submittedSeen: number;
}

export interface NamedCount {
  label: string;
  count: number;
}

export interface Dashboard {
  totals: Totals;
  funnel: FunnelRow[];
  topPages: NamedCount[];
  sources: NamedCount[];
  ctas: NamedCount[];
  devices: NamedCount[];
  gear: NamedCount[];
  /** Raw row count and table size, so a quota problem is visible early. */
  health: { events: number; sizeBytes: number };
}

const EMPTY: Dashboard = {
  totals: {
    sessions: 0, pageViews: 0, bookingStarts: 0,
    submitted: 0, confirmed: 0, revenueCents: 0, submittedSeen: 0,
  },
  funnel: [],
  topPages: [],
  sources: [],
  ctas: [],
  devices: [],
  gear: [],
  health: { events: 0, sizeBytes: 0 },
};

export async function readDashboard(days: number): Promise<Dashboard> {
  if (!isDbConfigured()) return EMPTY;
  const sql = db();
  const since = `${Math.max(1, Math.min(365, days))} days`;

  const [totals, funnel, topPages, sources, ctas, devices, gear, health] = await withTimeout(
    Promise.all([
      rows<Totals>(sql`
        select
          (select count(*)::int from analytics_sessions
            where started_at > now() - ${since}::interval)                      as "sessions",
          (select count(*)::int from analytics_events
            where name = 'page_view' and at > now() - ${since}::interval)       as "pageViews",
          (select count(distinct session_id)::int from analytics_events
            where name = 'booking_step_view' and at > now() - ${since}::interval) as "bookingStarts",
          /*
           * The last two stages come from the requests table, deliberately. They are
           * server-side facts: no ad blocker, no lost beacon and no declined
           * consent can hide a booking that actually happened.
           */
          (select count(*)::int from requests
            where kind = 'booking' and created_at > now() - ${since}::interval) as "submitted",
          (select count(*)::int from requests
            where kind = 'booking' and status in ('confirmed','done')
              and created_at > now() - ${since}::interval)                      as "confirmed",
          (select coalesce(sum(total_cents), 0)::int from requests
            where kind = 'booking' and status in ('confirmed','done')
              and created_at > now() - ${since}::interval)                      as "revenueCents",
          (select count(*)::int from analytics_events
            where name = 'booking_submitted' and at > now() - ${since}::interval) as "submittedSeen"
      `),
      rows<FunnelRow>(sql`
        select step_index::int as "stepIndex",
               min(step) as "step",
               count(distinct session_id)::int as "sessions"
          from analytics_events
         where name = 'booking_step_view'
           and at > now() - ${since}::interval
           and step_index is not null
         group by step_index
         order by step_index
      `),
      rows<NamedCount>(sql`
        select path as "label", count(*)::int as "count"
          from analytics_events
         where name = 'page_view' and path is not null
           and at > now() - ${since}::interval
         group by path order by count(*) desc limit 12
      `),
      rows<NamedCount>(sql`
        select coalesce(nullif(utm_source, ''), referrer_host, 'direct') as "label",
               count(*)::int as "count"
          from analytics_sessions
         where started_at > now() - ${since}::interval
         group by 1 order by count(*) desc limit 12
      `),
      rows<NamedCount>(sql`
        select coalesce(props->>'label', props->>'to', '(unlabelled)') as "label",
               count(*)::int as "count"
          from analytics_events
         where name = 'cta_click' and at > now() - ${since}::interval
         group by 1 order by count(*) desc limit 12
      `),
      rows<NamedCount>(sql`
        select coalesce(device, 'unknown') as "label", count(*)::int as "count"
          from analytics_sessions
         where started_at > now() - ${since}::interval
         group by 1 order by count(*) desc
      `),
      rows<NamedCount>(sql`
        select props->>'code' as "label", count(*)::int as "count"
          from analytics_events
         where name = 'equipment_detail_open' and props ? 'code'
           and at > now() - ${since}::interval
         group by 1 order by count(*) desc limit 12
      `),
      rows<{ events: number; sizeBytes: number }>(sql`
        select (select count(*)::int from analytics_events) as "events",
               pg_total_relation_size('analytics_events')::int as "sizeBytes"
      `),
    ]),
    READ_TIMEOUT_MS * 3,
    "read analytics dashboard"
  );

  return {
    totals: totals[0] ?? EMPTY.totals,
    funnel,
    topPages,
    sources,
    ctas,
    devices,
    gear,
    health: health[0] ?? EMPTY.health,
  };
}
