/**
 * End-to-end proof that the Google Calendar setup actually works.
 *
 *   npm run gcal:smoke
 *
 * Run this BEFORE wiring the booking route to Google. It de-risks, in one go,
 * every assumption the integration rests on — and it creates and then deletes
 * exactly one event, six months out, so it is safe against a live calendar.
 *
 * The assertion that matters most is #5: that a TENTATIVE event reads as busy
 * in freebusy. The entire design depends on it (a tentative event holds the
 * slot while the studio confirms by hand), and it is far cheaper to prove here
 * than to discover from a double booking.
 */

import fs from "node:fs";
import path from "node:path";
import { gcalDelete, gcalGet, gcalPost, getCalendar } from "../src/lib/gcal/client";
import { addDays, todayInLisbon } from "../src/lib/date";

const ENV_PATH = path.join(process.cwd(), "scripts", ".sync", "gcal.env");

function loadEnv() {
  if (!fs.existsSync(ENV_PATH)) return;
  for (const line of fs.readFileSync(ENV_PATH, "utf8").split("\n")) {
    if (!line || line.startsWith("#") || !line.includes("=")) continue;
    const i = line.indexOf("=");
    const k = line.slice(0, i);
    const v = line.slice(i + 1);
    if (v && !process.env[k]) process.env[k] = v;
  }
}

let failures = 0;
function ok(label: string, cond: boolean, detail = "") {
  console.log((cond ? "PASS  " : "FAIL  ") + label + (!cond && detail ? `  [${detail}]` : ""));
  if (!cond) failures++;
}

interface FreeBusy {
  calendars: Record<string, { busy: { start: string; end: string }[]; errors?: { reason: string }[] }>;
}

async function main() {
  loadEnv();

  const cyc = process.env.GCAL_CAL_ROOM_CYC;
  const blk = process.env.GCAL_CAL_ROOM_BLK;
  if (!cyc || !blk) {
    console.error(
      "HALT: GCAL_CAL_ROOM_CYC / GCAL_CAL_ROOM_BLK are not set.\n" +
        "Share the calendars with the service account, then run: npm run gcal:discover"
    );
    process.exit(1);
  }

  // 1 + 2 — token mint and per-calendar access. A 404 here is almost always
  // "shared with the wrong address" or "not shared at all".
  for (const [label, id] of [
    ["Cyclorama", cyc],
    ["Black Box", blk],
  ] as const) {
    try {
      const cal = await getCalendar(id);
      ok(`${label}: reachable — "${cal.summary}"`, true);
      ok(
        `${label}: time zone is Europe/Lisbon`,
        cal.timeZone === "Europe/Lisbon",
        cal.timeZone ?? "unset"
      );
    } catch (err) {
      ok(`${label}: reachable`, false, err instanceof Error ? err.message : String(err));
    }
  }

  // A weekday six months out — far enough that a real booking is implausible.
  const probeDate = addDays(todayInLisbon(), 180);
  const timeMin = `${probeDate}T00:00:00Z`;
  const timeMax = `${addDays(probeDate, 1)}T00:00:00Z`;

  // 3 — freebusy over both calendars in ONE request.
  let before: FreeBusy;
  try {
    before = await gcalPost<FreeBusy>("/freeBusy", {
      timeMin,
      timeMax,
      items: [{ id: cyc }, { id: blk }],
    });
    const errs = Object.values(before.calendars).flatMap((c) => c.errors ?? []);
    ok("freebusy covers both calendars in one call", errs.length === 0, JSON.stringify(errs));
  } catch (err) {
    ok("freebusy query", false, err instanceof Error ? err.message : String(err));
    return finish();
  }

  const busyBefore = before.calendars[cyc]?.busy.length ?? 0;

  // 4 — insert a TENTATIVE event, wall-clock plus IANA zone so Google resolves
  // DST rather than us computing an offset.
  let eventId = "";
  try {
    const ev = await gcalPost<{ id: string; status: string }>(
      `/calendars/${encodeURIComponent(cyc)}/events`,
      {
        summary: "SMOKE TEST — safe to delete",
        description: "Written by npm run gcal:smoke. Deleted automatically.",
        start: { dateTime: `${probeDate}T08:00:00`, timeZone: "Europe/Lisbon" },
        end: { dateTime: `${probeDate}T12:00:00`, timeZone: "Europe/Lisbon" },
        status: "tentative",
        transparency: "opaque",
        extendedProperties: { private: { source: "smoke-test" } },
      },
      { sendUpdates: "none" }
    );
    eventId = ev.id;
    ok("tentative event created", !!ev.id && ev.status === "tentative", ev.status);
  } catch (err) {
    ok("tentative event created", false, err instanceof Error ? err.message : String(err));
    return finish();
  }

  // 5 — THE assertion. Does a tentative event actually block the slot?
  try {
    const after = await gcalPost<FreeBusy>("/freeBusy", {
      timeMin,
      timeMax,
      items: [{ id: cyc }, { id: blk }],
    });
    const busyAfter = after.calendars[cyc]?.busy.length ?? 0;
    ok(
      "a TENTATIVE event reads as BUSY in freebusy",
      busyAfter === busyBefore + 1,
      `busy went ${busyBefore} -> ${busyAfter}`
    );
    ok(
      "the other room is unaffected",
      (after.calendars[blk]?.busy.length ?? 0) === (before.calendars[blk]?.busy.length ?? 0)
    );
  } catch (err) {
    ok("freebusy after insert", false, err instanceof Error ? err.message : String(err));
  }

  // 6 — clean up. Leaving debris on a live calendar is not acceptable.
  try {
    await gcalDelete(`/calendars/${encodeURIComponent(cyc)}/events/${eventId}`, {
      sendUpdates: "none",
    });
    ok("smoke event deleted", true);
  } catch (err) {
    ok("smoke event deleted", false, err instanceof Error ? err.message : String(err));
    console.error(`\n  Delete it by hand: event ${eventId} on ${cyc}`);
  }

  // 7 — the events.list filter the equipment-stock count depends on.
  try {
    await gcalGet<{ items?: unknown[] }>(`/calendars/${encodeURIComponent(cyc)}/events`, {
      timeMin,
      timeMax,
      privateExtendedProperty: "source=website",
      singleEvents: "true",
    });
    ok("events.list accepts the privateExtendedProperty filter", true);
  } catch (err) {
    ok(
      "events.list accepts the privateExtendedProperty filter",
      false,
      err instanceof Error ? err.message : String(err)
    );
  }

  finish();
}

function finish(): never {
  console.log();
  if (failures) {
    console.error(`${failures} check(s) failed.`);
    process.exit(1);
  }
  console.log("Google Calendar is wired up correctly.");
  process.exit(0);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
