"use client";

/**
 * Navigation and sign-out around every signed-in admin page.
 *
 * The panel is a tool, not a showcase: plain type, obvious controls, no
 * animation. It borrows the site's fonts and lime so it does not feel like a
 * different product, and nothing else.
 *
 * NINE TABS DO NOT FIT ON ONE LINE, so they are not all tabs any more. The row
 * holds the screens the studio opens to do today's work; the four that are
 * really settings — what the site sells, what it costs, how to reach the
 * studio, and which measurement accounts are wired up — live behind one menu.
 * They are opened when something changes, not when something happens.
 *
 * CLICK, NOT HOVER. A hover menu cannot be opened on a phone and cannot be
 * reached from the keyboard, and this panel is used on both.
 */

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { KiddoLogo } from "@/components/ui/KiddoLogo";

/** Today's work. */
const TABS = [
  { href: "/admin", label: "OVERVIEW" },
  { href: "/admin/requests", label: "REQUESTS" },
  { href: "/admin/calendar", label: "CALENDAR" },
  { href: "/admin/clients", label: "CLIENTS" },
  { href: "/admin/analytics", label: "ANALYTICS" },
];

/**
 * Behind the menu. The hint is the point of grouping them: a one-line
 * description is room a tab strip never had, and it is what stops someone
 * opening three screens to find where the VAT rate lives.
 */
const SETUP = [
  { href: "/admin/equipment", label: "EQUIPMENT", hint: "The gear catalogue and its photos" },
  { href: "/admin/pricing", label: "PRICING", hint: "Rates, packages, extras, VAT" },
  { href: "/admin/contact", label: "CONTACT", hint: "Address, hours, where enquiries land" },
  { href: "/admin/integrations", label: "CONNECTIONS", hint: "Meta pixel, Conversions API, Google tag" },
];

