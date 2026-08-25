/**
 * Minimum protection for the public endpoints.
 *
 * Until now no route in this project had any: no auth, no rate limit, no
 * origin check. That was survivable while a POST only produced a console.log
 * and an email. It stops being survivable the moment the same POST writes to
 * the studio's real calendar, where an abusive script could fill months.
 *
 * This is a floor, not a fortress. A determined attacker forges an Origin
 * header and rotates IPs. It removes drive-by traffic and accidental
 * double-submits, for ~40 lines and no dependency.
 */

import type { NextRequest } from "next/server";

/**
 * In-memory sliding window.
 *
 * Per serverless instance and lost on cold start, so the real limit is looser
 * than configured. Fine at this site's traffic; the honest upgrade is Upstash
 * Redis, which is why the shape here matches what that would replace.
 */
const hits = new Map<string, number[]>();

/** Stop the Map growing without bound on a long-lived instance. */
function sweep(now: number, windowMs: number) {
  if (hits.size < 500) return;
  for (const [key, times] of hits) {
    const live = times.filter((t) => now - t < windowMs);
    if (live.length === 0) hits.delete(key);
    else hits.set(key, live);
  }
}

export interface RateLimit {
  /** Requests allowed per window. */
  limit: number;
  windowMs: number;
}

export const CONFIRM_LIMIT: RateLimit = { limit: 5, windowMs: 60 * 60 * 1000 };
export const READ_LIMIT: RateLimit = { limit: 60, windowMs: 10 * 60 * 1000 };

function clientKey(req: NextRequest, bucket: string): string {
  // Vercel sets x-forwarded-for; the left-most entry is the client.
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown";
  return `${bucket}:${ip}`;
}

export function rateLimited(req: NextRequest, bucket: string, cfg: RateLimit): boolean {
  const now = Date.now();
  sweep(now, cfg.windowMs);

  const key = clientKey(req, bucket);
  const recent = (hits.get(key) ?? []).filter((t) => now - t < cfg.windowMs);
  if (recent.length >= cfg.limit) {
    hits.set(key, recent);
    return true;
  }
  recent.push(now);
  hits.set(key, recent);
  return false;
}

/**
 * Reject a cross-site POST.
 *
 * Only checks when an Origin is present: same-origin form posts and server-side
 * calls legitimately omit it, and rejecting those would break the site rather
 * than protect it.
 */
export function wrongOrigin(req: NextRequest): boolean {
  const origin = req.headers.get("origin");
  if (!origin) return false;
  try {
    return new URL(origin).host !== new URL(req.url).host;
  } catch {
    return true;
  }
}
