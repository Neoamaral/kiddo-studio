import { NextRequest, NextResponse } from "next/server";
import { emptyMonth } from "@/data/availability";
import { spaceById } from "@/data/spaces";
import { isCalendarConfigured } from "@/lib/gcal/auth";
import { hasAllCalendars } from "@/lib/gcal/calendars";
import { readMonthAvailabilityCached } from "@/lib/gcal/availability";
import { READ_LIMIT, rateLimited } from "@/lib/guard";

/**
 * Month availability for one space.
 *
 *   GET /api/availability?space=cyc&month=2026-09
 *
 * FAILS OPEN, deliberately. If Google is down or unconfigured this returns
 * `degraded: true` and the UI lets every date through with an honest "we'll
 * confirm by email" note. The site has never had availability data and still
 * took bookings; an outage must not make it worse than its own status quo, and
 * a lost enquiry is an immediate, real cost.
 *
 * Returns only intervals and counts — never client names, emails or briefs.
 * See the freebusy rationale in src/lib/gcal/availability.ts.
 */
export async function GET(req: NextRequest) {
  if (rateLimited(req, "availability", READ_LIMIT)) {
    return NextResponse.json({ error: "Slow down" }, { status: 429 });
  }

  const { searchParams } = new URL(req.url);
  const spaceId = searchParams.get("space") ?? "";
  const month = searchParams.get("month") ?? "";

  if (!/^\d{4}-\d{2}$/.test(month)) {
    return NextResponse.json({ error: "month must be YYYY-MM" }, { status: 400 });
  }
  if (!spaceById(spaceId)) {
    return NextResponse.json({ error: "unknown space" }, { status: 400 });
  }

  if (!isCalendarConfigured() || !hasAllCalendars()) {
    // Not an error: this is the pre-integration state, and the kill switch.
    return json(emptyMonth(spaceId, month, true));
  }

  try {
    return json(await readMonthAvailabilityCached(spaceId, month));
  } catch (err) {
    console.error("[GCAL] availability read failed", err);
    return json(emptyMonth(spaceId, month, true));
  }
}

function json(body: unknown) {
  return NextResponse.json(body, {
    headers: {
      // Deliberately uncacheable at the edge. A CDN TTL cannot be revoked when
      // the studio approves a booking, and serving a stale "free" for even a
      // minute lets a second client take a slot that is already gone. The
      // Google round trip is cached server-side instead, and purged on
      // confirm — see readMonthAvailabilityCached.
      "Cache-Control": "no-store",
    },
  });
}
