"use client";

/**
 * "Cookie settings" — reopens the banner after a decision has been made.
 *
 * A separate one-purpose component because the two places that need it are a
 * SERVER component (the privacy page) and a client one (the footer), and a
 * server component cannot hand an onClick to anything.
 */

import { kiddoColors } from "@/components/kiddo-assets/kiddoColors";
import { openConsentPreferences } from "./ConsentBanner";

export default function PreferencesLink({
  label = "COOKIE SETTINGS",
  className,
  style,
}: {
  label?: string;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <button
      type="button"
      onClick={openConsentPreferences}
      className={className}
      style={{
        fontFamily: "var(--font-mono)",
        fontSize: 9,
        letterSpacing: "0.25em",
        textTransform: "uppercase",
        background: "transparent",
        border: "none",
        padding: 0,
        cursor: "pointer",
        color: kiddoColors.black,
        textDecoration: "underline",
        textUnderlineOffset: 4,
        ...style,
      }}
    >
      {label}
    </button>
  );
}
