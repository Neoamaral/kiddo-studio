import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { parseBookingRequest } from "@/lib/booking-request";
import { computeQuote } from "@/lib/quote";
import { bookingRef } from "@/lib/ref";
import { formatDateHuman, todayInLisbon } from "@/lib/date";
import { slotById, slotTimeLabel } from "@/data/booking";
import { spaceById } from "@/data/spaces";
import { eur } from "@/lib/money";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const parsed = parseBookingRequest(body, todayInLisbon());
    if (!parsed.ok) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }
    const r = parsed.value;

    // Recompute server-side. The client's number is advisory.
    const quote = computeQuote({
      slotId: r.slotId,
      spaceId: r.spaceId,
      addonIds: r.addonIds,
      equipment: r.equipment,
      bundleIds: r.bundleIds,
    });

    if (quote.unknownIds.length > 0) {
      return NextResponse.json(
        { error: `Unknown option: ${quote.unknownIds.join(", ")}` },
        { status: 400 }
      );
    }

    // A mismatch is worth knowing about but not worth rejecting: this is an
    // enquiry, not a payment, and a stale tab must not lose a booking.
    if (r.clientTotal !== null && r.clientTotal !== quote.total) {
      console.warn(
        `[BOOKING] total mismatch — client ${r.clientTotal}, server ${quote.total}`
      );
    }

    const ref = bookingRef();
    const slot = slotById(r.slotId);
    const space = spaceById(r.spaceId);

    /*
     * PHASE 2 inserts a tentative Google Calendar event here and sets this from
     * the result. Until then every booking is honestly "not yet blocked", and
     * the success card reads "we'll confirm by email" rather than "you're
     * booked" — which is what the old code claimed even on a 500.
     */
    const calendarBlocked = false;

    const gearLines = [
      ...quote.bundles.map((b) => `  ${b.label} — ${eur(b.amount)}`),
      ...quote.equipment.map(
        (e) => `  ${e.label}${e.qty > 1 ? ` ×${e.qty}` : ""} — ${eur(e.amount)}`
      ),
    ];

    console.log("[BOOKING REQUEST]", {
      ref,
      ...r,
      serverTotal: quote.total,
      calendarBlocked,
      ts: new Date().toISOString(),
    });

    if (process.env.RESEND_API_KEY) {
      const resend = new Resend(process.env.RESEND_API_KEY);
      const addonList = quote.addons.length
        ? quote.addons.map((a) => a.label).join(", ")
        : "—";

      const text = [
        `BOOKING REQUEST — ${ref}`,
        "",
        `Name: ${r.name}`,
        `Email: ${r.email}`,
        `Company: ${r.company || "—"}`,
        `Crew: ${r.crewSize || "—"}`,
        "",
        `Date: ${formatDateHuman(r.date)}  (${r.date})`,
        `Slot: ${slot ? `${slot.label} · ${slotTimeLabel(slot)}` : r.slotId}`,
        `Space: ${space?.label ?? r.spaceId}`,
        `Add-ons: ${addonList}`,
        "",
        gearLines.length ? "Equipment:" : "Equipment: —",
        ...gearLines,
        "",
        `TOTAL: ${eur(quote.total)}`,
        "",
        "Brief:",
        r.brief || "—",
        "",
        calendarBlocked
          ? "Calendar: slot held (tentative)."
          : "⚠ Calendar: NOT blocked — add this to the studio calendar by hand.",
      ].join("\n");

      await resend.emails.send({
        from: "Kiddo Studio <noreply@kiddostudio.pt>",
        to: ["studio@kiddostudio.pt"],
        replyTo: r.email,
        subject: `[Booking ${ref}] ${space?.label ?? r.spaceId} — ${formatDateHuman(r.date)} — ${r.name}`,
        text,
      });
    }

    return NextResponse.json({ ok: true, ref, total: quote.total, calendarBlocked });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
