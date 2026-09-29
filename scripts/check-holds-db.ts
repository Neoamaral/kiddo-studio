/**
 * The half of check-holds that needs a real database.
 *
 * WHAT THIS PROVES, AND WHY IT IS RAW SQL
 *
 * These assertions are about guarantees the DATABASE makes and no amount of
 * application code can: that two overlapping holds on one room cannot both
 * exist. Checking that through the application would test the check in the
 * code, which is the thing we are trying not to have to trust.
 *
 * So it speaks SQL directly. The application's own path over these tables is
 * covered end to end by the Playwright suite instead, which exercises the
 * routes, the session and the JSON with it.
 *
 * Runs against TEST_DATABASE_URL, a separate database. Never production: it
 * refuses to start if the target already has rows in it.
 */

import { Client } from "@neondatabase/serverless";
import { zonedInstant, addDays } from "../src/lib/date";
import { slotById } from "../src/data/booking";

type Check = (label: string, actual: unknown, expected: unknown) => void;

const REF = "KID-CHECK01";
const REF2 = "KID-CHECK02";
const SLOT_DATE = "2026-06-15";
const DST_BACK = "2026-10-25"; // the 25-hour day

function instants(date: string, slotId: string): [string, string] {
  const slot = slotById(slotId)!;
  return [
    new Date(zonedInstant(date, slot.startLocal)).toISOString(),
    new Date(zonedInstant(date, slot.endLocal)).toISOString(),
  ];
}

