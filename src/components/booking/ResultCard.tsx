"use client";

/**
 * What the sidebar becomes after a submit attempt.
 *
 * The previous version rendered "YOU'RE BOOKED!" on EVERY outcome — a 400, a
 * 500 and a dropped connection all called setBookingRef(). That is how a studio
 * ends up with confirmed bookings that never arrived. Each outcome now has its
 * own card, and the success card no longer over-promises when the calendar
 * write did not land.
 */

import { SmileyFaceIcon, kiddoColors } from "@/components/kiddo-assets";

const shell: React.CSSProperties = {
  padding: "36px 28px",
  textAlign: "center",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: 16,
};

const heading: React.CSSProperties = {
  fontFamily: "var(--font-display)",
  fontSize: 32,
  letterSpacing: "-0.02em",
  textTransform: "uppercase",
  color: kiddoColors.black,
  lineHeight: 1,
};

const mono: React.CSSProperties = {
  fontFamily: "var(--font-mono)",
  fontSize: 9,
  letterSpacing: "0.25em",
  textTransform: "uppercase",
  color: "rgba(0,0,0,0.5)",
};

const body: React.CSSProperties = {
  fontFamily: "var(--font-body)",
  fontSize: 13,
  color: "rgba(0,0,0,0.7)",
  maxWidth: 280,
  lineHeight: 1.5,
};

function ActionButton({
  label,
  onClick,
  href,
}: {
  label: string;
  onClick?: () => void;
  href?: string;
}) {
  const style: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    fontFamily: "var(--font-mono)",
    fontSize: 11,
    letterSpacing: "0.15em",
    textTransform: "uppercase",
    background: kiddoColors.black,
    color: "#fff",
    padding: "12px 22px",
    border: `1px solid ${kiddoColors.black}`,
    marginTop: 4,
    textDecoration: "none",
    cursor: "pointer",
  };
  if (href) {
    return (
      <a href={href} style={style}>
        {label}
      </a>
    );
  }
  return (
    <button type="button" onClick={onClick} style={style}>
      {label}
    </button>
  );
}

export function SuccessCard({
  bookingRef,
  calendarBlocked,
}: {
  bookingRef: string;
  /** False when the calendar write failed or is not configured. */
  calendarBlocked: boolean;
}) {
  return (
    <div style={{ ...shell, background: kiddoColors.lime, border: `2px solid ${kiddoColors.black}` }}>
      <SmileyFaceIcon variant="drip" width={80} fill={kiddoColors.black} />
      <div style={heading}>
        {calendarBlocked ? "YOU'RE BOOKED!" : "REQUEST RECEIVED"}
      </div>
      <div style={mono}>Ref: {bookingRef}</div>
      <p style={body}>
        {calendarBlocked
          ? "Your slot is held. We'll send a confirmation email shortly — see you in the studio!"
          : "We've got your request and we'll confirm your slot by email within 24 hours."}
      </p>
      <ActionButton label="← BACK HOME" href="/" />
    </div>
  );
}

export function ErrorCard({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div style={{ ...shell, background: "#F8F5EE", border: `2px solid ${kiddoColors.black}` }}>
      <div
        style={{
          width: 64,
          height: 64,
          borderRadius: "50%",
          border: `2px solid ${kiddoColors.black}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "var(--font-display)",
          fontSize: 34,
          color: kiddoColors.black,
        }}
      >
        !
      </div>
      <div style={heading}>THAT DIDN&apos;T SEND</div>
      <p style={body}>{message}</p>
      <p style={{ ...mono, letterSpacing: "0.15em" }}>NOTHING WAS BOOKED</p>
      <ActionButton label="TRY AGAIN" onClick={onRetry} />
    </div>
  );
}

export function ConflictCard({
  message,
  actionLabel,
  onAction,
}: {
  message: string;
  actionLabel: string;
  onAction: () => void;
}) {
  return (
    <div style={{ ...shell, background: "#F8F5EE", border: `2px solid ${kiddoColors.black}` }}>
      <div style={heading}>JUST MISSED IT</div>
      <p style={body}>{message}</p>
      <ActionButton label={actionLabel} onClick={onAction} />
    </div>
  );
}
