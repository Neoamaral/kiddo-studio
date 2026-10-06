// Proves readDashboard's eight queries actually execute, against kiddo_test.
// Run with: node --env-file=.env.local scripts/check-dashboard.mjs
import { neon } from "@neondatabase/serverless";
const url = process.env.TEST_DATABASE_URL;
if (!url) { console.error("TEST_DATABASE_URL missing"); process.exit(1); }
const sql = neon(url);
const since = "30 days";

const QUERIES = {
  totals: () => sql`
    select
      (select count(*)::int from analytics_sessions
        where started_at > now() - ${since}::interval)                      as "sessions",
      (select count(*)::int from analytics_events
        where name = 'page_view' and at > now() - ${since}::interval)       as "pageViews",
      (select count(distinct session_id)::int from analytics_events
        where name = 'booking_step_view' and at > now() - ${since}::interval) as "bookingStarts",
      (select count(*)::int from requests
        where kind = 'booking' and created_at > now() - ${since}::interval) as "submitted",
      (select count(*)::int from requests
        where kind = 'booking' and status in ('confirmed','done')
          and created_at > now() - ${since}::interval)                      as "confirmed",
      (select coalesce(sum(total_cents), 0)::int from requests
        where kind = 'booking' and status in ('confirmed','done')
          and created_at > now() - ${since}::interval)                      as "revenueCents",
      (select count(*)::int from analytics_events
        where name = 'booking_submitted' and at > now() - ${since}::interval) as "submittedSeen"`,
  funnel: () => sql`
    select step_index::int as "stepIndex", min(step) as "step",
           count(distinct session_id)::int as "sessions"
      from analytics_events
     where name = 'booking_step_view' and at > now() - ${since}::interval
       and step_index is not null
     group by step_index order by step_index`,
  topPages: () => sql`
    select path as "label", count(*)::int as "count" from analytics_events
     where name = 'page_view' and path is not null and at > now() - ${since}::interval
     group by path order by count(*) desc limit 12`,
  sources: () => sql`
    select coalesce(nullif(utm_source, ''), referrer_host, 'direct') as "label",
           count(*)::int as "count" from analytics_sessions
     where started_at > now() - ${since}::interval
     group by 1 order by count(*) desc limit 12`,
  ctas: () => sql`
    select coalesce(props->>'label', props->>'to', '(unlabelled)') as "label",
           count(*)::int as "count" from analytics_events
     where name = 'cta_click' and at > now() - ${since}::interval
     group by 1 order by count(*) desc limit 12`,
  devices: () => sql`
    select coalesce(device, 'unknown') as "label", count(*)::int as "count"
      from analytics_sessions where started_at > now() - ${since}::interval
     group by 1 order by count(*) desc`,
  gear: () => sql`
    select props->>'code' as "label", count(*)::int as "count" from analytics_events
     where name = 'equipment_detail_open' and props ? 'code'
       and at > now() - ${since}::interval
     group by 1 order by count(*) desc limit 12`,
  health: () => sql`
    select (select count(*)::int from analytics_events) as "events",
           pg_total_relation_size('analytics_events')::int as "sizeBytes"`,
};

let bad = 0;
for (const [name, run] of Object.entries(QUERIES)) {
  try {
    const r = await run();
    console.log(`  ok  ${name.padEnd(10)} ${r.length} row(s)  ${JSON.stringify(r[0] ?? {}).slice(0, 110)}`);
  } catch (e) {
    bad++;
    console.log(`  FAIL ${name}: ${e.message}`);
  }
}
console.log(bad === 0 ? "\nall eight queries execute" : `\n${bad} FAILED`);
process.exit(bad === 0 ? 0 : 1);
