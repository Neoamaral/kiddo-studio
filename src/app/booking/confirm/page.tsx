/**
 * The page the studio lands on from the email.
 *
 * Deliberately a plain server component with a real <form>: no client JS, so it
 * works in any webmail-launched browser, and — critically — the destructive
 * action is a POST behind a button rather than the link itself. Mail scanners
 * prefetch links; a GET that confirmed would confirm every booking on arrival.
 */

import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { getContact } from "@/lib/data-source";
import { kiddoColors } from "@/components/kiddo-assets";
import { TokenError, verifyBookingToken } from "@/lib/booking-token";
import { isDbConfigured } from "@/lib/db/client";
import { getRequest } from "@/lib/db/requests";
import { slotById, slotTimeLabel } from "@/data/booking";
import { spaceById } from "@/data/spaces";
import { formatDateHuman } from "@/lib/date";
import { eur } from "@/lib/money";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Confirm booking — Kiddo Studio",
  robots: { index: false, follow: false },
};

const mono: React.CSSProperties = {
  fontFamily: "var(--font-mono)",
  fontSize: 10,
  letterSpacing: "0.2em",
  textTransform: "uppercase",
  color: "rgba(0,0,0,0.45)",
};

/* Async, so the eight call sites below do not each have to thread the
   contact record down by hand. */
async function Shell({ children }: { children: React.ReactNode }) {
  const contact = await getContact();
  return (
    <>
      <Header />
      <main
        style={{
          background: "#F2EFE6",
          minHeight: "70vh",
          padding: "clamp(3rem,8vw,6rem) 0",
        }}
      >
        <div className="kiddo-container" style={{ maxWidth: 640 }}>
          <div
            style={{
              background: "#fff",
              border: `1.5px solid ${kiddoColors.black}`,
              padding: "clamp(24px,5vw,40px)",
            }}
          >
            {children}
          </div>
        </div>
      </main>
      <Footer contact={contact} />
    </>
  );
}

function Title({ children }: { children: React.ReactNode }) {
  return (
    <h1
      style={{
        fontFamily: "var(--font-display)",
        fontSize: "clamp(28px,5vw,44px)",
        lineHeight: 1,
        textTransform: "uppercase",
        letterSpacing: "-0.02em",
        color: kiddoColors.black,
        margin: "0 0 18px",
      }}
    >
      {children}
    </h1>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        gap: 16,
        padding: "10px 0",
        borderBottom: "1px solid rgba(0,0,0,0.08)",
      }}
    >
      <span style={mono}>{label}</span>
      <span
        style={{
          fontFamily: "var(--font-body)",
          fontSize: 14,
          color: kiddoColors.black,
          textAlign: "right",
        }}
      >
        {value}
      </span>
    </div>
  );
}

