import { NextRequest, NextResponse } from "next/server";
import { ADMIN_COOKIE, cookieOptions } from "@/lib/admin/auth";
import { wrongOrigin } from "@/lib/guard";
import { isSecureRequest } from "@/lib/admin/session";

export async function POST(req: NextRequest) {
  if (wrongOrigin(req)) {
    return NextResponse.json({ error: "Cross-site request refused" }, { status: 403 });
  }
  const res = NextResponse.json({ ok: true });
  // Same attributes as when it was set, or the browser keeps the old cookie.
  res.cookies.set(ADMIN_COOKIE, "", {
    ...cookieOptions(isSecureRequest(req)),
    maxAge: 0,
  });
  return res;
}
