import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { getContact } from "@/lib/data-source";
import { isDbConfigured } from "@/lib/db/client";
import { insertMessage } from "@/lib/db/requests";
import { deadLetter } from "@/lib/deadletter";
import { bookingRef } from "@/lib/ref";
import { CONFIRM_LIMIT, rateLimited, wrongOrigin } from "@/lib/guard";

export const runtime = "nodejs";

/*
 * The sender stays hard-coded on purpose.
 *
 * noreply@kiddostudio.pt is the address Resend has verified for this domain.
 * Sending as anything else is rejected, so it is not something the panel may
 * change. The RECIPIENT is the studio's own address and does come from the
 * panel — that is the one that ever needs changing.
 */
const FROM = "Kiddo Studio <noreply@kiddostudio.pt>";

const LIMITS = { name: 200, email: 320, phone: 40, company: 200, subject: 200, message: 4000 };

function str(v: unknown, max: number): string {
  return typeof v === "string" ? v.trim().slice(0, max) : "";
}

/** Deliberately permissive — an over-strict regex rejects real addresses. */
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * A message from the contact form.
 *
 * It used to go only to the studio's inbox: nothing was stored, so a Resend
 * outage lost the enquiry outright and there was no record of who had ever
 * written in. It lands in the requests table now, alongside booking requests,
 * and shows up on the same board.
 *
 * The guards here were missing entirely — no origin check, no rate limit, no
 * email validation, no honeypot — on an endpoint that sends mail. They match
 * /api/booking now.
 */
export async function POST(req: NextRequest) {
  try {
    if (wrongOrigin(req)) {
      return NextResponse.json({ error: "Rejected" }, { status: 403 });
    }
    if (rateLimited(req, "contact", CONFIRM_LIMIT)) {
      return NextResponse.json(
        { error: "Too many messages. Try again in a little while." },
        { status: 429 }
      );
    }

    const body = (await req.json()) as Record<string, unknown>;

    // Same honeypot as the booking form: real people never fill this.
    if (str(body.website, 200)) {
      return NextResponse.json({ error: "Rejected" }, { status: 400 });
    }

    const name = str(body.name, LIMITS.name);
    const email = str(body.email, LIMITS.email);
    const message = str(body.message, LIMITS.message);
    const subject = str(body.subject, LIMITS.subject);
    const phone = str(body.phone, LIMITS.phone);
    const company = str(body.company, LIMITS.company);

    if (!name || !email || !message) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }
    if (!EMAIL.test(email)) {
      return NextResponse.json({ error: "That email address looks wrong" }, { status: 400 });
    }

    const ref = bookingRef();
    let recorded = false;
    let deadLettered = false;

    if (isDbConfigured()) {
      try {
        await insertMessage({ ref, name, email, phone, company, subject, message });
        recorded = true;
      } catch (err) {
        console.error(`[CONTACT ${ref}] database write failed`, err);
        deadLettered = await deadLetter(ref, {
          ref,
          kind: "message",
          name,
          email,
          phone,
          company,
          subject,
          message,
          at: new Date().toISOString(),
        });
      }
    }

    console.log("[CONTACT FORM]", { ref, name, email, subject, recorded, ts: new Date().toISOString() });

    let emailSent = false;
    if (process.env.RESEND_API_KEY) {
      const resend = new Resend(process.env.RESEND_API_KEY);
      const { email: studio } = await getContact();
      // The SDK RESOLVES with { error } rather than throwing, so an unverified
      // domain or a bad key would otherwise be invisible.
      const sent = await resend.emails.send({
        from: FROM,
        to: [studio],
        replyTo: email,
        subject: `[Contact ${ref}] ${subject || "New message"} — from ${name}`,
        text: [
          `Name: ${name}`,
          `Email: ${email}`,
          `Phone: ${phone || "—"}`,
          `Company: ${company || "—"}`,
          `Subject: ${subject || "—"}`,
          "",
          message,
          "",
          recorded
            ? `In the panel: yes — ${ref} at /admin/requests.`
            : "⚠ NOT in the panel. This email is the record.",
        ].join("\n"),
      });
      if (sent.error) {
        console.error(`[CONTACT ${ref}] notification email FAILED`, sent.error);
      } else {
        emailSent = true;
      }
    }

    // Nothing kept it: say so rather than showing a thank-you card.
    if (!recorded && !emailSent && !deadLettered) {
      console.error(`[CONTACT ${ref}] LOST — not stored, not emailed, not dead-lettered`);
      return NextResponse.json(
        {
          error: `We couldn't deliver your message just now. Please email ${
            (await getContact()).email
          } — sorry about this.`,
        },
        { status: 502 }
      );
    }

    return NextResponse.json({ ok: true, ref });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[CONTACT FORM] failed", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
