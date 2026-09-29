import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/session";
import { DbError, isDbConfigured } from "@/lib/db/client";
import {
  STATUSES,
  deleteRequest,
  getRequest,
  listBoard,
  setNotes,
  setStatus,
  type RequestStatus,
} from "@/lib/db/requests";
import { confirmBooking, releaseBooking } from "@/lib/db/holds";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * The board, and the moves on it.
 *
 *   GET    ?ref=…   one request in full, or the whole board without it
 *   PATCH           { ref, status | notes, lostReason? }
 *   DELETE ?ref=…   permanent erasure, for a subject-access request
 *
 * CONFIRMING IS NOT JUST A STATUS CHANGE
 *
 * It takes the rooms in the same statement, and the database can refuse it —
 * see confirmBooking. Leaving the confirmed column has to give the rooms back,
 * or the day stays blocked forever. Both live here rather than in the panel, so
 * a client that forgot cannot create the inconsistency.
 */
export async function GET(req: NextRequest) {
  const auth = requireAdmin(req);
  if (!auth.ok) return auth.response;
  if (!isDbConfigured()) {
    return NextResponse.json({ readOnly: true, cards: [] });
  }
  try {
    const ref = req.nextUrl.searchParams.get("ref");
    if (ref) {
      const found = await getRequest(ref);
      if (!found) return NextResponse.json({ error: "No such request" }, { status: 404 });
      return NextResponse.json({ request: found });
    }
    return NextResponse.json({ readOnly: false, cards: await listBoard() });
  } catch (err) {
    return fail(err);
  }
}

export async function PATCH(req: NextRequest) {
  const auth = requireAdmin(req);
  if (!auth.ok) return auth.response;
  if (!isDbConfigured()) {
    return NextResponse.json({ error: "The database is not connected." }, { status: 503 });
  }

  let body: { ref?: unknown; status?: unknown; notes?: unknown; lostReason?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Malformed request" }, { status: 400 });
  }

  const ref = typeof body.ref === "string" ? body.ref : "";
  if (!ref) return NextResponse.json({ error: "Which request?" }, { status: 400 });

  try {
    if (typeof body.notes === "string") {
      const ok = await setNotes(ref, body.notes.slice(0, 8000));
      if (!ok) return NextResponse.json({ error: "No such request" }, { status: 404 });
      return NextResponse.json({ ok: true });
    }

    const status = body.status;
    if (typeof status !== "string" || !STATUSES.includes(status as RequestStatus)) {
      return NextResponse.json(
        { error: `Status must be one of: ${STATUSES.join(", ")}` },
        { status: 400 }
      );
    }

    if (status === "confirmed") {
      const result = await confirmBooking(ref);
      if (result.ok) {
        return NextResponse.json({ ok: true, alreadyConfirmed: result.alreadyConfirmed });
      }
      if (result.reason === "notFound") {
        return NextResponse.json({ error: "No such request" }, { status: 404 });
      }
      if (result.reason === "notABooking") {
        return NextResponse.json(
          { error: "A message has no date to confirm. Add one first." },
          { status: 400 }
        );
      }
      // 409, and it names the booking in the way — "that slot is taken" with
      // nobody's name on it is not something anyone can act on.
      const who = result.clashes
        .map((c) =>
          c.ref ? `${c.ref}${c.name ? ` (${c.name})` : ""}` : (c.label ?? "a blocked day")
        )
        .filter((v, i, a) => a.indexOf(v) === i);
      return NextResponse.json(
        {
          error: `That slot is already taken by ${who.join(", ")}.`,
          clashes: result.clashes,
        },
        { status: 409 }
      );
    }

    /*
     * Leaving the confirmed column.
     *
     * "done" KEEPS the rooms. The shoot happened, so the day is committed —
     * and if someone marks a job done before its date, which they will, the
     * day must not quietly go back on sale. Only a demotion to an enquiry, or
     * a loss, gives the time back. The equipment query counts confirmed and
     * done alike for the same reason.
     *
     * When the rooms do go back they go back FIRST: if the release succeeded
     * and the status update then failed, the board is wrong but the calendar
     * is right — and a free day shown as booked is far less damaging than a
     * booked day shown as free.
     */
    const released = status === "done" ? 0 : await releaseBooking(ref);
    const ok = await setStatus(
      ref,
      status as Exclude<RequestStatus, "confirmed">,
      typeof body.lostReason === "string" ? body.lostReason.slice(0, 500) : undefined
    );
    if (!ok) return NextResponse.json({ error: "No such request" }, { status: 404 });
    return NextResponse.json({ ok: true, released });
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
  const ref = req.nextUrl.searchParams.get("ref") ?? "";
  if (!ref) return NextResponse.json({ error: "Which request?" }, { status: 400 });
  try {
    // The hold goes with it, through `on delete cascade`.
    const gone = await deleteRequest(ref);
    if (!gone) return NextResponse.json({ error: "No such request" }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return fail(err);
  }
}

function fail(err: unknown): NextResponse {
  if (err instanceof DbError) {
    return NextResponse.json({ error: err.message }, { status: err.status });
  }
  console.error("[ADMIN] requests route failed", err);
  return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
}
