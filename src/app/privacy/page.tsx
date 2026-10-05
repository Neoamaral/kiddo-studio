/**
 * The privacy and cookie policy.
 *
 * ────────────────────────────────────────────────────────────────────────────
 *  THIS IS NOT LEGAL TEXT AND MUST BE REVIEWED BY A LAWYER BEFORE IT IS RELIED
 *  ON. What it IS, and the only thing it is engineered to be, is an accurate
 *  and exhaustive inventory of what this codebase actually does with a
 *  visitor's data — written from the source rather than from a template, so a
 *  lawyer is reviewing the truth instead of a guess.
 *
 *  Every sentence that makes a LEGAL claim rather than a factual one is marked
 *  {/* TODO LAWYER *\/} in the source. The open questions are listed at the
 *  bottom of this comment.
 * ────────────────────────────────────────────────────────────────────────────
 *
 * Sources of truth, so this page can be checked against the code:
 *   cookies ............ src/lib/analytics/consent.ts, src/lib/admin/auth.ts
 *   booking fields ..... db/migrations/001_bookings.sql, table `requests`
 *   client fields ...... db/migrations/001_bookings.sql, table `clients`
 *   erasure ............ src/lib/db/clients.ts, deleteClient()
 *   processors ......... package.json deps + vercel.json
 *   contact details .... getContact(), the same source the contact page uses,
 *                        so the address here can never drift from the real one
 *
 * OPEN QUESTIONS FOR THE LAWYER:
 *   1. The pre-consent buffer: events are held in volatile memory while the
 *      banner is open and sent only on accept, dropped on decline. Some DPAs
 *      prefer the stricter reading. It is one constant to flip.
 *   2. Whether an anonymous per-day page counter (no identifier of any kind)
 *      may run without consent as statistical measurement.
 *   3. Meta's controller-to-controller terms and the EU→US transfer basis for
 *      the Pixel and the Conversions API.
 *   4. Confirming the Neon database project is in an EU region. vercel.json
 *      pins compute to fra1; the database region is a separate setting.
 */

import Link from "next/link";
import { getContact } from "@/lib/data-source";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import PreferencesLink from "@/components/analytics/PreferencesLink";
import { kiddoColors } from "@/components/kiddo-assets/kiddoColors";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Privacy & Cookies — Kiddo Studio",
  description: "What we collect, why, and how to say no.",
  robots: { index: true, follow: true },
};

/** Last substantive change to this page. Bump it when the processing changes. */
const UPDATED = "5 October 2026";

const mono: React.CSSProperties = {
  fontFamily: "var(--font-mono)",
  fontSize: 9,
  letterSpacing: "0.25em",
  textTransform: "uppercase",
};

const body: React.CSSProperties = {
  fontFamily: "var(--font-body)",
  fontSize: 14,
  lineHeight: 1.75,
  color: "rgba(0,0,0,0.72)",
};

function H({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <h2
      id={id}
      style={{
        fontFamily: "var(--font-display)",
        fontSize: 26,
        textTransform: "uppercase",
        color: kiddoColors.black,
        margin: "38px 0 10px",
        scrollMarginTop: 90,
      }}
    >
      {children}
    </h2>
  );
}

function Row({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <tr>
      <td
        style={{
          ...mono,
          color: "rgba(0,0,0,0.5)",
          padding: "9px 14px 9px 0",
          verticalAlign: "top",
          whiteSpace: "nowrap",
          borderBottom: "1px solid rgba(0,0,0,0.08)",
        }}
      >
        {k}
      </td>
      <td
        style={{
          ...body,
          fontSize: 13,
          padding: "9px 0",
          borderBottom: "1px solid rgba(0,0,0,0.08)",
        }}
      >
        {v}
      </td>
    </tr>
  );
}

