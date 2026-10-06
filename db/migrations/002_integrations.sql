-- 002_integrations.sql
--
-- Where the studio's advertising connections live, so they can be changed in
-- the admin panel instead of by a developer editing environment variables and
-- waiting for a redeploy.
--
-- ONE ROW, FOREVER. `id boolean primary key default true` plus a check that it
-- IS true makes a second row impossible at the database level rather than by
-- convention. Every read is `select ... from integrations` with no where
-- clause and no ordering, and it cannot quietly start returning two.
--
-- WHAT IS SECRET HERE AND WHAT IS NOT
--
--   meta_pixel_id, google_tag_id   PUBLIC. They are rendered into the page for
--                                  every visitor who accepted marketing. There
--                                  is nothing to protect.
--   meta_capi_token                SECRET. A bearer credential with no expiry.
--                                  Stored SEALED — never plaintext — in the
--                                  format src/lib/crypto/secretbox.ts writes:
--                                  v1.<keyId>.<base64(iv|tag|ciphertext)>.
--                                  The check constraint below is the backstop
--                                  that refuses a plaintext token even if some
--                                  future code path forgets to seal it.
--
-- `updated_at` doubles as the optimistic-concurrency version, the same way
-- `_meta.updatedAt` does for the blob documents in src/lib/admin/store.ts. One
-- convention for "someone else saved while you were editing", two stores.

create table integrations (
  id boolean primary key default true,
  constraint integrations_singleton check (id),

  /* ── Meta ──────────────────────────────────────────────────────────── */

  -- Pixel ids are numeric strings. Length has drifted over the years, so the
  -- range is deliberately loose: the point is to catch a pasted URL or a
  -- pasted token, not to predict Meta's id length.
  meta_pixel_id text,
  constraint meta_pixel_shape check (
    meta_pixel_id is null or meta_pixel_id ~ '^[0-9]{10,25}$'),

  -- Sealed, never plaintext. A real Meta token starts "EAA..." and would fail
  -- this pattern, which is exactly the accident worth catching.
  meta_capi_token text,
  constraint meta_token_sealed check (
    meta_capi_token is null or meta_capi_token ~ '^v1\.[0-9a-f]{8}\.[A-Za-z0-9+/]+=*$'),

  -- From Events Manager > Test events. While this is set, events are excluded
  -- from reporting and optimisation — which is the most common silent failure
  -- of an otherwise working Conversions API setup, so the panel warns whenever
  -- it is not null.
  meta_test_event_code text,
  constraint meta_test_code_shape check (
    meta_test_event_code is null or meta_test_event_code ~ '^TEST[0-9]{1,12}$'),

  meta_enabled boolean not null default false,

  -- Switched on without a pixel id would mean "load the pixel with no id",
  -- which fails in the browser where nobody is looking. Refused here instead.
  constraint meta_needs_pixel check (not meta_enabled or meta_pixel_id is not null),

  /* ── Google ────────────────────────────────────────────────────────── */

  -- G- is GA4, AW- is Google Ads. UA- is Universal Analytics, switched off by
  -- Google in 2023 and the mistake a studio actually makes, so it is refused
  -- here and named in the panel rather than silently accepted.
  google_tag_id text,
  constraint google_tag_shape check (
    google_tag_id is null or google_tag_id ~ '^(G-[A-Z0-9]{4,20}|AW-[0-9]{6,20})$'),

  google_enabled boolean not null default false,
  constraint google_needs_tag check (not google_enabled or google_tag_id is not null),

  /* ── Bookkeeping ───────────────────────────────────────────────────── */

  updated_at timestamptz not null default now(),
  -- Which admin username saved last. Useful the day a connection breaks and
  -- nobody remembers touching it.
  updated_by text
);

-- The singleton exists from the start, all off, so every read finds a row and
-- no caller has to handle "configured but never saved" separately from
-- "saved with everything off".
insert into integrations (id) values (true);

-- Reuses the trigger function created by 001_bookings.sql.
create trigger integrations_touch
  before update on integrations
  for each row execute function touch_updated_at();
