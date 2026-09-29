import { NextRequest, NextResponse } from "next/server";
import { emptyMonth } from "@/data/availability";
import { spaceById } from "@/data/spaces";
import { isDbConfigured } from "@/lib/db/client";
import { readMonthAvailabilityCached } from "@/lib/db/availability";
import { READ_LIMIT, rateLimited } from "@/lib/guard";

export const runtime = "nodejs";

/**
 * Month availability for one space.
 *
 *   GET /api/availability?space=cyc&month=2026-09
 *
 * FAILS OPEN, deliberately. Without a database this returns `degraded: true`
 * and the UI lets every date through with an honest "we'll confirm by email"
 * note. The site has never had availability data and still took bookings; an
 * outage must not make it worse than its own status quo, and a lost enquiry is
 * an immediate, real cost.
 *
 * Returns only intervals and counts — never client names, emails or briefs.
 * The reasoning is in the reader, and it is the reason this endpoint does not
 * simply select everything it has.
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

  if (!isDbConfigured()) {
    // Not an error: it is the unconfigured state, and the kill switch.
    return json(emptyMonth(spaceId, month, true));
  }

  // The reader already falls back to a degraded month on any failure, so there
  // is nothing to catch here that it has not handled.
  return json(await readMonthAvailabilityCached(spaceId, month));
}

function json(body: unknown) {
  return NextResponse.json(body, {
    headers: {
      // Deliberately uncacheable at the edge. A CDN TTL cannot be revoked when
      // the studio approves a booking, and serving a stale "free" for even a
      // minute lets a second client take a slot that is already gone. The
      // round trip to the source is cached server-side instead, and purged the
      // moment a hold changes.
      "Cache-Control": "no-store",
    },
  });
}
