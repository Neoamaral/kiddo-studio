import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/session";
import { SaveRejected } from "@/lib/admin/catalogue";
import { DbError } from "@/lib/db/client";
import { loadIntegrations, saveIntegrations, VersionConflict } from "@/lib/integrations/store";
import type { IntegrationsPatch } from "@/lib/integrations/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * THE GET NEVER RETURNS THE TOKEN.
 *
 * Not masked, not truncated, not as a boolean beside it — it is simply never
 * read into the response. `loadIntegrations` returns a TokenState describing
 * it instead. A masked token in a JSON response is still a token in a browser
 * tab, a devtools log and whatever a browser extension can read.
 */
export async function GET(req: NextRequest) {
  const auth = requireAdmin(req);
  if (!auth.ok) return auth.response;
  try {
    const { data, readOnly, keyProblem } = await loadIntegrations();
    return NextResponse.json({ data, readOnly, keyProblem });
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
  if (!version) {
    // No version means the screen never loaded, which means it cannot know
    // what it is overwriting. Refuse rather than clobber.
    return NextResponse.json({ error: "Reload the page and try again." }, { status: 409 });
  }

  /*
   * Rebuilt field by field rather than cast. `body.data as T` would let an
   * unexpected key through to the row builder, and one of the fields here is a
   * credential — this is not the place to trust a shape.
   */
  const d = (body.data ?? {}) as Record<string, unknown>;
  const str = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");

  const patch: IntegrationsPatch = {
    metaPixelId: str(d.metaPixelId, 40),
    metaTestEventCode: str(d.metaTestEventCode, 24),
    metaEnabled: d.metaEnabled === true,
    googleTagId: str(d.googleTagId, 40).toUpperCase(),
    googleEnabled: d.googleEnabled === true,
  };

  /*
   * Tri-state, and the check is `in` rather than truthiness on purpose: an
   * empty string means DELETE the stored token, and truthiness would silently
   * turn that into "leave it alone".
   */
  if ("metaCapiToken" in d) {
    patch.metaCapiToken = str(d.metaCapiToken, 1000);
  }

  try {
    const saved = await saveIntegrations(patch, {
      expectedUpdatedAt: version,
      by: auth.session.u,
    });
    return NextResponse.json({ ok: true, version: saved.updatedAt });
  } catch (err) {
    return errorResponse(err);
  }
}

function errorResponse(err: unknown): NextResponse {
  if (err instanceof SaveRejected) {
    return NextResponse.json({ error: "Rejected", errors: err.errors }, { status: 400 });
  }
  if (err instanceof VersionConflict) {
    return NextResponse.json({ error: err.message }, { status: err.status });
  }
  if (err instanceof DbError) {
    return NextResponse.json({ error: err.message }, { status: err.status });
  }
  // Never echo the error: a stack from the crypto layer could carry a fragment
  // of what it was handling.
  console.error("[ADMIN] integrations route failed", err);
  return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
}
