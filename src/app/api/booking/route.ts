import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, email, phone, date, space, slot, crewSize, brief, addons } = body;

    if (!name || !email || !date || !space || !slot) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    console.log("[BOOKING REQUEST]", { ...body, ts: new Date().toISOString() });

    if (process.env.RESEND_API_KEY) {
      const resend = new Resend(process.env.RESEND_API_KEY);
      const addonList = addons ? Object.entries(addons).filter(([, v]) => v).map(([k]) => k).join(", ") : "—";
      await resend.emails.send({
        from: "Kiddo Studio <noreply@kiddostudio.pt>",
        to: ["studio@kiddostudio.pt"],
        replyTo: email,
        subject: `[Booking] ${space} — ${date} — ${name}`,
        text: `BOOKING REQUEST\n\nName: ${name}\nEmail: ${email}\nPhone: ${phone || "—"}\nDate: ${date}\nSpace: ${space}\nSlot: ${slot}\nCrew: ${crewSize || "—"}\nAdd-ons: ${addonList}\n\nProject notes:\n${brief || "—"}`,
      });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