export default async function PrivacyPage() {
  const contact = await getContact();

  return (
    <>
      <Header />
      <main style={{ background: kiddoColors.cream }}>
        <div
          className="kiddo-container"
          style={{ paddingTop: 110, paddingBottom: 90, maxWidth: 760 }}
        >
          <p style={{ ...mono, color: "rgba(0,0,0,0.45)", marginBottom: 14 }}>
            LAST UPDATED {UPDATED}
          </p>
          <h1
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "clamp(44px, 7vw, 82px)",
              lineHeight: 0.92,
              textTransform: "uppercase",
              color: kiddoColors.black,
              marginBottom: 22,
            }}
          >
            Privacy &amp; cookies
          </h1>

          <p style={{ ...body, fontSize: 16 }}>
            Kiddo Studio runs this site. Below is everything it collects, why,
            and how to stop it. It is written from the code rather than from a
            template, so it says what actually happens.
          </p>

          {/* ── What is live today ─────────────────────────────────────── */}
          <H id="today">What runs right now</H>
          <p style={body}>
            Today this site <strong>measures nothing</strong>. It loads no
            third-party scripts, and the only cookies that exist are the two
            listed under Necessary below. Measurement and advertising
            measurement are being added; neither will run for you unless you
            choose it in the banner, and this page will be updated on the day
            they go live.
          </p>

          {/* ── Cookies ────────────────────────────────────────────────── */}
          <H id="cookies">Cookies and storage</H>
          <table style={{ width: "100%", borderCollapse: "collapse", marginTop: 6 }}>
            <tbody>
              <Row
                k="kiddo_consent"
                v={
                  <>
                    <strong>Necessary.</strong> Remembers the choice you make in
                    the banner so you are not asked again. Holds two yes/no
                    values and the date you chose. Kept 180 days.
                  </>
                }
              />
              <Row
                k="kiddo_admin"
                v={
                  <>
                    <strong>Necessary.</strong> Only ever set for studio staff
                    signing in to the admin panel. Expires after 8 hours. A
                    visitor never receives it.
                  </>
                }
              />
              <Row
                k="Analytics"
                v={
                  <>
                    <strong>Only if you accept.</strong> A random tab identifier
                    held in your browser&apos;s session storage, which is erased the
                    moment you close the tab. It is not a cookie and it cannot
                    recognise you on a later visit.
                  </>
                }
              />
              <Row
                k="_fbp, _fbc"
                v={
                  <>
                    <strong>Only if you accept marketing.</strong> Set by Meta so
                    a booking can be matched to an advert you clicked. Declining,
                    or withdrawing later, deletes them.
                  </>
                }
              />
            </tbody>
          </table>

          <div style={{ marginTop: 18 }}>
            <PreferencesLink />
          </div>

          {/* ── Measurement ────────────────────────────────────────────── */}
          <H id="analytics">Measurement, if you accept it</H>
          <p style={body}>
            With your consent the site records which pages are read, which
            buttons are pressed, which step of the booking form people stop at,
            and where the visit came from (the website that linked to you, and
            any campaign tag in the address). Each record carries a random tab
            identifier that dies with the tab.
          </p>
          <p style={{ ...body, marginTop: 10 }}>
            It does <strong>not</strong> record your IP address, your browser
            fingerprint, your name, your email, anything you typed into a form,
            or any identifier that would recognise you on a later visit or on
            another website. {/* TODO LAWYER: confirm this framing of "anonymous"
            against CNPD guidance before relying on it. */}
          </p>

          {/* ── Booking and enquiries ──────────────────────────────────── */}
          <H id="booking">When you book or write to us</H>
          <p style={body}>
            This part has nothing to do with the banner: it is the information
            you hand over on purpose so the studio can answer you.
          </p>
          <table style={{ width: "100%", borderCollapse: "collapse", marginTop: 10 }}>
            <tbody>
              <Row
                k="Booking"
                v="Your name, email, phone, company, crew size and brief, together with the date, slot, space, package, extras and equipment you chose, and the quote as it stood when you sent it."
              />
              <Row
                k="Enquiry"
                v="Your name, email, phone, the kind of enquiry and your message."
              />
              <Row
                k="Client record"
                v="Repeat enquiries from the same email are grouped so the studio can see your history, with the studio's own notes and tags."
              />
            </tbody>
          </table>
          <p style={{ ...body, marginTop: 12 }}>
            It is used to answer you, to hold the studio on the day, and to
            invoice. It is not sold, and it is not used for advertising unless
            you accepted marketing above.{" "}
            {/* TODO LAWYER: state the lawful basis — contract for the booking,
                legitimate interest or consent for the enquiry. */}
          </p>

          {/* ── Who else sees it ───────────────────────────────────────── */}
          <H id="processors">Who else handles it</H>
          <table style={{ width: "100%", borderCollapse: "collapse", marginTop: 6 }}>
            <tbody>
              <Row k="Vercel" v="Hosts the site. Servers set to Frankfurt." />
              <Row
                k="Neon"
                v={
                  <>
                    The database holding bookings and enquiries.{" "}
                    {/* TODO: confirm the project region is in the EU. */}
                  </>
                }
              />
              <Row k="Resend" v="Sends the confirmation emails." />
              <Row
                k="Meta"
                v="Only if you accept marketing. Receives that a booking happened and, hashed beyond recovery, your email and phone so it can match the booking to an advert."
              />
            </tbody>
          </table>

          {/* ── How long ───────────────────────────────────────────────── */}
          <H id="retention">How long it is kept</H>
          <p style={body}>
            Measurement records: 180 days, then deleted. Totals with no personal
            data in them are kept indefinitely. Bookings and enquiries: for as
            long as the studio needs them for its accounts and its own records.{" "}
            {/* TODO LAWYER: give the actual retention period the studio applies. */}
          </p>

          {/* ── Your rights ────────────────────────────────────────────── */}
          <H id="rights">Your rights</H>
          <p style={body}>
            You can ask for a copy of what is held about you, ask for it to be
            corrected, ask for it to be erased, object to its use, or withdraw a
            consent you gave — withdrawing is as easy as giving it, from the
            footer of any page. Write to{" "}
            <a href={contact.mailtoHref} style={{ color: kiddoColors.black }}>
              {contact.email}
            </a>
            .
          </p>
          <p style={{ ...body, marginTop: 10 }}>
            Withdrawing consent stops any further measurement at once and
            deletes the advertising cookies. Records already collected are not
            removed automatically — ask at the address above and they will be.
          </p>
          <p style={{ ...body, marginTop: 10 }}>
            If you think this is being handled badly you can complain to the{" "}
            <a
              href="https://www.cnpd.pt/"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: kiddoColors.black }}
            >
              CNPD
            </a>
            , the Portuguese data protection authority.
          </p>

          {/* ── Who we are ─────────────────────────────────────────────── */}
          <H id="who">Who we are</H>
          <p style={body}>
            Kiddo Studio
            <br />
            {contact.addressLine}
            <br />
            {contact.addressRegion}
            <br />
            <a href={contact.mailtoHref} style={{ color: kiddoColors.black }}>
              {contact.email}
            </a>
            {" · "}
            <a href={contact.telHref} style={{ color: kiddoColors.black }}>
              {contact.phone}
            </a>
          </p>

          <p style={{ ...mono, color: "rgba(0,0,0,0.35)", marginTop: 40 }}>
            <Link href="/" style={{ color: "inherit" }}>
              ← BACK TO THE STUDIO
            </Link>
          </p>
        </div>
      </main>
      <Footer contact={contact} />
    </>
  );
}
