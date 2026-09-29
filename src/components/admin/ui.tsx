"use client";

/** Shared bits of the admin panel's plain, functional styling. */

export const mono: React.CSSProperties = {
  fontFamily: "var(--font-mono)",
  fontSize: 10,
  letterSpacing: "0.18em",
  textTransform: "uppercase",
};

export const field: React.CSSProperties = {
  width: "100%",
  padding: "9px 11px",
  border: "1px solid rgba(0,0,0,0.25)",
  background: "#fff",
  fontFamily: "var(--font-body)",
  fontSize: 14,
};

/**
 * The white card. Was copy-pasted into ContactAdmin and PricingAdmin; the
 * kanban wanted a third copy, which is where a shared one earns its keep.
 */
export const box: React.CSSProperties = {
  border: "1px solid rgba(0,0,0,0.15)",
  background: "#fff",
  padding: 18,
  marginBottom: 14,
};

export const grid = (min: number): React.CSSProperties => ({
  display: "grid",
  gridTemplateColumns: `repeat(auto-fit,minmax(${min}px,1fr))`,
  gap: 12,
});

/** Cents from the database to the site's convention: suffixed, no space. */
export function money(cents: number | null | undefined): string {
  if (cents === null || cents === undefined) return "—";
  return `${Math.round(cents / 100)}€`;
}

/** "14 Mar 2027" — short, unambiguous, and not locale-dependent. */
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function shortDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const [y, m, d] = iso.slice(0, 10).split("-");
  const month = MONTHS[Number(m) - 1];
  return month ? `${Number(d)} ${month} ${y}` : iso;
}

/** How long ago, for a board card. */
export function ago(iso: string | null | undefined): string {
  if (!iso) return "";
  const then = new Date(iso.replace(" ", "T")).getTime();
  if (!Number.isFinite(then)) return "";
  const mins = Math.max(0, Math.round((Date.now() - then) / 60000));
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  return days === 1 ? "yesterday" : `${days}d ago`;
}

export function Label({ children }: { children: React.ReactNode }) {
  return (
    <span style={{ ...mono, color: "rgba(0,0,0,0.55)", display: "block", marginBottom: 5 }}>
      {children}
    </span>
  );
}

export function Button({
  children,
  onClick,
  kind = "normal",
  disabled,
  title,
  type = "button",
}: {
  children: React.ReactNode;
  onClick?: () => void;
  kind?: "normal" | "primary" | "danger";
  disabled?: boolean;
  title?: string;
  type?: "button" | "submit";
}) {
  const palette =
    kind === "primary"
      ? { background: "#C8E820", color: "#1A1A1A", border: "2px solid #1A1A1A" }
      : kind === "danger"
        ? { background: "transparent", color: "#B00020", border: "1px solid #B00020" }
        : { background: "transparent", color: "#1A1A1A", border: "1px solid rgba(0,0,0,0.3)" };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      title={title}
      style={{
        ...mono,
        fontSize: 10,
        fontWeight: kind === "primary" ? 700 : 400,
        padding: kind === "primary" ? "12px 18px" : "8px 12px",
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.4 : 1,
        ...palette,
      }}
    >
      {children}
    </button>
  );
}

/** One place for "saved", "rejected" and "the server said no". */
export function Banner({
  tone,
  children,
}: {
  tone: "ok" | "error" | "info";
  children: React.ReactNode;
}) {
  const palette =
    tone === "ok"
      ? { background: "#C8E820", border: "1px solid #1A1A1A", color: "#1A1A1A" }
      : tone === "error"
        ? { background: "#FDECEF", border: "1px solid #B00020", color: "#7A0016" }
        : { background: "#fff", border: "1px solid rgba(0,0,0,0.2)", color: "rgba(0,0,0,0.7)" };

  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      style={{
        ...palette,
        padding: "12px 14px",
        marginBottom: 16,
        fontFamily: "var(--font-body)",
        fontSize: 13,
        lineHeight: 1.6,
      }}
    >
      {children}
    </div>
  );
}
