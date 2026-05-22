import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, email, phone, date, space, duration, crewSize, message } = body;

    if (!name || !email || !date || !space || !duration) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    console.log("[BOOKING REQUEST]", { ...body, ts: new Date().toISOString() });

    if (process.env.RESEND_API_KEY) {
      const resend = new Resend(process.env.RESEND_API_KEY);
      await resend.emails.send({
        from: "Kiddo Studio <noreply@kiddostudio.pt>",
        to: ["studio@kiddostudio.pt"],
        replyTo: email,
        subject: `[Booking] ${space} — ${date} — ${name}`,
        text: `BOOKING REQUEST\n\nName: ${name}\nEmail: ${email}\nPhone: ${phone || "—"}\nDate: ${date}\nSpace: ${space}\nDuration: ${duration}\nCrew: ${crewSize || "—"}\n\nProject notes:\n${message || "—"}`,
      });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
