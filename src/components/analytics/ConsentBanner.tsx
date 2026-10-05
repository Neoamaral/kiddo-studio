"use client";

/**
 * The consent banner and the preferences panel.
 *
 * Renders nothing during SSR (the `mounted` guard that src/components/ui/Modal.tsx
 * already established), so the built HTML of every page is unchanged and there
 * is no hydration mismatch under the `suppressHydrationWarning` on <body>.
 *
 * No dark patterns, and that is a requirement rather than taste: DECLINE ALL
 * has the same size, the same weight and the same prominence as ACCEPT ALL. A
 * banner where refusing is harder than accepting is itself the finding.
 */

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { kiddoColors } from "@/components/kiddo-assets/kiddoColors";
import {
  consentServerSnapshot,
  consentSnapshot,
  setConsent,
  subscribeConsent,
  withdrawConsent,
  type ConsentState,
} from "@/lib/analytics/consent";

/* ── Opening the panel from anywhere (the footer, the privacy page) ─────── */

const openers = new Set<() => void>();

/** Called by the COOKIES link in the footer and by the privacy page. */
export function openConsentPreferences(): void {
  for (const fn of openers) fn();
}

const mono: React.CSSProperties = {
  fontFamily: "var(--font-mono)",
  fontSize: 10,
  letterSpacing: "0.18em",
  textTransform: "uppercase",
};

function Toggle({
  on,
  onChange,
  label,
  detail,
  locked = false,
}: {
  on: boolean;
  onChange: (next: boolean) => void;
  label: string;
  detail: string;
  locked?: boolean;
}) {
  return (
    <label
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: 12,
        padding: "10px 0",
        cursor: locked ? "default" : "pointer",
        opacity: locked ? 0.6 : 1,
      }}
    >
      <span
        aria-hidden="true"
        style={{
          width: 34,
          height: 18,
          flexShrink: 0,
          marginTop: 2,
          borderRadius: 9,
          border: `1.5px solid ${kiddoColors.black}`,
          background: on ? kiddoColors.lime : "transparent",
          position: "relative",
          transition: "background 0.12s",
        }}
      >
        <span
          style={{
            position: "absolute",
            top: 2,
            left: on ? 17 : 2,
            width: 11,
            height: 11,
            borderRadius: "50%",
            background: kiddoColors.black,
            transition: "left 0.12s",
          }}
        />
      </span>
      <input
        type="checkbox"
        checked={on}
        disabled={locked}
        onChange={(e) => onChange(e.target.checked)}
        style={{ position: "absolute", opacity: 0, width: 0, height: 0 }}
      />
      <span style={{ minWidth: 0 }}>
        <span style={{ ...mono, display: "block", color: kiddoColors.black }}>
          {label}
          {locked && " · ALWAYS ON"}
        </span>
        <span
          style={{
            display: "block",
            fontFamily: "var(--font-body)",
            fontSize: 12,
            lineHeight: 1.5,
            color: "rgba(0,0,0,0.6)",
            marginTop: 3,
          }}
        >
          {detail}
        </span>
      </span>
    </label>
  );
}

function Action({
  children,
  onClick,
  filled = false,
}: {
  children: React.ReactNode;
  onClick: () => void;
  filled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        ...mono,
        fontWeight: 700,
        // Identical box for accept and decline. Only the fill differs, and the
        // fill is the brand colour rather than a "preferred" signal.
        padding: "12px 20px",
        minWidth: 132,
        cursor: "pointer",
        border: `1.5px solid ${kiddoColors.black}`,
        background: filled ? kiddoColors.lime : "transparent",
        color: kiddoColors.black,
      }}
    >
      {children}
    </button>
  );
}

