import type { Metadata } from "next";

/**
 * Shell for every admin page, signed in or not.
 *
 * Deliberately does NOT check the session: /admin/login lives underneath it,
 * and a layout that redirected would send the login page to itself forever.
 * The check lives in the (protected) route group.
 */
export const metadata: Metadata = {
  title: "Admin — Kiddo Studio",
  robots: { index: false, follow: false, nocache: true },
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ minHeight: "100vh", background: "#F2EFE6", color: "#1A1A1A" }}>
      {children}
    </div>
  );
}
