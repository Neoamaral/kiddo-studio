import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { getContact } from "@/lib/data-source";

/*
 * The sender stays hard-coded on purpose.
 *
 * noreply@kiddostudio.pt is the address Resend has verified for this domain.
 * Sending as anything else is rejected, so it is not something the panel may
 * change. The RECIPIENT is the studio's own address and does come from the
 * panel — that is the one that ever needs changing.
 */
const FROM = "Kiddo Studio <noreply@kiddostudio.pt>";


export async function POST(req: NextRequest) {
  try {
    const { name, email, subject, message } = await req.json();

    if (!name || !email || !message) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Log submission server-side always
    console.log("[CONTACT FORM]", { name, email, subject, message, ts: new Date().toISOString() });

    // Send email if Resend is configured
    if (process.env.RESEND_API_KEY) {
      const resend = new Resend(process.env.RESEND_API_KEY);
      // Resolves with { error } instead of throwing — an unverified domain
      // would otherwise silently swallow every enquiry.
      const { email: studio } = await getContact();
      const sent = await resend.emails.send({
        from: FROM,
        to: [studio],
        replyTo: email,
        subject: `[Contact] ${subject || "New message"} — from ${name}`,
        text: `Name: ${name}\nEmail: ${email}\nSubject: ${subject || "—"}\n\nMessage:\n${message}`,
      });
      if (sent.error) {
        console.error("[CONTACT FORM] notification email FAILED", sent.error);
      }
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
