"use client";

/**
 * Navigation and sign-out around every signed-in admin page.
 *
 * The panel is a tool, not a showcase: plain type, obvious controls, no
 * animation. It borrows the site's fonts and lime so it does not feel like a
 * different product, and nothing else.
 */

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";

const TABS = [
  { href: "/admin", label: "OVERVIEW" },
  { href: "/admin/requests", label: "REQUESTS" },
  { href: "/admin/calendar", label: "CALENDAR" },
  { href: "/admin/clients", label: "CLIENTS" },
  { href: "/admin/equipment", label: "EQUIPMENT" },
  { href: "/admin/pricing", label: "PRICING" },
  { href: "/admin/contact", label: "CONTACT" },
];

export default function AdminChrome({
  user,
  children,
}: {
  user: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [leaving, setLeaving] = useState(false);

  async function signOut() {
    setLeaving(true);
    await fetch("/api/admin/logout", { method: "POST" });
    // refresh() so the server layout re-runs and sees the cleared cookie;
    // push() alone would render the cached protected page.
    router.replace("/admin/login");
    router.refresh();
  }

  return (
    <>
      <header
        style={{
          borderBottom: "1px solid rgba(0,0,0,0.12)",
          background: "#fff",
          position: "sticky",
          top: 0,
          zIndex: 10,
        }}
      >
        <div
          style={{
            maxWidth: 1100,
            margin: "0 auto",
            padding: "0 20px",
            display: "flex",
            alignItems: "center",
            gap: 24,
            minHeight: 60,
            flexWrap: "wrap",
          }}
        >
          <span
            style={{
              fontFamily: "var(--font-display)",
              fontSize: 18,
              letterSpacing: "-0.01em",
            }}
          >
            KIDDO ADMIN
          </span>

          <nav style={{ display: "flex", gap: 4, flex: 1, flexWrap: "wrap" }}>
            {TABS.map((t) => {
              const active =
                t.href === "/admin" ? pathname === "/admin" : pathname.startsWith(t.href);
              return (
                <Link
                  key={t.href}
                  href={t.href}
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: 11,
                    letterSpacing: "0.15em",
                    padding: "8px 12px",
                    textDecoration: "none",
                    color: "#1A1A1A",
                    background: active ? "#C8E820" : "transparent",
                    border: active ? "1px solid #1A1A1A" : "1px solid transparent",
                  }}
                >
                  {t.label}
                </Link>
              );
            })}
          </nav>

          <span
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 10,
              color: "rgba(0,0,0,0.5)",
            }}
          >
            {user}
          </span>
          <button
            type="button"
            onClick={signOut}
            disabled={leaving}
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 10,
              letterSpacing: "0.15em",
              padding: "8px 12px",
              border: "1px solid rgba(0,0,0,0.3)",
              background: "transparent",
              cursor: leaving ? "default" : "pointer",
            }}
          >
            {leaving ? "…" : "SIGN OUT"}
          </button>
        </div>
      </header>

      <main style={{ maxWidth: 1100, margin: "0 auto", padding: "28px 20px 80px" }}>
        {children}
      </main>
    </>
  );
}
