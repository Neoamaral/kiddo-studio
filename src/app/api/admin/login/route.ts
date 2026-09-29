import { NextRequest, NextResponse } from "next/server";
import {
  ADMIN_COOKIE,
  checkCredentials,
  cookieOptions,
  createSession,
} from "@/lib/admin/auth";
import { rateLimited, wrongOrigin, type RateLimit } from "@/lib/guard";
import { isSecureRequest } from "@/lib/admin/session";

/**
 * Eight attempts per quarter hour, per IP.
 *
 * Tighter than the booking limits because the cost of a wrong guess here is
 * the whole panel. In-memory and per instance, like the rest of guard.ts, so
 * it thins out brute force rather than stopping it — the real defence is that
 * the password is scrypt-hashed and never left the environment.
 */
const LOGIN_LIMIT: RateLimit = { limit: 8, windowMs: 15 * 60 * 1000 };

export async function POST(req: NextRequest) {
  if (wrongOrigin(req)) {
    return NextResponse.json({ error: "Cross-site request refused" }, { status: 403 });
  }
  if (rateLimited(req, "admin-login", LOGIN_LIMIT)) {
    return NextResponse.json(
      { error: "Too many attempts. Wait a few minutes." },
      { status: 429 }
    );
  }

  let body: { user?: unknown; password?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Malformed request" }, { status: 400 });
  }

  const user = typeof body.user === "string" ? body.user.slice(0, 100) : "";
  const password = typeof body.password === "string" ? body.password.slice(0, 200) : "";

  const result = checkCredentials(user, password);

  if (result.misconfigured) {
    // Said plainly in the log, vaguely in the response: the visitor does not
    // need to learn which environment variable is missing.
    console.error("[ADMIN] ADMIN_USER or ADMIN_PASSWORD_HASH is not set");
    return NextResponse.json({ error: "Sign-in is unavailable" }, { status: 503 });
  }
  if (!result.ok) {
    // One message for both a wrong username and a wrong password.
    return NextResponse.json({ error: "Wrong username or password" }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(
    ADMIN_COOKIE,
    createSession(user),
    cookieOptions(isSecureRequest(req))
  );
  return res;
}
