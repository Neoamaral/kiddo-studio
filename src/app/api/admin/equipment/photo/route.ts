import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/session";
import { photoPath, publicSrc } from "@/lib/admin/catalogue";
import { GitHubError, readFile, writeFile, deleteFile } from "@/lib/admin/github";

export const dynamic = "force-dynamic";

/**
 * Uploads one photo and returns the src to store on the row.
 *
 * ONLY the file. The row that references it is saved separately, by the
 * catalogue route, and the ORDER MATTERS: file first, row second. The other
 * way round leaves the catalogue pointing at a file that does not exist, and
 * the validator fails the build — the site would freeze on the last good
 * deployment until someone noticed.
 *
 * The reverse failure is harmless by comparison: a file nobody references is
 * a warning, not an error.
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
  // The code becomes a directory name, so it may only ever be a plain SKU.
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

  const path = photoPath(code, index, ext);

  try {
    // Replacing an existing photo needs its sha; creating one must not send it.
    const existing = await readFile(path).catch(() => null);
    await writeFile({
      path,
      content: bytes,
      message: `admin: photo ${index} for ${code}`,
      ...(existing ? { sha: existing.sha } : {}),
    });
    return NextResponse.json({ ok: true, src: publicSrc(path) });
  } catch (err) {
    if (err instanceof GitHubError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("[ADMIN] photo upload failed", err);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
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
  if (!/^\/images\/equipment\/[a-z0-9-]+\/\d{2}\.(jpg|png|webp)$/.test(src)) {
    return NextResponse.json({ error: "Invalid photo path" }, { status: 400 });
  }
  const path = `public${src}`;

  try {
    const existing = await readFile(path);
    if (!existing) return NextResponse.json({ ok: true });
    await deleteFile({ path, sha: existing.sha, message: `admin: remove ${src}` });
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof GitHubError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("[ADMIN] photo delete failed", err);
    return NextResponse.json({ error: "Delete failed" }, { status: 500 });
  }
}
