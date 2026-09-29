import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/session";
import { DbError, isDbConfigured } from "@/lib/db/client";
import { blockTime, listCalendar, unblock } from "@/lib/db/holds";
import { RESOURCES } from "@/data/resources";
import type { ResourceId } from "@/data/types";
import { TIME_SLOTS } from "@/data/booking";
import { addDays, daysInMonth, isoDate, parseISO } from "@/lib/date";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * The studio's calendar.
 *
 *   GET    ?month=YYYY-MM     everything held that month
 *   POST   { date, slotId?, resourceIds?, reason }   block time
 *   DELETE ?id=…              unblock
 *
 * ADMIN ONLY, and unlike /api/availability this DOES carry names. That
 * distinction is the whole reason the public endpoint selects three columns —
 * see the privacy note in src/lib/db/availability.ts.
 */
export async function GET(req: NextRequest) {
  const auth = requireAdmin(req);
  if (!auth.ok) return auth.response;

  const month = req.nextUrl.searchParams.get("month") ?? "";
  if (!/^\d{4}-\d{2}$/.test(month)) {
    return NextResponse.json({ error: "month must be YYYY-MM" }, { status: 400 });
  }
  const p = parseISO(`${month}-01`);
  if (!p) return NextResponse.json({ error: "month must be YYYY-MM" }, { status: 400 });

  if (!isDbConfigured()) {
    return NextResponse.json({ readOnly: true, entries: [], resources: RESOURCES, slots: TIME_SLOTS });
  }

  try {
    const from = isoDate(p.y, p.m1, 1);
    const toExclusive = addDays(isoDate(p.y, p.m1, daysInMonth(p.y, p.m1)), 1);
    return NextResponse.json({
      readOnly: false,
      month,
      entries: await listCalendar(from, toExclusive),
      resources: RESOURCES,
      slots: TIME_SLOTS,
    });
  } catch (err) {
    return fail(err);
  }
}

export async function POST(req: NextRequest) {
  const auth = requireAdmin(req);
  if (!auth.ok) return auth.response;
  if (!isDbConfigured()) {
    return NextResponse.json({ error: "The database is not connected." }, { status: 503 });
  }

  let body: {
    date?: unknown;
    slotId?: unknown;
    resourceIds?: unknown;
    reason?: unknown;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Malformed request" }, { status: 400 });
  }

  const date = typeof body.date === "string" ? body.date : "";
  if (!parseISO(date)) {
    return NextResponse.json({ error: "date must be YYYY-MM-DD" }, { status: 400 });
  }

  const slotId =
    typeof body.slotId === "string" && body.slotId
      ? TIME_SLOTS.find((s) => s.id === body.slotId)?.id
      : null;
  if (typeof body.slotId === "string" && body.slotId && !slotId) {
    return NextResponse.json({ error: "unknown slot" }, { status: 400 });
  }

  const known = new Set(RESOURCES.map((r) => r.id));
  const asked = Array.isArray(body.resourceIds)
    ? body.resourceIds.filter((v): v is ResourceId => typeof v === "string" && known.has(v as ResourceId))
    : [];

  try {
    const result = await blockTime({
      date,
      slotId,
      resourceIds: asked.length ? asked : null,
      reason: typeof body.reason === "string" ? body.reason.slice(0, 200) : "",
    });
    if (result.ok) return NextResponse.json({ ok: true, created: result.created });

    // The studio will try to block a day that already has a shoot on it.
    // Telling them which one is the difference between a refusal and a dead
    // end.
    const who = result.clashes
      .map((c) => (c.ref ? `${c.ref}${c.name ? ` (${c.name})` : ""}` : (c.label ?? "a block")))
      .filter((v, i, a) => a.indexOf(v) === i);
    return NextResponse.json(
      { error: `Already taken by ${who.join(", ")}.`, clashes: result.clashes },
      { status: 409 }
    );
  } catch (err) {
    return fail(err);
  }
}

export async function DELETE(req: NextRequest) {
  const auth = requireAdmin(req);
  if (!auth.ok) return auth.response;
  if (!isDbConfigured()) {
    return NextResponse.json({ error: "The database is not connected." }, { status: 503 });
  }
  const id = Number(req.nextUrl.searchParams.get("id"));
  if (!Number.isInteger(id) || id <= 0) {
    return NextResponse.json({ error: "Which entry?" }, { status: 400 });
  }
  try {
    const gone = await unblock(id);
    if (!gone) {
      // unblock refuses a booking's hold on purpose: a stray click on the
      // calendar must not silently un-confirm a shoot. That is done from the
      // board, where it says so.
      return NextResponse.json(
        { error: "That entry is a booking, not a block. Move it on the board instead." },
        { status: 409 }
      );
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    return fail(err);
  }
}

function fail(err: unknown): NextResponse {
  if (err instanceof DbError) {
    return NextResponse.json({ error: err.message }, { status: err.status });
  }
  console.error("[ADMIN] calendar route failed", err);
  return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
}
