/**
 * Signed tokens for the confirm/decline links in the studio's email.
 *
 * The token carries only enough to FIND the booking — reference and date. The
 * booking itself lives in the calendar event, so nothing sensitive travels in
 * a URL and the link stays short whatever the client wrote in their brief.
 *
 * HMAC-signed because the alternative is a guessable link: without a signature
 * anyone could confirm arbitrary bookings by trying references.
 */

import crypto from "node:crypto";
import type { ISODate } from "@/lib/date";

/** Links stop working after this. A stale request should be re-checked, not honoured. */
const TTL_DAYS = 60;

export interface BookingTokenPayload {
  /** Booking reference, e.g. "KID-8QF3ZP". */
  r: string;
  /** Booking date, so the calendar search can be scoped. */
  d: ISODate;
  /** Expiry, epoch seconds. */
  e: number;
}

export class TokenError extends Error {}

function secret(): string {
  const s = process.env.BOOKING_CONFIRM_SECRET;
  if (!s || s.length < 32) {
    throw new TokenError(
      "BOOKING_CONFIRM_SECRET is missing or too short (needs >= 32 chars)"
    );
  }
  return s;
}

const b64url = (b: Buffer) =>
  b.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

const fromB64url = (s: string) =>
  Buffer.from(s.replace(/-/g, "+").replace(/_/g, "/"), "base64");

function sign(body: string): string {
  return b64url(crypto.createHmac("sha256", secret()).update(body).digest());
}

export function createBookingToken(ref: string, date: ISODate): string {
  const payload: BookingTokenPayload = {
    r: ref,
    d: date,
    e: Math.floor(Date.now() / 1000) + TTL_DAYS * 86400,
  };
  const body = b64url(Buffer.from(JSON.stringify(payload), "utf8"));
  return `${body}.${sign(body)}`;
}

export function verifyBookingToken(token: string): BookingTokenPayload {
  const [body, mac] = (token ?? "").split(".");
  if (!body || !mac) throw new TokenError("Malformed link");

  const expected = sign(body);
  // Constant-time compare: a plain === leaks timing information about the MAC.
  const a = Buffer.from(mac);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    throw new TokenError("This link isn't valid");
  }

  let payload: BookingTokenPayload;
  try {
    payload = JSON.parse(fromB64url(body).toString("utf8"));
  } catch {
    throw new TokenError("Malformed link");
  }
  if (!payload.r || !payload.d) throw new TokenError("Malformed link");
  if (payload.e < Math.floor(Date.now() / 1000)) {
    throw new TokenError("This link has expired");
  }
  return payload;
}

/** Absolute URL for the studio's email. */
export function confirmUrl(ref: string, date: ISODate): string {
  const base =
    process.env.SITE_URL ??
    (process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : "http://localhost:3000");
  return `${base}/booking/confirm?t=${encodeURIComponent(createBookingToken(ref, date))}`;
}
