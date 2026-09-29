import { redirect } from "next/navigation";
import { currentSession } from "@/lib/admin/session";
import AdminChrome from "@/components/admin/AdminChrome";

/**
 * The gate.
 *
 * A server component rather than middleware: middleware runs on the Edge
 * runtime, where node:crypto and timingSafeEqual do not exist — the same
 * constraint that once made the Google integration hand-roll RS256 with
 * crypto.subtle rather than use node:crypto.
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
