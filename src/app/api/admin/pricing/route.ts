import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/session";
import { loadPricing, savePricing } from "@/lib/admin/pricing-store";
import { SaveRejected } from "@/lib/admin/catalogue";
import { StoreError } from "@/lib/admin/store";
import type { PricingSource } from "@/data/types";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const auth = requireAdmin(req);
  if (!auth.ok) return auth.response;
  try {
    const { data, version, seeded, readOnly } = await loadPricing();
    return NextResponse.json({ data, version, seeded, readOnly });
  } catch (err) {
    return errorResponse(err);
  }
}

export async function PUT(req: NextRequest) {
  const auth = requireAdmin(req);
  if (!auth.ok) return auth.response;

  let body: { data?: unknown; version?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Malformed request" }, { status: 400 });
  }
  const version = typeof body.version === "string" ? body.version : "";

  try {
    // No hand-rolled parser here. Unlike the catalogue, which accepts rows
    // from a form, this is the whole document round-tripped: validatePricing
    // decides what is acceptable, and it runs on exactly what would be written.
    const saved = await savePricing({ data: body.data as PricingSource, version });
    return NextResponse.json({ ok: true, version: saved.version });
  } catch (err) {
    return errorResponse(err);
  }
}

function errorResponse(err: unknown): NextResponse {
  if (err instanceof SaveRejected) {
    return NextResponse.json({ error: "Rejected", errors: err.errors }, { status: 400 });
  }
  if (err instanceof StoreError) {
    return NextResponse.json({ error: err.message }, { status: err.status });
  }
  console.error("[ADMIN] pricing route failed", err);
  return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
}
