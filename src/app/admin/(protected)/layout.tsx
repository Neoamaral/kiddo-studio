import { redirect } from "next/navigation";
import { currentSession } from "@/lib/admin/session";
import AdminChrome from "@/components/admin/AdminChrome";

/**
 * The gate.
 *
 * A server component rather than middleware: middleware runs on the Edge
 * runtime, where node:crypto and timingSafeEqual do not exist — the same
 * constraint that made gcal/auth.ts hand-roll RS256 with crypto.subtle.
 * Verifying here keeps one implementation of the session for pages and routes.
 */
export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await currentSession();
  if (!session) redirect("/admin/login");
  return <AdminChrome user={session.u}>{children}</AdminChrome>;
}
