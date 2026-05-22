import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";

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
      await resend.emails.send({
        from: "Kiddo Studio <noreply@kiddostudio.pt>",
        to: ["studio@kiddostudio.pt"],
        replyTo: email,
        subject: `[Contact] ${subject || "New message"} — from ${name}`,
        text: `Name: ${name}\nEmail: ${email}\nSubject: ${subject || "—"}\n\nMessage:\n${message}`,
      });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
