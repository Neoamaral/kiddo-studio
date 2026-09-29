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
