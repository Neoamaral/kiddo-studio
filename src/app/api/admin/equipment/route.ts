import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/session";
import { loadCatalogue, saveCatalogue, SaveRejected } from "@/lib/admin/catalogue";
import { StoreError } from "@/lib/admin/store";
import { SEED_BUNDLES } from "@/data/equipment";
import type { EquipmentBundle, EquipmentSourceRow, Rate, RatePeriod } from "@/data/types";

/** Reads the repository on every request, so it can never be prerendered. */
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const auth = requireAdmin(req);
  if (!auth.ok) return auth.response;

  try {
    const { data, version, seeded, readOnly } = await loadCatalogue();
    return NextResponse.json({
      rows: data.rows,
      // readEquipment guarantees this is filled, even for a document written
      // before bundles were editable.
      bundles: data.bundles ?? [],
      version,
      seeded,
      readOnly,
      /*
       * lockedCodes is gone. The panel derives it from the bundles it is
       * editing, so the delete button unlocks the instant an item is taken out
       * of a bundle. A server-sent list would describe the STORED document
       * while the screen describes the proposed one.
       */
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

/**
 * Shape only, like parseRow — and for one reason that is not obvious.
 *
 * validateCatalogue never type-checks memberCodes. Round-trip
 * `{"memberCodes": "CAM-01"}` and `for (const code of bundle.memberCodes)`
 * iterates CHARACTERS: "C", "A", "M". That reaches storage and the booking
 * page. The codes are uppercased here for the same reason parseRow uppercases
 * a row's code — a member in the wrong case would match no row, and the save
 * would be refused for a code the studio can see on screen.
 */
function parseBundle(v: unknown): EquipmentBundle {
  const b = (v ?? {}) as Record<string, unknown>;
  // parseRate never returns undefined, so "has a price" is decided out here.
  const hasRate = b.rate !== null && b.rate !== undefined;
  return {
    id: str(b.id, 40).toLowerCase(),
    label: str(b.label, 200),
    memberCodes: Array.isArray(b.memberCodes)
      ? b.memberCodes.slice(0, 40).map((c) => str(c, 40).toUpperCase()).filter(Boolean)
      : [],
    ...(hasRate ? { rate: parseRate(b.rate) } : {}),
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

  let body: { rows?: unknown; bundles?: unknown; version?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Malformed request" }, { status: 400 });
  }

  if (!Array.isArray(body.rows)) {
    return NextResponse.json({ error: "rows must be an array" }, { status: 400 });
  }
  if (body.bundles !== undefined && !Array.isArray(body.bundles)) {
    return NextResponse.json({ error: "bundles must be an array" }, { status: 400 });
  }
  // An empty version is legitimate: it means "I was editing the seed", and
  // the store only accepts it while nothing has been saved.
  const version = typeof body.version === "string" ? body.version : "";

  const rows = body.rows.map(parseRow);

  try {
    const { data } = await loadCatalogue();

    /*
     * ABSENT means "this client does not manage bundles", EMPTY means "delete
     * them all". They are not the same thing, and conflating them loses data:
     * a panel tab opened before this shipped sends { rows, version } with no
     * bundles key, and would wipe every bundle on its next save. The version
     * check does not save us — that tab holds a current version and passes it
     * cleanly.
     */
    const bundles =
      body.bundles === undefined
        ? (data.bundles ?? [...SEED_BUNDLES])
        : body.bundles.map(parseBundle);

    /*
     * The bespoke 409 that refused to delete gear a bundle sells is gone.
     *
     * It compared the proposed rows against the STORED bundles, which is now a
     * dead end with no way out: the studio takes CAM-01 out of the camera
     * bundle and deletes the item in one save — the obvious way — and the
     * stored bundle still names it, so the save is refused forever.
     *
     * validateCatalogue applies the same rule to the PROPOSED document, which
     * is what gets written, and it still runs server-side — so the original
     * reason for it ("the panel is not the only thing that can send this
     * request") is fully kept.
     */
    const saved = await saveCatalogue({ rows, bundles, previous: data, version });
    return NextResponse.json({ ok: true, version: saved.version, warnings: saved.warnings });
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
  if (err instanceof StoreError) {
    return NextResponse.json({ error: err.message }, { status: err.status });
  }
  console.error("[ADMIN] equipment route failed", err);
  return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
}