/** Uses the caller's check(), so there is exactly one failure counter. */
export async function databaseHoldChecks(check: Check): Promise<void> {
  const url = process.env.TEST_DATABASE_URL ?? process.env.DATABASE_URL_UNPOOLED;
  if (!url) {
    check(
      "TEST_DATABASE_URL is set — these assertions write rows, so they need their own database",
      false,
      true
    );
    return;
  }

  const c = new Client(url);
  await c.connect();

  const q = async (sql: string, args: unknown[] = []) => (await c.query(sql, args)).rows;

  /** Runs an insert and reports the SQLSTATE it failed with, or "ok". */
  const attempt = async (sql: string, args: unknown[] = []): Promise<string> => {
    try {
      await q(sql, args);
      return "ok";
    } catch (err) {
      return String((err as { code?: string }).code ?? "unknown");
    }
  };

  const insertHold = (
    resource: string,
    startIso: string,
    endIso: string,
    kind: "booking" | "blocked",
    ref: string | null,
    label: string
  ) =>
    attempt(
      `insert into holds (resource_id, during, kind, request_ref, label)
       values ($1, tstzrange($2::timestamptz, $3::timestamptz, '[)'), $4, $5, $6)`,
      [resource, startIso, endIso, kind, ref, label]
    );

  try {
    /*
     * Refuse to touch a database that has anything in it. This writes and
     * deletes; pointed at production by a mistyped variable it would be
     * deleting real bookings.
     */
    const existing = await q(
      `select (select count(*) from requests)::int r, (select count(*) from holds)::int h`
    );
    if (existing[0].r > 0 || existing[0].h > 0) {
      check(
        `the target database is empty — refusing to write to one already holding ` +
          `${existing[0].r} request(s) and ${existing[0].h} hold(s); check TEST_DATABASE_URL`,
        false,
        true
      );
      return;
    }

    /* ── The schema accepts a well-formed booking ──────────────────────────── */

    await q(
      `insert into requests (ref, kind, status, date, slot_id, space_id, name, email)
       values ($1,'booking','new',$2,'am','cyc','Check','check@example.com')`,
      [REF, SLOT_DATE]
    );
    const [amStart, amEnd] = instants(SLOT_DATE, "am");
    check(
      "a booking hold is accepted",
      await insertHold("room-cyc", amStart, amEnd, "booking", REF, "check am"),
      "ok"
    );

    /* ── Overlap is impossible, not merely discouraged ─────────────────────── */

    const [pmStart, pmEnd] = instants(SLOT_DATE, "pm");
    check(
      "the afternoon of the same day is free",
      await insertHold("room-cyc", pmStart, pmEnd, "blocked", null, "check pm"),
      "ok"
    );

    const [fdStart, fdEnd] = instants(SLOT_DATE, "fd");
    check(
      "a full day over a taken morning is REFUSED by the database",
      await insertHold("room-cyc", fdStart, fdEnd, "blocked", null, "check fd"),
      "23P01"
    );

    check(
      "the same hours in the OTHER room are free — rooms are independent",
      await insertHold("room-blk", fdStart, fdEnd, "blocked", null, "check blk fd"),
      "ok"
    );

    // Half-open bounds: the morning ends at 13:00 and something starting at
    // 13:00 must not collide with it.
    check(
      "a hold starting exactly when another ends is accepted",
      await insertHold("room-cyc", amEnd, pmStart, "blocked", null, "check gap"),
      "ok"
    );

    /* ── Confirming twice is not an error ─────────────────────────────────── */

    check(
      "the same request cannot hold the same room twice",
      await insertHold("room-cyc", "2026-12-01T09:00:00Z", "2026-12-01T13:00:00Z", "booking", REF, "check dup"),
      // 23505, not 23P01: the caller can tell "already confirmed" from
      // "someone else has it", and say so.
      "23505"
    );

    /* ── Shapes the database will not store ───────────────────────────────── */

    check(
      "an empty interval is refused — it would overlap nothing and look fine",
      await insertHold("room-cyc", "2026-07-01T09:00:00Z", "2026-07-01T09:00:00Z", "blocked", null, "check empty"),
      "23514"
    );
    check(
      "an inclusive upper bound is refused",
      await attempt(
        `insert into holds (resource_id, during, kind, label)
         values ('room-cyc', tstzrange($1::timestamptz, $2::timestamptz, '[]'), 'blocked', 'check incl')`,
        ["2026-07-02T09:00:00Z", "2026-07-02T13:00:00Z"]
      ),
      "23514"
    );
    check(
      "a blocked hold may not carry a booking reference",
      await insertHold("room-cyc", "2026-07-03T09:00:00Z", "2026-07-03T13:00:00Z", "blocked", REF, "check mixed"),
      "23514"
    );
    check(
      "a booking hold must carry one",
      await insertHold("room-cyc", "2026-07-04T09:00:00Z", "2026-07-04T13:00:00Z", "booking", null, "check noref"),
      "23514"
    );

    /* ── The 25-hour day ──────────────────────────────────────────────────── */

    /*
     * A day blocked as "midnight to midnight" across the October clock change
     * has to cover twenty-five hours. Computed the naive way it covers
     * twenty-four and leaves the last hour of the studio's day off bookable.
     */
    const dayStart = new Date(zonedInstant(DST_BACK, "00:00")).toISOString();
    const dayEnd = new Date(zonedInstant(addDays(DST_BACK, 1), "00:00")).toISOString();
    check(
      "the clock-change day can be blocked",
      await insertHold("room-cyc", dayStart, dayEnd, "blocked", null, "check dst"),
      "ok"
    );
    const span = await q(
      `select extract(epoch from (upper(during) - lower(during)))/3600 as hours
         from holds where label = 'check dst'`
    );
    check(
      "and the database agrees it is 25 hours long",
      Number(span[0].hours),
      25
    );
    check(
      "every slot on that day is now taken",
      await insertHold("room-cyc", ...instants(DST_BACK, "pm"), "blocked", null, "check dst pm"),
      "23P01"
    );

    /* ── Idempotency ──────────────────────────────────────────────────────── */

    await q(
      `insert into requests (ref, kind, status, name, email, idempotency_key)
       values ($1,'message','new','Check','check@example.com','key-one')`,
      [REF2]
    );
    check(
      "the same idempotency key cannot be stored twice",
      await attempt(
        `insert into requests (ref, kind, status, name, email, idempotency_key)
         values ('KID-CHECK03','message','new','Check','check@example.com','key-one')`
      ),
      "23505"
    );
    check(
      "a blank key is refused outright",
      await attempt(
        `insert into requests (ref, kind, status, name, email, idempotency_key)
         values ('KID-CHECK04','message','new','Check','check@example.com','')`
      ),
      "23514"
    );
    // Two keyless requests must coexist. This is the case that would have been
    // silently swallowed had "" reached the column.
    await q(
      `insert into requests (ref, kind, status, name, email)
       values ('KID-CHECK05','message','new','Check','check@example.com')`
    );
    check(
      "two requests with no key at all coexist",
      await attempt(
        `insert into requests (ref, kind, status, name, email)
         values ('KID-CHECK06','message','new','Check','check@example.com')`
      ),
      "ok"
    );

    /* ── Shapes of a request ──────────────────────────────────────────────── */

    check(
      "a booking without a date is refused",
      await attempt(
        `insert into requests (ref, kind, status, name, email)
         values ('KID-CHECK07','booking','new','Check','check@example.com')`
      ),
      "23514"
    );
    check(
      "a message with a date is refused",
      await attempt(
        `insert into requests (ref, kind, status, name, email, date, slot_id, space_id)
         values ('KID-CHECK08','message','new','Check','check@example.com','2026-06-15','am','cyc')`
      ),
      "23514"
    );
    check(
      "an unknown status is refused",
      await attempt(
        `insert into requests (ref, kind, status, name, email)
         values ('KID-CHECK09','message','won','Check','check@example.com')`
      ),
      "23514"
    );

    /* ── updated_at is maintained, not merely defaulted ───────────────────── */

    const before = (await q(`select updated_at from requests where ref = $1`, [REF2]))[0].updated_at;
    await q(`update requests set notes = 'touched' where ref = $1`, [REF2]);
    const after = (await q(`select updated_at from requests where ref = $1`, [REF2]))[0].updated_at;
    check(
      "an update moves updated_at — the board's last-activity column is real",
      new Date(String(after)).getTime() > new Date(String(before)).getTime(),
      true
    );

    /* ── Deleting a request frees its room ────────────────────────────────── */

    const heldBefore = await q(`select count(*)::int n from holds where request_ref = $1`, [REF]);
    check("the booking still holds a room", heldBefore[0].n > 0, true);
    await q(`delete from requests where ref = $1`, [REF]);
    const heldAfter = await q(`select count(*)::int n from holds where request_ref = $1`, [REF]);
    check("deleting the request releases it — the day is not blocked forever", heldAfter[0].n, 0);
  } finally {
    // Put the database back exactly as it was found, whether or not the
    // assertions passed.
    await q(`delete from holds where label like 'check %'`);
    await q(`delete from requests where ref like 'KID-CHECK%'`);
    await q(`delete from clients where email = 'check@example.com'`);
    const left = await q(
      `select (select count(*) from requests)::int r,
              (select count(*) from holds)::int h,
              (select count(*) from clients)::int c`
    );
    check(
      "the database was left exactly as it was found",
      [left[0].r, left[0].h, left[0].c],
      [0, 0, 0]
    );
    await c.end();
  }
}
