import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/session";
import { rateLimited, type RateLimit } from "@/lib/guard";
import { getCapiToken } from "@/lib/integrations/store";
import { probePixel, sendTestEvent } from "@/lib/integrations/meta-test";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Rate limited even though it is behind the admin session.
 *
 * Not for authorisation — requireAdmin does that — but because this handler
 * calls Meta with the studio's own credentials. A button stuck in a retry loop
 * would spend the studio's Graph API quota and lock them out of testing their
 * own integration, which is a bad half-hour caused by a bug on our side.
 */
const TEST_LIMIT: RateLimit = { limit: 20, windowMs: 10 * 60 * 1000 };

export async function POST(req: NextRequest) {
  const auth = requireAdmin(req);
  if (!auth.ok) return auth.response;
  if (rateLimited(req, "integrations-test", TEST_LIMIT)) {
    return NextResponse.json(
      { ok: false, message: "Too many tests in a short time. Wait a few minutes." },
      { status: 429 }
    );
  }

  let body: { pixelId?: unknown; token?: unknown; testEventCode?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, message: "Malformed request" }, { status: 400 });
  }

  const pixelId = typeof body.pixelId === "string" ? body.pixelId.trim() : "";
  if (!/^[0-9]{10,25}$/.test(pixelId)) {
    return NextResponse.json({
      ok: false,
      message: "Enter the Pixel ID first — 10 to 25 digits, from Events Manager.",
    });
  }

  /*
   * Tests WHAT IS IN THE FORM when a token was typed, so the studio can check
   * a token before committing it; falls back to the stored one when the field
   * was left alone, so Test still works on a screen they have just opened.
   *
   * getCapiToken returns null for every failure — no key, rotated key,
   * tampered record — so there is no path here that sends a half-formed
   * credential to Meta.
   */
  const typed = typeof body.token === "string" ? body.token.trim() : "";
  const token = typed || (await getCapiToken());
  if (!token) {
    return NextResponse.json({
      ok: false,
      message: "There is no Conversions API token to test with.",
      hint: "Paste one into the field above, or generate one in Events Manager > your dataset > Settings > Conversions API.",
    });
  }

  const read = await probePixel(pixelId, token);

  /*
   * TWO TIERS, and the second only runs when the first cannot answer.
   *
   * The read test is tried first because it has no side effects at all. But a
   * Conversions API token generated in Events Manager is scoped to SEND events
   * to one dataset, not to read that dataset's record — so for the most common
   * kind of token the read is refused with (#100) Missing Permission, which
   * says nothing about whether the integration works.
   *
   * The send test answers it properly: it asks the token to do the one thing
   * it exists for. It is only run WITH a test event code, because without one
   * the event counts as a real PageView in the studio's reporting, and a
   * connection test must not quietly write to the data it is testing.
   */
  if (read.ok || !read.sendTestAvailable) return NextResponse.json(read);

  const code = typeof body.testEventCode === "string" ? body.testEventCode.trim() : "";
  if (!/^TEST[0-9]{1,12}$/.test(code)) {
    return NextResponse.json(read);
  }

  const siteUrl = process.env.SITE_URL?.replace(/\/+$/, "") || "https://www.kiddostudio.pt";
  const sent = await sendTestEvent(pixelId, token, code, siteUrl + "/");
  return NextResponse.json(sent);
}
