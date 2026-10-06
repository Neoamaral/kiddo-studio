-- 003_analytics.sql
--
-- The studio's own measurement, so the booking funnel can be read without
-- asking Meta or Google what happened on the studio's own site.
--
-- WHAT IS DELIBERATELY NOT HERE
--
--   no ip address        never received, never derived, never stored
--   no user agent        `device` is a coarse bucket the browser reports
--   no persistent id     a session dies with the browser tab, by construction
--   no query strings     /booking/confirm's URL contains a secret token, and a
--                        single rule — paths only, everywhere — is the only
--                        version of that rule nobody forgets
--
-- The one pseudonymous value in here is `ref` on booking_submitted, which is
-- what ties a session to the request it produced.
--
-- TWO TABLES, NOT ONE. Every funnel query asks "how many SESSIONS reached step
-- N", and the attribution dimensions — where the visit came from, what device
-- — belong once per session rather than repeated on forty event rows.

create table analytics_sessions (
  /*
   * Minted in the browser and held in sessionStorage, so it DIES WITH THE TAB.
   * This is not a returning-visitor identifier and cannot become one: there is
   * no cookie, nothing in localStorage, and nothing server-side that could
   * join two of these together.
   */
  id text primary key,
  constraint sessions_id_shape check (id ~ '^[a-z0-9]{8,32}$'),

  started_at timestamptz not null default now(),
  last_at    timestamptz not null default now(),

  landing_path text,

  /*
   * HOST ONLY, never the full referrer. A referrer carries a query string, and
   * a query string from a mail client or an ad platform carries click ids and
   * sometimes an email address.
   */
  referrer_host text,

  utm_source   text,
  utm_medium   text,
  utm_campaign text,

  -- True when fbclid or gclid was present. The click id VALUE is never stored.
  paid boolean not null default false,

  device text,
  constraint sessions_device_valid check (
    device is null or device in ('mobile', 'tablet', 'desktop')),

  events integer not null default 0
);

create table analytics_events (
  id bigserial primary key,

  -- Cascade, so erasing one session's data is a single delete.
  session_id text not null references analytics_sessions(id) on delete cascade,

  /*
   * SERVER-DERIVED, never the browser's clock.
   *
   * Events are batched, so one can be half a minute old when it arrives and a
   * pagehide beacon can be minutes old. The client sends "how many ms ago" and
   * the route subtracts it from now(), clamped. Ordering survives; a device
   * with a wrong clock cannot write a row dated 1970 or 2030.
   */
  at timestamptz not null,

  name text not null,
  constraint events_name_shape check (name ~ '^[a-z][a-z0-9_]{2,39}$'),

  path text,

  /*
   * step and step_index are PROMOTED OUT OF props on purpose. The funnel is
   * the headline query and runs on every dashboard load; a jsonb extraction
   * per row, and an expression index to support it, is a cost paid forever for
   * the one dimension that is always queried.
   */
  step text,
  step_index smallint,
  constraint events_step_range check (
    step_index is null or (step_index >= 0 and step_index <= 20)),

  /*
   * KID-XXXXXXXX. Deliberately NOT a foreign key to requests(ref): the event
   * can arrive before the row is written, and a GDPR erasure removes the
   * request while the aggregate must survive. Same reasoning as
   * `client_id ... on delete set null` in 001.
   */
  ref text,

  props jsonb not null default '{}',
  constraint events_props_object check (jsonb_typeof(props) = 'object'),
  -- A bounded row is a bounded table. 1KB is about eight times the largest
  -- event this site produces.
  constraint events_props_small check (pg_column_size(props) < 1024)
);

/* ── One index per query the dashboard actually runs ─────────────────────── */

-- Every range-scoped block.
create index events_at on analytics_events (at desc);
-- Submitted / conflict / error counts, and the CTA breakdown.
create index events_name_at on analytics_events (name, at desc);
-- One session's path, and the erasure read.
create index events_session on analytics_events (session_id, at);
-- THE funnel query. Partial, so it indexes about seven rows per session
-- instead of twenty-five.
create index events_funnel on analytics_events (step_index, at)
  where name = 'booking_step_view';

create index sessions_started on analytics_sessions (started_at desc);
create index sessions_source on analytics_sessions (utm_source, started_at desc);

/* ── Consent, recorded against the booking it applied to ─────────────────── */

-- The only durable proof that server-side marketing was permitted for a given
-- request. 'a1.m1' / 'a1.m0' / null for anything booked before this existed.
alter table requests add column consent text;
