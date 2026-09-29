import Link from "next/link";
import { getCatalogue, getContact, getPricing } from "@/lib/data-source";
import { isDbConfigured } from "@/lib/db/client";
import { listBoard } from "@/lib/db/requests";
import { listDeadLetters } from "@/lib/deadletter";
import { todayInLisbon } from "@/lib/date";

export const dynamic = "force-dynamic";

const card: React.CSSProperties = {
  border: "1px solid rgba(0,0,0,0.15)",
  background: "#fff",
  padding: 22,
  textDecoration: "none",
  color: "#1A1A1A",
  display: "block",
};

const kicker: React.CSSProperties = {
  fontFamily: "var(--font-mono)",
  fontSize: 10,
  letterSpacing: "0.2em",
};

const figure: React.CSSProperties = {
  fontFamily: "var(--font-display)",
  fontSize: 40,
  lineHeight: 1.1,
};

const note: React.CSSProperties = {
  fontFamily: "var(--font-body)",
  fontSize: 13,
  color: "rgba(0,0,0,0.55)",
};

export default async function AdminHome() {
  const [catalogue, pricing, contact] = await Promise.all([
    getCatalogue(),
    getPricing(),
    getContact(),
  ]);

  /*
   * The board and the recovery store are read defensively. This page is the
   * first thing the studio sees, so a database blip must leave it usable rather
   * than showing an error where the navigation should be.
   */
  let waiting = 0;
  let confirmed = 0;
  let nextShoot: string | null = null;
  let boardFailed = false;
  if (isDbConfigured()) {
    try {
      const cards = await listBoard();
      const today = todayInLisbon();
      waiting = cards.filter((c) => c.status === "new" || c.status === "talking").length;
      confirmed = cards.filter((c) => c.status === "confirmed").length;
      nextShoot =
        cards
          .filter((c) => c.status === "confirmed" && c.date && c.date >= today)
          .map((c) => c.date as string)
          .sort()[0] ?? null;
    } catch {
      boardFailed = true;
    }
  }

  let deadLetters: { pathname: string }[] = [];
  try {
    deadLetters = await listDeadLetters();
  } catch {
    // Housekeeping only. Not worth a visible error.
  }

  return (
    <>
      <h1
        style={{
          fontFamily: "var(--font-display)",
          fontSize: 30,
          textTransform: "uppercase",
          marginBottom: 20,
        }}
      >
        Overview
      </h1>

      {!isDbConfigured() && (
        <div
          role="status"
          style={{
            background: "#fff",
            border: "1px solid rgba(0,0,0,0.2)",
            padding: "12px 14px",
            marginBottom: 16,
            fontFamily: "var(--font-body)",
            fontSize: 13,
            lineHeight: 1.6,
          }}
        >
          The database is not connected, so requests, the calendar and clients
          are empty. Equipment, pricing and contact details still work — they
          live elsewhere.
        </div>
      )}

      {boardFailed && (
        <div
          role="alert"
          style={{
            background: "#FDECEF",
            border: "1px solid #B00020",
            color: "#7A0016",
            padding: "12px 14px",
            marginBottom: 16,
            fontFamily: "var(--font-body)",
            fontSize: 13,
            lineHeight: 1.6,
          }}
        >
          The database did not answer just now. Bookings taken while it is down
          are kept in the recovery store and can be replayed — nothing is lost.
        </div>
      )}

      {deadLetters.length > 0 && (
        <div
          role="alert"
          style={{
            background: "#FDECEF",
            border: "1px solid #B00020",
            color: "#7A0016",
            padding: "12px 14px",
            marginBottom: 16,
            fontFamily: "var(--font-body)",
            fontSize: 13,
            lineHeight: 1.6,
          }}
        >
          <strong>
            {deadLetters.length} request{deadLetters.length === 1 ? "" : "s"} in the
            recovery store.
          </strong>{" "}
          These arrived while the database was unreachable, so they are not on
          the board. They are safe, and each one is a complete record — the
          studio&apos;s notification email for each carries the same payload.
        </div>
      )}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))",
          gap: 14,
        }}
      >
        <Link href="/admin/requests" style={card}>
          <span style={kicker}>REQUESTS WAITING</span>
          <div style={figure}>{waiting}</div>
          <span style={note}>
            {confirmed} confirmed
            {nextShoot ? ` · next ${nextShoot}` : ""}
          </span>
        </Link>

        <Link href="/admin/calendar" style={card}>
          <span style={kicker}>CALENDAR</span>
          <div style={{ ...figure, fontSize: 22, marginTop: 8 }}>
            {nextShoot ?? "Nothing booked"}
          </div>
          <span style={note}>The studio&apos;s own — block days here</span>
        </Link>

        <Link href="/admin/clients" style={card}>
          <span style={kicker}>CLIENTS</span>
          <div style={{ ...figure, fontSize: 22, marginTop: 8 }}>
            Who has asked
          </div>
          <span style={note}>History, spend and notes</span>
        </Link>

        <Link href="/admin/equipment" style={card}>
          <span style={kicker}>EQUIPMENT</span>
          <div style={figure}>{catalogue.totalItems}</div>
          <span style={note}>items in {catalogue.totalCategories} categories</span>
        </Link>

        <Link href="/admin/pricing" style={card}>
          <span style={kicker}>PRICING</span>
          <div style={figure}>{pricing.packages.length}</div>
          <span style={note}>studio packages</span>
        </Link>

        <Link href="/admin/contact" style={card}>
          <span style={kicker}>CONTACT</span>
          <div style={{ ...figure, fontSize: 19, lineHeight: 1.3, marginTop: 6 }}>
            {contact.email}
          </div>
          <span style={note}>{contact.addressLine} — and where enquiries arrive</span>
        </Link>
      </div>

      <p
        style={{
          fontFamily: "var(--font-body)",
          fontSize: 13,
          color: "rgba(0,0,0,0.55)",
          lineHeight: 1.7,
          marginTop: 26,
          maxWidth: 560,
        }}
      >
        Saving publishes straight away — there is no rebuild to wait for. A
        request holds nothing until you confirm it on the board, and confirming
        takes the room within a few seconds.
      </p>
    </>
  );
}