export default function ConsentBanner() {
  const [mounted, setMounted] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [forced, setForced] = useState(false);
  const [draft, setDraft] = useState({ analytics: false, marketing: false });

  useEffect(() => setMounted(true), []);

  const consent = useSyncExternalStore(
    subscribeConsent,
    consentSnapshot,
    consentServerSnapshot
  ) as ConsentState | null | undefined;

  /* The footer link and the privacy page reopen it after a decision. */
  useEffect(() => {
    const open = () => {
      setDraft({
        analytics: consent?.analytics ?? false,
        marketing: consent?.marketing ?? false,
      });
      setExpanded(true);
      setForced(true);
    };
    openers.add(open);
    return () => {
      openers.delete(open);
    };
  }, [consent]);

  const decide = useCallback((analytics: boolean, marketing: boolean) => {
    setConsent(analytics, marketing);
    setForced(false);
    setExpanded(false);
  }, []);

  if (!mounted) return null;
  // `undefined` is "not hydrated yet" and must not flash a banner.
  if (consent === undefined) return null;
  // A decision exists and nobody asked to revisit it.
  if (consent !== null && !forced) return null;

  const revisiting = consent !== null;

  return (
    <div
      role="dialog"
      aria-modal="false"
      aria-label="Cookies and tracking"
      style={{
        position: "fixed",
        left: 0,
        right: 0,
        bottom: 0,
        // Above the sticky header (50) and the booking toolbar (40), below the
        // modal shell (100) — a modal opened over this still wins.
        zIndex: 90,
        background: kiddoColors.offWhite,
        borderTop: `2px solid ${kiddoColors.black}`,
        boxShadow: "0 -8px 32px rgba(0,0,0,0.18)",
        paddingBottom: "env(safe-area-inset-bottom, 0px)",
      }}
    >
      <div
        style={{
          maxWidth: 1100,
          margin: "0 auto",
          padding: "18px clamp(16px, 4vw, 32px)",
          maxHeight: "72vh",
          overflowY: "auto",
          overscrollBehavior: "contain",
        }}
      >
        <p style={{ ...mono, color: "rgba(0,0,0,0.45)", marginBottom: 8 }}>
          {revisiting ? "YOUR CHOICES" : "BEFORE YOU LOOK AROUND"}
        </p>
        <p
          style={{
            fontFamily: "var(--font-body)",
            fontSize: 14,
            lineHeight: 1.6,
            color: kiddoColors.black,
            maxWidth: 640,
            margin: "0 0 14px",
          }}
        >
          We&apos;d like to measure how this site gets used, and to tell Meta when a
          booking comes from one of our ads. Neither happens unless you say yes.
          You can change your mind any time from the footer.{" "}
          <Link
            href="/privacy"
            style={{
              color: kiddoColors.black,
              // Underlined on purpose: without it this reads as plain prose and
              // the one link out of the banner — to the policy the law says must
              // be reachable — is invisible.
              textDecoration: "underline",
              textUnderlineOffset: 3,
              fontWeight: 600,
            }}
          >
            What we collect
          </Link>
          .
        </p>

        {expanded && (
          <div
            style={{
              borderTop: "1px solid rgba(0,0,0,0.12)",
              borderBottom: "1px solid rgba(0,0,0,0.12)",
              padding: "6px 0",
              margin: "0 0 14px",
              maxWidth: 640,
            }}
          >
            <Toggle
              locked
              on
              onChange={() => {}}
              label="Necessary"
              detail="Keeps you signed in where that applies, and remembers this very choice. Nothing else."
            />
            <Toggle
              on={draft.analytics}
              onChange={(analytics) =>
                setDraft((d) => ({ analytics, marketing: analytics && d.marketing }))
              }
              label="Analytics"
              detail="Which pages are read, which buttons are pressed, and where people give up on the booking form. No name, no email, no IP address, and nothing that follows you to another site."
            />
            <Toggle
              on={draft.marketing}
              onChange={(marketing) =>
                setDraft((d) => ({ analytics: d.analytics || marketing, marketing }))
              }
              label="Marketing"
              detail="Lets Meta know a booking came from one of our ads, so we stop paying for ads that bring nobody. This one does share data with Meta."
            />
          </div>
        )}

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <Action filled onClick={() => decide(true, true)}>
            Accept all
          </Action>
          <Action
            onClick={() => {
              // Revisiting and turning everything off is a WITHDRAWAL, which
              // also clears the third-party cookies. A first-time decline has
              // nothing to clear, but running the same path costs nothing and
              // keeps one code path instead of two.
              withdrawConsent();
              setConsent(false, false);
              setForced(false);
              setExpanded(false);
            }}
          >
            Decline all
          </Action>
          {expanded ? (
            <Action onClick={() => decide(draft.analytics, draft.marketing)}>
              Save choices
            </Action>
          ) : (
            <button
              type="button"
              onClick={() => {
                setDraft({
                  analytics: consent?.analytics ?? false,
                  marketing: consent?.marketing ?? false,
                });
                setExpanded(true);
              }}
              style={{
                ...mono,
                background: "transparent",
                border: "none",
                padding: "12px 4px",
                cursor: "pointer",
                color: "rgba(0,0,0,0.6)",
                textDecoration: "underline",
                textUnderlineOffset: 4,
              }}
            >
              Choose
            </button>
          )}
          {revisiting && (
            <button
              type="button"
              onClick={() => {
                setForced(false);
                setExpanded(false);
              }}
              style={{
                ...mono,
                marginLeft: "auto",
                background: "transparent",
                border: "none",
                padding: "12px 4px",
                cursor: "pointer",
                color: "rgba(0,0,0,0.45)",
              }}
            >
              Close
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
