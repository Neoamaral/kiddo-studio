import { NextRequest, NextResponse } from "next/server";
import { rateLimited, type RateLimit } from "@/lib/guard";
import { CONSENT_COOKIE, decodeConsent } from "@/lib/analytics/consent";
import { isEventName, referrerHost, safePath, sanitiseProps, FUNNEL_STEPS } from "@/lib/analytics/events";
import { writeBatch, type EventInput } from "@/lib/db/analytics";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * /api/pulse — where the browser's batches land.
 *
 * NOT /api/track. Generic ad-blocker lists match paths containing the word "track", and a
 * measurement endpoint that half the visitors cannot reach is worse than no
 * measurement, because the numbers look real.
 *
 * THE CONSENT COOKIE IS CHECKED HERE TOO, not only in the browser. The client
 * already refuses to send without it; this is the lock on the other side of
 * the same door, for a stale tab, a replayed request, or a client that was
 * tampered with. A request without marketing-or-analytics consent is accepted
 * and discarded — 204, never an error, because telling a prober which requests
 * were stored is information it does not need.
 *
 * Generous but real: a visitor produces a handful of batches, and 60 in ten
 * minutes from one address is already far more than a person.
 */
const PULSE_LIMIT: RateLimit = { limit: 60, windowMs: 10 * 60 * 1000 };

const MAX_EVENTS = 40;
const STEPS: readonly string[] = FUNNEL_STEPS;

/** 204 and nothing else. The browser has no use for a body here. */
function done(): NextResponse {
  return new NextResponse(null, { status: 204 });
}

export async function POST(req: NextRequest) {
  if (rateLimited(req, "pulse", PULSE_LIMIT)) return done();

  // Never written without consent, and never reported as refused either.
  const consent = decodeConsent(req.cookies.get(CONSENT_COOKIE)?.value);
  if (!consent?.analytics) return done();

  if (process.env.ANALYTICS_DISABLED === "1") return done();

  let body: { session?: unknown; events?: unknown };
  try {
    body = await req.json();
  } catch {
    return done();
  }

  const s = (body.session ?? {}) as Record<string, unknown>;
  const id = typeof s.id === "string" ? s.id : "";
  if (!/^[a-z0-9]{8,32}$/.test(id)) return done();

  const str = (v: unknown, max: number): string | null =>
    typeof v === "string" && v.trim() ? v.trim().slice(0, max) : null;

  const device = typeof s.device === "string" && ["mobile", "tablet", "desktop"].includes(s.device)
    ? s.device
    : null;

  const raw = Array.isArray(body.events) ? body.events.slice(0, MAX_EVENTS) : [];
  const events: EventInput[] = [];

  for (const item of raw) {
    const e = (item ?? {}) as Record<string, unknown>;
    if (!isEventName(e.name)) continue; // closed vocabulary; unknown names vanish

    const stepIndex =
      typeof e.stepIndex === "number" && Number.isInteger(e.stepIndex) && e.stepIndex >= 0 && e.stepIndex <= 20
        ? e.stepIndex
        : null;
    const step = typeof e.step === "string" && STEPS.includes(e.step) ? e.step : null;

    events.push({
      ageMs: typeof e.age === "number" && Number.isFinite(e.age) ? e.age : 0,
      name: e.name,
      // safePath drops the query string. /booking/confirm's URL is a credential.
      path: safePath(typeof e.path === "string" ? e.path : null),
      step,
      stepIndex,
      ref: /^KID-[A-Z0-9]{4,16}$/.test(String(e.ref ?? "")) ? String(e.ref) : null,
      props: sanitiseProps(e.name, e.props),
    });
  }

  if (events.length === 0) return done();

  try {
    await writeBatch(
      {
        id,
        landingPath: safePath(typeof s.landingPath === "string" ? s.landingPath : null),
        // Host only — a full referrer carries click ids and sometimes addresses.
        referrerHost: referrerHost(typeof s.referrer === "string" ? s.referrer : null),
        utmSource: str(s.utmSource, 80),
        utmMedium: str(s.utmMedium, 80),
        utmCampaign: str(s.utmCampaign, 120),
        paid: s.paid === true,
        device,
      },
      events
    );
  } catch (err) {
    // Measurement must never surface as a failure to a visitor, and the
    // browser does not read this response anyway.
    console.error("[PULSE] batch write failed", err);
  }

  return done();
}
