/**
 * Reading the admin session from a request.
 *
 * Kept apart from auth.ts so the pure crypto stays testable without pulling in
 * next/headers, which only resolves inside a request.
 */

import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";
import { ADMIN_COOKIE, AuthError, verifySession, type AdminSession } from "./auth";
import { wrongOrigin } from "@/lib/guard";

/**
 * Is this request actually over HTTPS?
 *
 * Vercel terminates TLS at the edge and forwards x-forwarded-proto, so the
 * request URL alone is not enough there. Used to decide the cookie's Secure
 * flag — see cookieOptions().
 */
export function isSecureRequest(req: NextRequest): boolean {
  const proto = req.headers.get("x-forwarded-proto");
  if (proto) return proto.split(",")[0].trim() === "https";
  return req.nextUrl.protocol === "https:";
}

/** For server components. Returns null instead of throwing, so pages can redirect. */
export async function currentSession(): Promise<AdminSession | null> {
  try {
    const jar = await cookies();
    return verifySession(jar.get(ADMIN_COOKIE)?.value);
  } catch {
    return null;
  }
}

/**
 * For route handlers. Returns a ready-made response when the request should be
 * refused, so every admin route rejects the same way instead of each inventing
 * its own shape.
 *
 * The origin check is the CSRF floor: the session cookie is sameSite=lax, so a
 * cross-site POST does not carry it, but a check that costs one line is worth
 * having in front of a route that writes to the repository.
 */
export function requireAdmin(
  req: NextRequest
): { ok: true; session: AdminSession } | { ok: false; response: NextResponse } {
  if (wrongOrigin(req)) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Cross-site request refused" }, { status: 403 }),
    };
  }

  const token = req.cookies.get(ADMIN_COOKIE)?.value;
  try {
    return { ok: true, session: verifySession(token) };
  } catch (err) {
    const message = err instanceof AuthError ? err.message : "Not signed in";
    return { ok: false, response: NextResponse.json({ error: message }, { status: 401 }) };
  }
}
