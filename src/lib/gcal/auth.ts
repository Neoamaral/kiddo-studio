/**
 * Service-account auth for the Google Calendar API.
 *
 * Hand-rolled RS256 JWT -> token exchange rather than `googleapis`, which is
 * 40-90 MB and ships the entire discovery surface. This project's whole
 * dependency list is six packages; three REST endpoints do not justify that,
 * and it would measurably inflate the serverless bundle.
 *
 * Mirrors src/lib/magnific.ts: raw fetch, a lazy per-call env read that THROWS
 * when unset (deliberately unlike Resend's silent skip, because a booking that
 * silently fails to block a slot is worse than one that errors).
 */

const TOKEN_URL = "https://oauth2.googleapis.com/token";
const SCOPE = "https://www.googleapis.com/auth/calendar";

/** Refresh this far before actual expiry, to absorb clock skew. */
const EXPIRY_MARGIN_S = 60;

let cached: { token: string; expiresAt: number } | null = null;

export class GCalConfigError extends Error {}

/**
 * The PEM, however the environment mangled it.
 *
 * The JSON key stores the private key with the two literal characters \ and n.
 * Pasted into a hosting provider's env UI it stays escaped, and the PKCS#8
 * decoder then fails with `error:1E08010C:DECODER routines::unsupported`,
 * which says nothing about the real cause. Prefer the base64 form, which is a
 * single line and survives every env UI; normalise the raw form as a fallback.
 */
function readPrivateKey(): string {
  const b64 = process.env.GOOGLE_SA_PRIVATE_KEY_B64;
  const raw = process.env.GOOGLE_SA_PRIVATE_KEY;

  let pem = "";
  if (b64) {
    pem = Buffer.from(b64, "base64").toString("utf8");
  } else if (raw) {
    pem = raw.replace(/^["']|["']$/g, "").replace(/\\n/g, "\n");
  } else {
    throw new GCalConfigError(
      "GOOGLE_SA_PRIVATE_KEY_B64 is not set — see scripts/setup-google-calendar.md"
    );
  }

  if (!pem.trimStart().startsWith("-----BEGIN PRIVATE KEY-----")) {
    throw new GCalConfigError(
      "The service account private key did not decode to a PKCS#8 PEM. " +
        "Use GOOGLE_SA_PRIVATE_KEY_B64 (single-line base64); see scripts/setup-google-calendar.md"
    );
  }
  return pem;
}

function clientEmail(): string {
  const v = process.env.GOOGLE_SA_CLIENT_EMAIL;
  if (!v) {
    throw new GCalConfigError("GOOGLE_SA_CLIENT_EMAIL is not set");
  }
  return v;
}

/** True when the integration is configured AND not switched off. */
export function isCalendarConfigured(): boolean {
  if (process.env.BOOKING_CALENDAR_WRITE === "off") return false;
  return !!(
    process.env.GOOGLE_SA_CLIENT_EMAIL &&
    (process.env.GOOGLE_SA_PRIVATE_KEY_B64 || process.env.GOOGLE_SA_PRIVATE_KEY)
  );
}

function b64url(input: ArrayBuffer | string): string {
  const buf =
    typeof input === "string" ? Buffer.from(input, "utf8") : Buffer.from(input);
  return buf.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/** Strip the PEM armour and decode to the DER bytes importKey wants. */
function pemToPkcs8(pem: string): ArrayBuffer {
  const body = pem
    .replace(/-----BEGIN PRIVATE KEY-----/, "")
    .replace(/-----END PRIVATE KEY-----/, "")
    .replace(/\s+/g, "");
  const der = Buffer.from(body, "base64");
  return der.buffer.slice(der.byteOffset, der.byteOffset + der.byteLength);
}

export async function getAccessToken(): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  if (cached && cached.expiresAt - EXPIRY_MARGIN_S > now) {
    return cached.token;
  }

  const email = clientEmail();
  const pem = readPrivateKey();

  const header = { alg: "RS256", typ: "JWT" };
  const claims = {
    iss: email,
    scope: SCOPE,
    aud: TOKEN_URL,
    iat: now,
    exp: now + 3600,
  };
  const signingInput = `${b64url(JSON.stringify(header))}.${b64url(JSON.stringify(claims))}`;

  const key = await crypto.subtle.importKey(
    "pkcs8",
    pemToPkcs8(pem),
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    key,
    new TextEncoder().encode(signingInput)
  );
  const assertion = `${signingInput}.${b64url(sig)}`;

  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
  });

  const body = (await res.json().catch(() => ({}))) as {
    access_token?: string;
    expires_in?: number;
    error?: string;
    error_description?: string;
  };

  if (!res.ok || !body.access_token) {
    throw new Error(
      `Google token exchange failed (${res.status}): ${body.error ?? ""} ${body.error_description ?? ""}`.trim()
    );
  }

  cached = {
    token: body.access_token,
    expiresAt: now + (body.expires_in ?? 3600),
  };
  return cached.token;
}

/** Test seam — the token cache is module state and outlives a single check. */
export function resetTokenCache(): void {
  cached = null;
}