export default async function ConfirmPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const one = (k: string) => {
    const v = params[k];
    return Array.isArray(v) ? v[0] : v;
  };

  const done = one("done");
  const error = one("error");
  const token = one("t");

  if (done) {
    const declined = done === "declined";
    return (
      <Shell>
        <Title>{declined ? "Request declined" : "Booking confirmed"}</Title>
        <p style={{ fontFamily: "var(--font-body)", fontSize: 15, lineHeight: 1.6 }}>
          {declined
            ? "The request has been removed from the calendar. It never held the slot, so nothing was freed up."
            : "The slot is now blocked in the room calendar and the client has been emailed."}
        </p>
        <p style={{ ...mono, marginTop: 20 }}>Ref: {one("ref") ?? "—"}</p>
      </Shell>
    );
  }

  if (error) {
    return (
      <Shell>
        <Title>Can&apos;t do that</Title>
        <p style={{ fontFamily: "var(--font-body)", fontSize: 15, lineHeight: 1.6 }}>{error}</p>
      </Shell>
    );
  }

  if (!token) {
    return (
      <Shell>
        <Title>Nothing to confirm</Title>
        <p style={{ fontFamily: "var(--font-body)", fontSize: 15 }}>
          Open this page from the link in the booking email.
        </p>
      </Shell>
    );
  }

  let payload;
  try {
    payload = verifyBookingToken(token);
  } catch (err) {
    return (
      <Shell>
        <Title>Link not valid</Title>
        <p style={{ fontFamily: "var(--font-body)", fontSize: 15 }}>
          {err instanceof TokenError ? err.message : "This link can't be used."}
        </p>
      </Shell>
    );
  }

  if (!isDbConfigured()) {
    return (
      <Shell>
        <Title>Not connected</Title>
        <p style={{ ...mono }}>The database is not configured, so nothing can be read.</p>
      </Shell>
    );
  }

  const booking = await getRequest(payload.r);
  if (!booking) {
    return (
      <Shell>
        <Title>Not found</Title>
        <p style={{ fontFamily: "var(--font-body)", fontSize: 15, lineHeight: 1.6 }}>
          That request is no longer on the board. It may have been erased.
        </p>
      </Shell>
    );
  }

  const slot = booking.slotId ? slotById(booking.slotId) : undefined;
  const space = booking.spaceId ? spaceById(booking.spaceId) : undefined;
  const confirmed = booking.status === "confirmed" || booking.status === "done";

  return (
    <Shell>
      <p style={{ ...mono, marginBottom: 10 }}>
        {confirmed ? "Already confirmed" : "Booking request"}
      </p>
      <Title>{booking.name || "Booking"}</Title>

      <div style={{ borderTop: "1px solid rgba(0,0,0,0.15)", marginBottom: 20 }}>
        <Row label="Ref" value={booking.ref} />
        <Row label="Date" value={booking.date ? formatDateHuman(booking.date) : "—"} />
        <Row
          label="Slot"
          value={slot ? `${slot.label} · ${slotTimeLabel(slot)}` : (booking.slotId ?? "—")}
        />
        <Row label="Space" value={space?.label ?? booking.spaceId ?? "—"} />
        <Row label="Client" value={booking.email || "—"} />
        <Row label="Total" value={eur((booking.totalCents ?? 0) / 100)} />
      </div>

      {booking.brief && (
        <pre
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 12,
            lineHeight: 1.6,
            whiteSpace: "pre-wrap",
            wordBreak: "break-word",
            background: "#F8F5EE",
            border: "1px solid rgba(0,0,0,0.1)",
            padding: 16,
            margin: "0 0 24px",
            color: "rgba(0,0,0,0.75)",
          }}
        >
          {booking.brief}
        </pre>
      )}

      {confirmed ? (
        <p style={{ fontFamily: "var(--font-body)", fontSize: 15, lineHeight: 1.6 }}>
          This booking is already confirmed and the slot is blocked. Nothing to do.
        </p>
      ) : (
        <>
          <p
            style={{
              fontFamily: "var(--font-body)",
              fontSize: 14,
              lineHeight: 1.6,
              color: "rgba(0,0,0,0.6)",
              marginBottom: 18,
            }}
          >
            The slot is <strong>not</strong> blocked yet. Confirming marks it busy in
            the room calendar and emails the client.
          </p>
          <form
            method="POST"
            action="/api/booking/confirm"
            style={{ display: "flex", gap: 12, flexWrap: "wrap" }}
          >
            <input type="hidden" name="t" value={token} />
            <button
              type="submit"
              name="action"
              value="confirm"
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 11,
                letterSpacing: "0.15em",
                textTransform: "uppercase",
                fontWeight: 700,
                background: kiddoColors.lime,
                color: kiddoColors.black,
                border: `1.5px solid ${kiddoColors.black}`,
                padding: "14px 26px",
                cursor: "pointer",
              }}
            >
              Confirm booking →
            </button>
            <button
              type="submit"
              name="action"
              value="decline"
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 11,
                letterSpacing: "0.15em",
                textTransform: "uppercase",
                background: "transparent",
                color: "rgba(0,0,0,0.55)",
                border: "1px solid rgba(0,0,0,0.25)",
                padding: "14px 26px",
                cursor: "pointer",
              }}
            >
              Decline
            </button>
          </form>
        </>
      )}
    </Shell>
  );
}
