/**
 * Admin authentication — one user, one password, a signed session cookie.
 *
 * NO CREDENTIAL LIVES IN THIS REPOSITORY. The username and a scrypt hash of
 * the password come from the environment, the same way BOOKING_CONFIRM_SECRET
 * already does. `npm run admin:hash` produces the hash, so the plaintext never
 * has to be written down anywhere it can be read back.
 *
 * The session is an HMAC-signed cookie rather than server state, because there
 * is no server state to keep it in: this deploys to serverless functions that
 * share nothing between invocations. Same construction as
 * src/lib/booking-token.ts, which solved this for the confirm links.
 *
 * Node runtime only — scrypt and timingSafeEqual do not exist on Edge. That is
 * why the panel is guarded by a server component and route handlers rather
 * than by middleware.
 */

import crypto from "node:crypto";

/** How long a login lasts. Short enough that a forgotten tab is not a key. */
const SESSION_HOURS = 8;

export const ADMIN_COOKIE = "kiddo_admin";

export class AuthError extends Error {}

/* ── Password ────────────────────────────────────────────────────────────── */

const SCRYPT_KEYLEN = 64;

/** "salt:hash", both hex. The format stored in ADMIN_PASSWORD_HASH. */
export function hashPassword(password: string, salt?: string): string {
  const s = salt ?? crypto.randomBytes(16).toString("hex");
  const derived = crypto.scryptSync(password, s, SCRYPT_KEYLEN).toString("hex");
  return `${s}:${derived}`;
}

/**
 * Constant-time password check.
 *
 * Returns false rather than throwing on a malformed stored hash: a
 * misconfigured env var must read as "wrong password", not as a stack trace
 * that tells an attacker the difference.
 */
export function verifyPassword(password: string, stored: string): boolean {
  const [salt, expected] = (stored ?? "").split(":");
  if (!salt || !expected) return false;
  let derived: Buffer;
  try {
    derived = crypto.scryptSync(password, salt, SCRYPT_KEYLEN);
  } catch {
    return false;
  }
  const a = Buffer.from(expected, "hex");
  if (a.length !== derived.length) return false;
  return crypto.timingSafeEqual(a, derived);
}

/* ── Session token ───────────────────────────────────────────────────────── */

export interface AdminSession {
  /** Username. */
  u: string;
  /** Expiry, epoch seconds. */
  e: number;
}

function sessionSecret(): string {
  const s = process.env.ADMIN_SESSION_SECRET;
  if (!s || s.length < 32) {
    throw new AuthError(
      "ADMIN_SESSION_SECRET is missing or too short (needs >= 32 chars)"
    );
  }
  return s;
}

const b64url = (b: Buffer) =>
  b.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

const fromB64url = (s: string) =>
  Buffer.from(s.replace(/-/g, "+").replace(/_/g, "/"), "base64");

function sign(body: string): string {
  return b64url(crypto.createHmac("sha256", sessionSecret()).update(body).digest());
}

export function createSession(user: string): string {
  const payload: AdminSession = {
    u: user,
    e: Math.floor(Date.now() / 1000) + SESSION_HOURS * 3600,
  };
  const body = b64url(Buffer.from(JSON.stringify(payload), "utf8"));
  return `${body}.${sign(body)}`;
}

/** Throws AuthError on anything short of a valid, unexpired, untampered token. */
export function verifySession(token: string | undefined): AdminSession {
  const [body, mac] = (token ?? "").split(".");
  if (!body || !mac) throw new AuthError("Not signed in");

  const expected = sign(body);
  const a = Buffer.from(mac);
  const b = Buffer.from(expected);
  // Length check first: timingSafeEqual throws on a mismatch rather than
  // returning false, and a thrown length error is itself a signal.
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    throw new AuthError("Not signed in");
  }

  let payload: AdminSession;
  try {
    payload = JSON.parse(fromB64url(body).toString("utf8"));
  } catch {
    throw new AuthError("Not signed in");
  }
  if (!payload.u) throw new AuthError("Not signed in");
  if (payload.e < Math.floor(Date.now() / 1000)) {
    throw new AuthError("Your session expired — sign in again");
  }
  return payload;
}

/* ── Credential check ────────────────────────────────────────────────────── */

export interface LoginResult {
  ok: boolean;
  /** Set when the server is misconfigured, as opposed to the password being wrong. */
  misconfigured?: boolean;
}

/**
 * The env vars are read here rather than at module load so a missing one
 * surfaces as a clear failure at sign-in instead of crashing the whole route
 * bundle on import.
 */
export function checkCredentials(user: string, password: string): LoginResult {
  const expectedUser = process.env.ADMIN_USER;
  const storedHash = process.env.ADMIN_PASSWORD_HASH;
  if (!expectedUser || !storedHash) return { ok: false, misconfigured: true };

  // Compare the username in constant time too. It leaks far less than the
  // password, but there is no reason to hand it over for free.
  const a = Buffer.from(user);
  const b = Buffer.from(expectedUser);
  const userOk = a.length === b.length && crypto.timingSafeEqual(a, b);

  // Always run the hash, even when the username is wrong: returning early
  // would make a bad username measurably faster than a bad password.
  const passOk = verifyPassword(password, storedHash);

  return { ok: userOk && passOk };
}

/**
 * Cookie options.
 *
 * `secure` comes from the REQUEST's protocol, not from NODE_ENV. A production
 * build served over plain HTTP — a local `next start`, or any self-hosted
 * deployment without TLS — would set a Secure cookie the browser then refuses
 * to store, and the login would appear to succeed while silently doing
 * nothing. See isSecureRequest() in ./session.ts.
 */
export function cookieOptions(secure: boolean) {
  return {
    httpOnly: true,
    secure,
    sameSite: "lax" as const,
    path: "/",
    maxAge: SESSION_HOURS * 3600,
  };
}
