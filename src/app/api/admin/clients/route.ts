import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/session";
import { DbError, isDbConfigured } from "@/lib/db/client";
import { deleteClient, getClient, listClients, updateClient } from "@/lib/db/clients";
import { purgeAvailability } from "@/lib/db/availability-cache";
import { todayInLisbon } from "@/lib/date";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * The CRM.
 *
 *   GET    ?id=…   one client with their whole history, or the list without it
 *   PATCH          { id, notes?, tags?, name?, phone?, company? }
 *   DELETE ?id=…   erases the person and everything they sent
 */
export async function GET(req: NextRequest) {
  const auth = requireAdmin(req);
  if (!auth.ok) return auth.response;
  if (!isDbConfigured()) {
    return NextResponse.json({ readOnly: true, clients: [] });
  }
  try {
    const today = todayInLisbon();
    const id = req.nextUrl.searchParams.get("id");
    if (id) {
      const found = await getClient(id, today);
      if (!found) return NextResponse.json({ error: "No such client" }, { status: 404 });
      return NextResponse.json({ client: found });
    }
    return NextResponse.json({ readOnly: false, clients: await listClients(today) });
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

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Malformed request" }, { status: 400 });
  }
  const id = typeof body.id === "string" ? body.id : "";
  if (!id) return NextResponse.json({ error: "Which client?" }, { status: 400 });

  const str = (v: unknown, max: number) =>
    typeof v === "string" ? v.slice(0, max) : undefined;

  try {
    const ok = await updateClient(id, {
      notes: str(body.notes, 8000),
      name: str(body.name, 200),
      phone: str(body.phone, 40),
      company: str(body.company, 200),
      tags: Array.isArray(body.tags)
        ? body.tags
            .filter((t): t is string => typeof t === "string")
            .map((t) => t.trim().slice(0, 40))
            .filter(Boolean)
            .slice(0, 20)
        : undefined,
    });
    if (!ok) return NextResponse.json({ error: "No such client" }, { status: 404 });
    return NextResponse.json({ ok: true });
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
  const id = req.nextUrl.searchParams.get("id") ?? "";
  if (!id) return NextResponse.json({ error: "Which client?" }, { status: 400 });
  try {
    const gone = await deleteClient(id);
    // Their bookings released rooms on the way out, so the calendar changed.
    purgeAvailability();
    return NextResponse.json({ ok: true, requests: gone.requests });
  } catch (err) {
    return fail(err);
  }
}

function fail(err: unknown): NextResponse {
  if (err instanceof DbError) {
    return NextResponse.json({ error: err.message }, { status: err.status });
  }
  console.error("[ADMIN] clients route failed", err);
  return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
}
