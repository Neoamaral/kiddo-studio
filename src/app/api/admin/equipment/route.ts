import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/session";
import { loadCatalogue, saveCatalogue, SaveRejected } from "@/lib/admin/catalogue";
import { GitHubError } from "@/lib/admin/github";
import { codesUsedByBundles } from "@/lib/equipment-validate";
import { EQUIPMENT_BUNDLES } from "@/data/equipment";
import type { EquipmentSourceRow, Rate, RatePeriod } from "@/data/types";

/** Reads the repository on every request, so it can never be prerendered. */
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const auth = requireAdmin(req);
  if (!auth.ok) return auth.response;

  try {
    const { data, sha, readOnly } = await loadCatalogue();
    return NextResponse.json({
      rows: data.rows,
      sha,
      readOnly,
      // The panel greys out the delete button for these instead of letting the
      // save fail: a bundle naming missing gear silently breaks bookings.
      lockedCodes: [...codesUsedByBundles(EQUIPMENT_BUNDLES)],
      categories: [...new Set(data.rows.map((r) => r.category))],
    });
  } catch (err) {
    return errorResponse(err);
  }
}

/* ── Parsing ─────────────────────────────────────────────────────────────── */

const str = (v: unknown, max: number) =>
  typeof v === "string" ? v.trim().slice(0, max) : "";

const PERIODS: RatePeriod[] = ["hour", "halfDay", "day", "week", "unit"];

/**
 * Shape only. Whether the VALUES are acceptable is decided by
 * validateCatalogue, so there is exactly one place the rules live — which is
 * why an unparseable amount becomes NaN here rather than being silently
 * corrected: the validator then rejects it by name.
 */
function parseRate(v: unknown): Rate {
  const r = (v ?? {}) as Record<string, unknown>;
  const kind = str(r.kind, 20);
  if (kind === "free") return { kind: "free" };
  if (kind === "onRequest") return { kind: "onRequest" };

  const amount = Number(r.amount);
  const per = PERIODS.find((p) => p === r.per) ?? "day";
  return {
    kind: kind === "from" ? "from" : "fixed",
    amount: Number.isFinite(amount) ? Math.round(amount) : NaN,
    per,
  };
}

function parseRow(v: unknown): EquipmentSourceRow {
  const r = (v ?? {}) as Record<string, unknown>;
  const photos = Array.isArray(r.photos)
    ? r.photos.slice(0, 20).map((p) => {
        const o = (p ?? {}) as Record<string, unknown>;
        return { src: str(o.src, 300), alt: str(o.alt, 300) };
      })
    : undefined;

  return {
    // Uppercased so the code and its lowercase photo folder cannot drift apart.
    code: str(r.code, 40).toUpperCase(),
    category: str(r.category, 100),
    name: str(r.name, 200),
    spec: str(r.spec, 400),
    rate: parseRate(r.rate),
    inStock: Math.floor(Number(r.inStock)),
    ...(r.hot ? { hot: true } : {}),
    ...(photos?.length ? { photos } : {}),
    ...(str(r.description, 2000) ? { description: str(r.description, 2000) } : {}),
  };
}

/* ── Save ────────────────────────────────────────────────────────────────── */

export async function PUT(req: NextRequest) {
  const auth = requireAdmin(req);
  if (!auth.ok) return auth.response;

  let body: { rows?: unknown; sha?: unknown; message?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Malformed request" }, { status: 400 });
  }

  if (!Array.isArray(body.rows)) {
    return NextResponse.json({ error: "rows must be an array" }, { status: 400 });
  }
  const sha = str(body.sha, 100);
  if (!sha) {
    return NextResponse.json(
      { error: "Missing sha — reload the page and try again" },
      { status: 400 }
    );
  }

  const rows = body.rows.map(parseRow);

  try {
    const { data } = await loadCatalogue();

    // Deleting gear a bundle sells is refused here as well as in the UI: the
    // panel is not the only thing that can send this request.
    const locked = codesUsedByBundles(EQUIPMENT_BUNDLES);
    const nowPresent = new Set(rows.map((r) => r.code));
    const removed = [...locked].filter((c) => !nowPresent.has(c));
    if (removed.length) {
      return NextResponse.json(
        {
          error:
            `${removed.join(", ")} cannot be deleted — a gear bundle sells it. ` +
            `Remove it from the bundle first.`,
        },
        { status: 409 }
      );
    }

    const { commit } = await saveCatalogue({
      rows,
      previous: data,
      sha,
      message: str(body.message, 200) || `admin: update equipment (${rows.length} items)`,
    });
    return NextResponse.json({ ok: true, commit });
  } catch (err) {
    return errorResponse(err);
  }
}

function errorResponse(err: unknown): NextResponse {
  if (err instanceof SaveRejected) {
    // Every rule that failed, not just the first — fixing them one reload at a
    // time would be miserable.
    return NextResponse.json({ error: "Rejected", errors: err.errors }, { status: 400 });
  }
  if (err instanceof GitHubError) {
    return NextResponse.json({ error: err.message }, { status: err.status });
  }
  console.error("[ADMIN] equipment route failed", err);
  return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
}
