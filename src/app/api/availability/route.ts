import { NextRequest, NextResponse } from "next/server";
import { emptyMonth } from "@/data/availability";
import { spaceById } from "@/data/spaces";
import { isCalendarConfigured } from "@/lib/gcal/auth";
import { hasAllCalendars } from "@/lib/gcal/calendars";
import { readMonthAvailability } from "@/lib/gcal/availability";
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
    return json(await readMonthAvailability(spaceId, month));
  } catch (err) {
    console.error("[GCAL] availability read failed", err);
    return json(emptyMonth(spaceId, month, true));
  }
}

function json(body: unknown) {
  return NextResponse.json(body, {
    headers: {
      // A slot booked seconds ago can briefly still read as free. That is
      // acceptable because confirming re-checks against Google before writing.
      "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
    },
  });
}