const tabStyle = (active: boolean): React.CSSProperties => ({
  fontFamily: "var(--font-mono)",
  fontSize: 11,
  letterSpacing: "0.15em",
  padding: "8px 12px",
  textDecoration: "none",
  color: "#1A1A1A",
  background: active ? "#C8E820" : "transparent",
  border: active ? "1px solid #1A1A1A" : "1px solid transparent",
});

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
  const [menuOpen, setMenuOpen] = useState(false);

  const wrapRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const itemRefs = useRef<(HTMLAnchorElement | null)[]>([]);

  const inSetup = SETUP.some((t) => pathname.startsWith(t.href));

  /* Navigating away closes it. Next keeps this component mounted across routes,
     so without this the menu would still be hanging open on the new page. */
  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!menuOpen) return;
    const onDown = (e: PointerEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setMenuOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setMenuOpen(false);
      // Focus goes back where it came from, or it lands on the page body and
      // the next Tab starts from the top again.
      buttonRef.current?.focus();
    };
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  /** Arrow keys walk the menu, which is what makes it a menu and not a popover. */
  const moveFocus = (from: number, delta: number) => {
    const next = (from + delta + SETUP.length) % SETUP.length;
    itemRefs.current[next]?.focus();
  };

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
          {/*
            The real wordmark, as on the site. It was typeset here as "KIDDO
            ADMIN" in the display font, which is not the studio's logo — the
            panel is the studio's own tool and should not be the one place
            wearing a different mark.

            A link home, so there is always a way back to the site; ADMIN sits
            beside it as a label rather than as part of the name.
          */}
          <Link
            href="/"
            style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none" }}
            title="Back to the site"
          >
            <KiddoLogo color="black" height={26} />
            <span
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 9,
                letterSpacing: "0.22em",
                color: "rgba(0,0,0,0.45)",
                border: "1px solid rgba(0,0,0,0.2)",
                padding: "2px 6px",
              }}
            >
              ADMIN
            </span>
          </Link>

          <nav style={{ display: "flex", gap: 4, flex: 1, flexWrap: "wrap" }}>
            {TABS.map((t) => {
              const active =
                t.href === "/admin" ? pathname === "/admin" : pathname.startsWith(t.href);
              return (
                <Link key={t.href} href={t.href} style={tabStyle(active)}>
                  {t.label}
                </Link>
              );
            })}

            {/* ── The settings menu ─────────────────────────────────────── */}
            <div ref={wrapRef} style={{ position: "relative" }}>
              <button
                ref={buttonRef}
                type="button"
                aria-haspopup="menu"
                aria-expanded={menuOpen}
                onClick={() => setMenuOpen((v) => !v)}
                onKeyDown={(e) => {
                  if (e.key === "ArrowDown" || e.key === "ArrowUp") {
                    e.preventDefault();
                    setMenuOpen(true);
                    // After the menu has rendered, not before.
                    requestAnimationFrame(() =>
                      itemRefs.current[e.key === "ArrowDown" ? 0 : SETUP.length - 1]?.focus()
                    );
                  }
                }}
                style={{
                  ...tabStyle(inSetup),
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 7,
                  cursor: "pointer",
                  /*
                   * Every font property spelled out, and NO `font: inherit`.
                   * A button does not inherit the page font, so the shorthand
                   * looked like the fix — but it resets font-size, and it won
                   * over the fontSize set after it: measured at 16px beside
                   * tabs at 11px.
                   */
                  fontFamily: "var(--font-mono)",
                  fontSize: 11,
                  letterSpacing: "0.15em",
                  // The open menu reads as part of the button.
                  borderColor: menuOpen && !inSetup ? "rgba(0,0,0,0.3)" : undefined,
                }}
              >
                SETUP
                <span
                  aria-hidden="true"
                  style={{
                    display: "inline-block",
                    fontSize: 8,
                    lineHeight: 1,
                    transform: menuOpen ? "rotate(180deg)" : "none",
                  }}
                >
                  ▼
                </span>
              </button>

              {menuOpen ? (
                <div
                  role="menu"
                  aria-label="Setup"
                  style={{
                    position: "absolute",
                    top: "calc(100% + 4px)",
                    left: 0,
                    minWidth: 260,
                    background: "#fff",
                    border: "1px solid #1A1A1A",
                    // Above the sticky header's own stacking context.
                    zIndex: 20,
                    boxShadow: "3px 3px 0 rgba(0,0,0,0.12)",
                  }}
                >
                  {SETUP.map((t, i) => {
                    const active = pathname.startsWith(t.href);
                    return (
                      <Link
                        key={t.href}
                        href={t.href}
                        role="menuitem"
                        ref={(el) => {
                          itemRefs.current[i] = el;
                        }}
                        onClick={() => setMenuOpen(false)}
                        onKeyDown={(e) => {
                          if (e.key === "ArrowDown") {
                            e.preventDefault();
                            moveFocus(i, 1);
                          } else if (e.key === "ArrowUp") {
                            e.preventDefault();
                            moveFocus(i, -1);
                          }
                        }}
                        style={{
                          display: "block",
                          padding: "10px 14px",
                          textDecoration: "none",
                          color: "#1A1A1A",
                          background: active ? "#C8E820" : "transparent",
                          borderBottom:
                            i === SETUP.length - 1
                              ? "none"
                              : "1px solid rgba(0,0,0,0.1)",
                        }}
                      >
                        <span
                          style={{
                            fontFamily: "var(--font-mono)",
                            fontSize: 11,
                            letterSpacing: "0.15em",
                          }}
                        >
                          {t.label}
                        </span>
                        <span
                          style={{
                            display: "block",
                            fontFamily: "var(--font-body)",
                            fontSize: 11,
                            color: "rgba(0,0,0,0.55)",
                            marginTop: 3,
                          }}
                        >
                          {t.hint}
                        </span>
                      </Link>
                    );
                  })}
                </div>
              ) : null}
            </div>
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
