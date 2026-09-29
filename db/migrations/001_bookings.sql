-- Bookings, clients and the studio's own calendar.
--
-- Before this, Google Calendar WAS the database: a request lived as a calendar
-- event with the name and email hidden in extended properties and everything
-- else — company, crew, brief, price — as prose in the description. Declining
-- deleted the event, and with it the request. There was no client record and no
-- history to show.
--
-- THE POINT OF THIS FILE IS THE LAST CONSTRAINT IN IT.
--
-- `exclude using gist (resource_id with =, during with &&)` makes the database
-- refuse any interval that overlaps another in the same room. Double-booking
-- stops being something the code checks for and becomes something that cannot
-- happen. It also handles for free the case that forced interval comparison in
-- the first place: FULL DAY (09:00–19:00) overlaps MORNING (09:00–13:00), and
-- the rule catches it without knowing what a slot is.

create extension if not exists btree_gist;

/* ── Clients: the CRM ─────────────────────────────────────────────────────── */

create table clients (
  id uuid primary key default gen_random_uuid(),
  -- Always stored lowercased, so the unique index is the identity. No citext:
  -- a plain btree on an already-normalised column serves lookups fine.
  email text not null unique,
  name text,
  phone text,
  company text,
  notes text not null default '',
  tags text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

/* ── Requests: the kanban ─────────────────────────────────────────────────── */

create table requests (
  -- KID-XXXXXXXX, minted server-side by bookingRef().
  ref text primary key,
  kind text not null,
  status text not null,
  -- set null, not cascade: erasing a client must not erase the studio's
  -- record of the work. The GDPR delete path removes the requests explicitly.
  client_id uuid references clients(id) on delete set null,

  -- Who asked. Copied onto the request as well as the client, so the record of
  -- what was submitted stays true even after the client edits their own details.
  name text,
  email text,
  phone text,
  company text,
  crew_size text,
  brief text,

  -- What was asked for.
  date date,
  slot_id text,
  space_id text,
  package_id text,
  addon_ids text[] not null default '{}',
  bundle_ids text[] not null default '{}',
  equipment jsonb,

  /*
   * The quote, FROZEN as it was sent.
   *
   * The rate card is editable in the admin panel. A detail page that called
   * computeQuote() would silently re-price a three-month-old enquiry the next
   * time someone edited a price, and the figure in the CRM would stop matching
   * the figure in the customer's email. Render this; never recompute it.
   */
  quote jsonb,
  total_cents integer,

  lost_reason text,
  notes text not null default '',

  /*
   * NULL when the caller sent none — never the empty string.
   *
   * This is a UNIQUE column, so a stored "" would be matched by every later
   * keyless submission, and each would be answered with the first submitter's
   * reference. The check constraint below makes that unrepresentable rather
   * than relying on the parser to remember.
   */
  idempotency_key text unique,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- Spelled out here rather than as enums: altering a check is one line,
  -- altering an enum is a migration nuisance. Without these, a typo'd 'Booking'
  -- or 'won' would be accepted and then vanish from every kanban column.
  constraint kind_valid   check (kind in ('booking','message')),
  constraint status_valid check (status in ('new','talking','confirmed','done','lost')),

  -- A booking needs a date, a slot and a space; a contact message has none of
  -- them and no price. One table, but the shape of each kind is enforced.
  constraint booking_fields check (
    kind <> 'booking'
    or (date is not null and slot_id is not null and space_id is not null)),
  constraint message_fields check (
    kind <> 'message'
    or (date is null and slot_id is null and space_id is null
        and quote is null and total_cents is null)),
  constraint message_never_confirmed check (kind <> 'message' or status <> 'confirmed'),

  constraint equipment_is_object check (
    equipment is null or jsonb_typeof(equipment) = 'object'),
  constraint idempotency_not_blank check (
    idempotency_key is null or idempotency_key <> '')
);

/* ── Holds: the calendar ──────────────────────────────────────────────────── */

create table holds (
  id bigserial primary key,
  -- room-cyc | room-blk. Rooms, not products: `both` is a product that occupies
  -- two rooms, and the availability rule is per room. This table never learns
  -- what a space is.
  resource_id text not null,
  /*
   * A real instant range, computed in JavaScript by zonedInstant().
   *
   * Europe/Lisbon daylight saving is resolved by one tested function in
   * src/lib/date.ts, not by Postgres. Two implementations of the same DST rule
   * in two languages is exactly how a booking ends up an hour wrong between
   * April and October only — and Neon's tzdata version is not something this
   * project controls or can pin.
   */
  during tstzrange not null,
  kind text not null,
  request_ref text references requests(ref) on delete cascade,
  -- Human-readable, because `during` is opaque in a SQL console.
  -- "KID-3F9QX2 · FULL DAY · Cyclorama"
  label text,
  created_at timestamptz not null default now(),

  constraint hold_kind_valid check (kind in ('booking','blocked')),
  -- A booking hold points at its request; a studio day off never does.
  constraint hold_ref_matches_kind check (
    (kind = 'booking' and request_ref is not null) or
    (kind = 'blocked' and request_ref is null)),

  /*
   * Pins the bounds to [start, end) at the database.
   *
   * tstzrange is a continuous range type, so unlike daterange it is NOT
   * canonicalised — whatever bound flags a call site passes are kept verbatim.
   * A stray '[]' would make a 13:00-ending slot collide with a 13:00-starting
   * one, forever. And an EMPTY range overlaps nothing, so a zero-length hold
   * would silently permit a double-booking while looking perfectly correct.
   */
  constraint holds_during_shape check (
    not isempty(during) and lower_inc(during) and not upper_inc(during)),

  /*
   * One hold per request per room.
   *
   * This is what makes confirming twice — the studio clicks, the response is
   * slow, they click again — a 23505 "already confirmed" instead of a 23P01
   * reported as "that slot was taken by" the customer themselves. Two error
   * codes, two different messages.
   */
  constraint holds_one_per_request_resource unique (request_ref, resource_id),

  -- The whole point. Also indexes (resource_id, during) together, which is
  -- exactly the month read's access path — no second index is needed.
  constraint holds_no_overlap exclude using gist (resource_id with =, during with &&)
);

/* ── Indexes ──────────────────────────────────────────────────────────────── */

-- One kanban column.
create index requests_board on requests (status, created_at desc);
-- A client's history.
create index requests_by_client on requests (client_id);
-- A month of bookings.
create index requests_by_date on requests (date) where kind = 'booking';
-- Equipment still on the shelf. Only confirmed work holds gear, which is the
-- rule the Google version had too.
create index requests_equipment_window on requests (date)
  where status in ('confirmed','done') and equipment is not null;

/* ── updated_at ───────────────────────────────────────────────────────────── */

-- `default now()` fires on INSERT only, so without this the kanban's "last
-- activity" would show creation time forever and nobody would notice.
create or replace function touch_updated_at() returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

create trigger requests_touch before update on requests
  for each row execute function touch_updated_at();
create trigger clients_touch before update on clients
  for each row execute function touch_updated_at();
