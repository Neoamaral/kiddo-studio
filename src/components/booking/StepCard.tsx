"use client";

/**
 * One step in the booking wizard.
 *
 * Three states, where there used to be two: a `done` header is clickable and
 * acts as the back control, a `locked` one is inert. Previously every step was
 * reachable from the stepper bar regardless of prerequisites, so you could open
 * "your details" before choosing anything.
 */

import { kiddoColors } from "@/components/kiddo-assets";

export type StepCardState = "done" | "active" | "locked";

export default function StepCard({
  number,
  label,
  state,
  summary,
  onOpen,
  children,
}: {
  number: string;
  label: string;
  state: StepCardState;
  /** Short recap shown on a collapsed done step, e.g. "CYCLORAMA". */
  summary?: string;
  onOpen?: () => void;
  children: React.ReactNode;
}) {
  const isActive = state === "active";
  const clickable = state === "done" && !!onOpen;

  const header = (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        marginBottom: isActive ? 24 : 0,
        width: "100%",
      }}
    >
      <span
        style={{
          width: 26,
          height: 26,
          border: `1.5px solid ${isActive || state === "done" ? kiddoColors.black : "rgba(0,0,0,0.3)"}`,
          borderRadius: "50%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "var(--font-mono)",
          fontSize: 9,
          letterSpacing: "0.1em",
          color: isActive || state === "done" ? kiddoColors.black : "rgba(0,0,0,0.4)",
          background: state === "done" ? kiddoColors.lime : "transparent",
          flexShrink: 0,
        }}
      >
        {state === "done" ? "✓" : number}
      </span>
      <span
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 11,
          letterSpacing: "0.2em",
          textTransform: "uppercase",
          color: isActive || state === "done" ? kiddoColors.black : "rgba(0,0,0,0.4)",
        }}
      >
        {label}
      </span>
      {state === "done" && summary && (
        <span
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 9,
            letterSpacing: "0.15em",
            textTransform: "uppercase",
            color: "rgba(0,0,0,0.4)",
            marginLeft: "auto",
            textAlign: "right",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {summary}
        </span>
      )}
    </div>
  );

  return (
    <div
      style={{
        border: isActive
          ? `1.5px solid ${kiddoColors.black}`
          : "1.5px solid rgba(0,0,0,0.12)",
        background: isActive ? "#fff" : "rgba(255,255,255,0.4)",
        padding: "28px 28px",
        transition: "all 0.2s",
      }}
    >
      {clickable ? (
        <button
          type="button"
          onClick={onOpen}
          style={{
            display: "block",
            width: "100%",
            padding: 0,
            border: "none",
            background: "transparent",
            cursor: "pointer",
            font: "inherit",
            color: "inherit",
            textAlign: "left",
          }}
        >
          {header}
        </button>
      ) : (
        header
      )}
      {isActive && children}
    </div>
  );
}

/** Back / continue footer. The add-ons step used to own the only one of these. */
export function StepNav({
  onBack,
  onContinue,
  continueLabel = "CONTINUE →",
  continueDisabled = false,
}: {
  onBack?: () => void;
  onContinue?: () => void;
  continueLabel?: string;
  continueDisabled?: boolean;
}) {
  if (!onBack && !onContinue) return null;
  return (
    <div
      style={{
        marginTop: 20,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
      }}
    >
      {onBack ? (
        <button
          type="button"
          onClick={onBack}
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 10,
            letterSpacing: "0.2em",
            textTransform: "uppercase",
            background: "transparent",
            border: "1px solid rgba(0,0,0,0.25)",
            padding: "10px 18px",
            cursor: "pointer",
            color: "rgba(0,0,0,0.5)",
            transition: "all 0.12s",
          }}
        >
          ← BACK
        </button>
      ) : (
        <span />
      )}
      {onContinue && (
        <button
          type="button"
          onClick={onContinue}
          disabled={continueDisabled}
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 10,
            letterSpacing: "0.2em",
            textTransform: "uppercase",
            background: "transparent",
            border: `1px solid ${continueDisabled ? "rgba(0,0,0,0.12)" : "rgba(0,0,0,0.25)"}`,
            padding: "10px 18px",
            cursor: continueDisabled ? "not-allowed" : "pointer",
            color: continueDisabled ? "rgba(0,0,0,0.25)" : "rgba(0,0,0,0.5)",
            transition: "all 0.12s",
          }}
        >
          {continueLabel}
        </button>
      )}
    </div>
  );
}
