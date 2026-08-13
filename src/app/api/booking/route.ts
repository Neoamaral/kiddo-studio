import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { computeQuote } from "@/lib/quote";
import { selectedAddonIds } from "@/data/booking";
import { eur } from "@/lib/money";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, email, phone, date, space, slot, crewSize, brief, addons } =
      body;

    if (!name || !email || !date || !space || !slot) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const addonIds =
      addons && typeof addons === "object" ? selectedAddonIds(addons) : [];

    // Recompute server-side rather than trusting the client's total.
    const quote = computeQuote({ slotId: slot, spaceId: space, addonIds });

    if (quote.unknownIds.length > 0) {
      return NextResponse.json(
        { error: `Unknown option: ${quote.unknownIds.join(", ")}` },
        { status: 400 }
      );
    }

    // A mismatch usually means a browser tab was open across a price change.
    // Log it and go with the server figure — this is an enquiry, not a payment,
    // so rejecting would lose a real booking over a stale tab.
    if (typeof body.total === "number" && body.total !== quote.total) {
      console.warn(
        `[BOOKING TOTAL MISMATCH] client=${body.total} server=${quote.total}`
      );
    }

    console.log("[BOOKING REQUEST]", {
      ...body,
      serverTotal: quote.total,
      ts: new Date().toISOString(),
    });

    if (process.env.RESEND_API_KEY) {
      const resend = new Resend(process.env.RESEND_API_KEY);
      const lines = [
        `${quote.base.label}: ${eur(quote.base.amount)}`,
        ...(quote.space
          ? [`Space upgrade · ${quote.space.label}: ${eur(quote.space.amount)}`]
          : []),
        ...quote.addons.map((a) => `${a.label}: ${eur(a.amount)}`),
      ].join("\n");

      await resend.emails.send({
        from: "Kiddo Studio <noreply@kiddostudio.pt>",
        to: ["studio@kiddostudio.pt"],
        replyTo: email,
        subject: `[Booking] ${space} — ${date} — ${name}`,
        text: `BOOKING REQUEST\n\nName: ${name}\nEmail: ${email}\nPhone: ${phone || "—"}\nDate: ${date}\nSpace: ${space}\nSlot: ${slot}\nCrew: ${crewSize || "—"}\n\nQUOTE\n${lines}\nTOTAL: ${eur(quote.total)}\n\nProject notes:\n${brief || "—"}`,
      });
    }

    return NextResponse.json({ ok: true, total: quote.total });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
