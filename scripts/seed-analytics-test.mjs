// Seeds kiddo_test THROUGH THE REAL writeBatch STATEMENT, then reads the funnel
// back. The point is the CTE + jsonb_to_recordset, which is the riskiest SQL in
// the analytics path: a variable-length batch going through a driver that only
// binds scalars.
import { neon } from "@neondatabase/serverless";
const url = process.env.TEST_DATABASE_URL;
const sql = neon(url);

const STEPS = ["space", "package", "date", "slot", "addons", "equipment", "details"];
// How many of the 12 sessions reach each step. A real funnel shape.
const REACH = [12, 11, 9, 8, 6, 5, 4];

async function writeBatch(session, events) {
  const payload = JSON.stringify(events.map((e) => ({
    age: Math.min(Math.max(0, Math.round(e.ageMs)), 6 * 60 * 60 * 1000),
    name: e.name, path: e.path ?? null, step: e.step ?? null,
    step_index: e.stepIndex ?? null, ref: e.ref ?? null, props: e.props ?? {},
  })));
  await sql`
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
             step_index smallint, ref text, props jsonb)`;
}

await sql`delete from analytics_sessions where id like 'seed%'`;

const SOURCES = [
  { utmSource: "facebook", referrerHost: "facebook.com", paid: true },
  { utmSource: null, referrerHost: "google.com", paid: false },
  { utmSource: null, referrerHost: null, paid: false },
];
const DEVICES = ["mobile", "mobile", "desktop", "tablet"];

for (let i = 0; i < 12; i++) {
  const id = `seed${String(i).padStart(4, "0")}aaaa`;
  const src = SOURCES[i % SOURCES.length];
  const events = [
    { ageMs: 600000, name: "page_view", path: "/" },
    { ageMs: 590000, name: "cta_click", path: "/", props: { label: "BOOK THE STUDIO", to: "/booking" } },
    { ageMs: 580000, name: "page_view", path: "/booking" },
  ];
  // Two batches, so the on-conflict branch and the events counter are exercised.
  await writeBatch({ id, landingPath: "/", utmMedium: null, utmCampaign: null,
                     device: DEVICES[i % DEVICES.length], ...src }, events);

  const second = [];
  for (let s = 0; s < STEPS.length; s++) {
    if (i >= REACH[s]) break;
    second.push({ ageMs: 500000 - s * 20000, name: "booking_step_view",
                  path: "/booking", step: STEPS[s], stepIndex: s });
    if (s === 5) second.push({ ageMs: 495000 - s * 20000, name: "equipment_detail_open",
                               path: "/booking", props: { code: i % 2 ? "LGT-01" : "CAM-01", category: i % 2 ? "LGT" : "CAM" } });
  }
  if (i < 3) second.push({ ageMs: 300000, name: "booking_submitted", path: "/booking",
                           ref: `KID-SEED${i}`, props: { total_cents: 42000 } });
  if (second.length) {
    await writeBatch({ id, landingPath: "/", utmMedium: null, utmCampaign: null,
                       device: DEVICES[i % DEVICES.length], ...src }, second);
  }
}

const funnel = await sql`
  select step_index::int as i, min(step) as step, count(distinct session_id)::int as n
    from analytics_events where name = 'booking_step_view' and step_index is not null
   group by step_index order by step_index`;
console.log("funil:");
let prev = null;
for (const r of funnel) {
  const drop = prev === null ? "" : `  -${Math.round((1 - r.n / prev) * 100)}%`;
  console.log(`  ${r.i} ${String(r.step).padEnd(10)} ${String(r.n).padStart(3)} sessoes${drop}`);
  prev = r.n;
}
const [sess] = await sql`select count(*)::int as n, sum(events)::int as ev from analytics_sessions where id like 'seed%'`;
console.log(`\nsessoes ${sess.n}, contador de eventos somado ${sess.ev}`);
const [real] = await sql`select count(*)::int as n from analytics_events e join analytics_sessions s on s.id = e.session_id where s.id like 'seed%'`;
console.log(`eventos realmente gravados ${real.n}  ${real.n === sess.ev ? "(contador bate)" : "(CONTADOR NAO BATE)"}`);
