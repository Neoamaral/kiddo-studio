import "server-only";

/**
 * The Conversions API: telling Meta about a booking from the server.
 *
 * WHY THIS EXISTS AT ALL
 *
 * The browser pixel is blocked for a meaningful share of visitors — ad
 * blockers, Safari's protections, extensions. Those people still book. A
 * server-side event is the only way the studio learns that an advert produced
 * a booking from someone whose browser refused to say so, which is exactly the
 * traffic worth knowing about.
 *
 * DEDUPLICATION IS THE WHOLE CONTRACT
 *
 * The browser fires Lead with eventID = the booking ref, and this sends the
 * same ref as event_id. Meta collapses the two into one. Get this wrong and
 * every booking counts twice, every cost-per-lead halves, and the studio makes
 * spending decisions on a number that is exactly 2x reality. The ref is the
 * right key because it already exists, is already unique per booking, and is
 * already what both sides have in hand.
 *
 * CONSENT IS READ FROM THE REQUEST, NEVER ASSUMED
 *
 * The caller passes the consent cookie's own value. Sending hashed personal
 * data to Meta for someone who declined marketing is the precise thing the
 * banner promised would not happen.
 *
 * AWAITED, NOT FIRE-AND-FORGET
 *
 * On Vercel the function is frozen once the response is returned, so a
 * floating promise may simply never run — the same lesson db/client.ts records
 * about pool.end(). It is awaited with a short timeout inside a try/catch that
 * only logs, so the worst case is a couple of seconds added to a booking that
 * has already succeeded.
 */

import crypto from "node:crypto";
import { decodeConsent } from "@/lib/analytics/consent";
import { readRow } from "@/lib/db/integrations";
import { open } from "@/lib/crypto/secretbox";
import { TOKEN_AAD } from "./store";
import { META_API_VERSION } from "./meta-test";

const TIMEOUT_MS = 2_000;

/** Meta wants lowercase, trimmed, then SHA-256 hex. */
function hashed(value: string | null | undefined): string | null {
  const v = (value ?? "").trim().toLowerCase();
  if (!v) return null;
  return crypto.createHash("sha256").update(v, "utf8").digest("hex");
}

/** Digits only, with the country code, then hashed. Meta rejects "+" and spaces. */
function hashedPhone(value: string | null | undefined): string | null {
  const digits = (value ?? "").replace(/[^0-9]/g, "");
  if (digits.length < 8) return null;
  return crypto.createHash("sha256").update(digits, "utf8").digest("hex");
}

export interface LeadInput {
  /** The booking ref. Doubles as the deduplication key. */
  ref: string;
  email: string;
  phone?: string;
  name?: string;
  /** Ex-VAT total in whole euros, as the quote states it. */
  valueEuros: number;
  /** The raw kiddo_consent cookie from the request. */
  consentCookie: string | undefined;
  /** For event_source_url. */
  siteUrl: string;
  /** The visitor's IP and user agent, when the platform gave them. */
  clientIp?: string | null;
  clientUserAgent?: string | null;
}

export type LeadResult =
  | { sent: true }
  | { sent: false; why: "no-consent" | "not-configured" | "no-token" | "failed" };

export async function sendLeadEvent(input: LeadInput): Promise<LeadResult> {
  const consent = decodeConsent(input.consentCookie);
  if (!consent?.marketing) return { sent: false, why: "no-consent" };

  const row = await readRow().catch(() => null);
  /*
   * All three, not just the switch. `metaEnabled` is what the studio toggled;
   * a pixel id and a stored token are what make the call possible at all, and
   * the database lets the switch be on with the token cleared.
   */
  if (!row?.metaEnabled || !row.metaPixelId || !row.metaCapiToken) {
    return { sent: false, why: "not-configured" };
  }

  let token: string;
  try {
    token = open(row.metaCapiToken, TOKEN_AAD);
  } catch {
    // Already logged by the panel's own check; nothing actionable here.
    return { sent: false, why: "no-token" };
  }

  /*
   * first_name, not the whole name. Meta's spec hashes given and family names
   * separately, and sending "Maria Sentinela" as fn simply never matches.
   */
  const first = (input.name ?? "").trim().split(/\s+/)[0] ?? "";
  const userData: Record<string, unknown> = {};
  const em = hashed(input.email);
  const ph = hashedPhone(input.phone);
  const fn = hashed(first);
  if (em) userData.em = [em];
  if (ph) userData.ph = [ph];
  if (fn) userData.fn = [fn];
  if (input.clientIp) userData.client_ip_address = input.clientIp;
  if (input.clientUserAgent) userData.client_user_agent = input.clientUserAgent;

  // Meta requires at least one customer parameter. Without one the event is
  // accepted and then quietly dropped from matching, which is worse than not
  // sending it.
  if (!em && !ph) return { sent: false, why: "failed" };

  const body: Record<string, unknown> = {
    data: [
      {
        event_name: "Lead",
        event_time: Math.floor(Date.now() / 1000),
        action_source: "website",
        event_source_url: input.siteUrl,
        // THE DEDUPLICATION KEY. Must equal the browser's eventID.
        event_id: input.ref,
        user_data: userData,
        custom_data: { currency: "EUR", value: input.valueEuros },
      },
    ],
    access_token: token,
  };
  // While a test code is set, events are excluded from reporting. Honouring it
  // here as well means "test mode" means the same thing on both sides.
  if (row.metaTestEventCode) body.test_event_code = row.metaTestEventCode;

  try {
    const res = await fetch(
      `https://graph.facebook.com/${META_API_VERSION}/${encodeURIComponent(row.metaPixelId)}/events`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(TIMEOUT_MS),
        cache: "no-store",
      }
    );
    const out = (await res.json().catch(() => ({}))) as {
      events_received?: number;
      messages?: unknown[];
      error?: { message?: string; code?: number };
    };
    if (!res.ok || out.error || out.events_received !== 1) {
      console.error(`[BOOKING ${input.ref}] Meta CAPI refused the Lead`, {
        status: res.status,
        error: out.error,
        received: out.events_received,
        messages: out.messages,
      });
      return { sent: false, why: "failed" };
    }
    return { sent: true };
  } catch (err) {
    console.error(`[BOOKING ${input.ref}] Meta CAPI call failed`, err);
    return { sent: false, why: "failed" };
  }
}
