import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/session";
import { StoreError, deletePhoto, putPhoto } from "@/lib/admin/store";

export const dynamic = "force-dynamic";

/**
 * Uploads one photo and returns the URL to store on the row.
 *
 * ONLY the file. The row that references it is saved separately, and the ORDER
 * MATTERS: file first, row second. The other way round leaves the catalogue
 * pointing at something that does not exist. A file nobody references is
 * harmless by comparison.
 */

/** After the browser has resized it. A 1600px JPEG lands far below this. */
const MAX_BYTES = 1_500_000;

const ALLOWED = new Map([
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
  ["image/webp", "webp"],
]);

export async function POST(req: NextRequest) {
  const auth = requireAdmin(req);
  if (!auth.ok) return auth.response;

  let body: { code?: unknown; index?: unknown; dataUrl?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Malformed request" }, { status: 400 });
  }

  const code = typeof body.code === "string" ? body.code.trim().toUpperCase() : "";
  // The code becomes part of the stored path, so it may only ever be a plain SKU.
  if (!/^[A-Z0-9][A-Z0-9-]{0,39}$/.test(code)) {
    return NextResponse.json({ error: "Invalid item code" }, { status: 400 });
  }

  const index = Math.floor(Number(body.index));
  if (!Number.isFinite(index) || index < 1 || index > 20) {
    return NextResponse.json({ error: "Invalid photo position" }, { status: 400 });
  }

  const dataUrl = typeof body.dataUrl === "string" ? body.dataUrl : "";
  const match = /^data:([\w/+.-]+);base64,([A-Za-z0-9+/=]+)$/.exec(dataUrl);
  if (!match) {
    return NextResponse.json({ error: "Expected a base64 data URL" }, { status: 400 });
  }
  const ext = ALLOWED.get(match[1]);
  if (!ext) {
    return NextResponse.json(
      { error: `Unsupported type ${match[1]} — use JPEG, PNG or WebP` },
      { status: 400 }
    );
  }

  const bytes = Buffer.from(match[2], "base64");
  if (bytes.length === 0) {
    return NextResponse.json({ error: "The file is empty" }, { status: 400 });
  }
  if (bytes.length > MAX_BYTES) {
    return NextResponse.json(
      { error: `${Math.round(bytes.length / 1024)}KB is too large — resize below 1.5MB` },
      { status: 413 }
    );
  }

  try {
    const url = await putPhoto(code, index, bytes, match[1], ext);
    return NextResponse.json({ ok: true, src: url });
  } catch (err) {
    return fail(err, "Upload failed");
  }
}

/**
 * Removes a photo file.
 *
 * Called AFTER the row that referenced it has been saved without it, for the
 * same reason as above.
 */
export async function DELETE(req: NextRequest) {
  const auth = requireAdmin(req);
  if (!auth.ok) return auth.response;

  const src = req.nextUrl.searchParams.get("src") ?? "";
  // Only ever our own store, and only a path this route could have written.
  if (!/^https:\/\/[a-z0-9-]+\.public\.blob\.vercel-storage\.com\/equipment\/[a-z0-9-]+\/\d{2}\.(jpg|png|webp)$/.test(src)) {
    return NextResponse.json({ error: "Invalid photo URL" }, { status: 400 });
  }

  try {
    await deletePhoto(src);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return fail(err, "Delete failed");
  }
}

function fail(err: unknown, fallback: string): NextResponse {
  if (err instanceof StoreError) {
    return NextResponse.json({ error: err.message }, { status: err.status });
  }
  console.error(`[ADMIN] ${fallback}`, err);
  return NextResponse.json({ error: fallback }, { status: 500 });
}
