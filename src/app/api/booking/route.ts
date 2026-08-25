import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { parseBookingRequest } from "@/lib/booking-request";
import { computeQuote, type Quote } from "@/lib/quote";
import { bookingRef } from "@/lib/ref";
import { formatDateHuman, todayInLisbon } from "@/lib/date";
import { slotById, slotTimeLabel } from "@/data/booking";
import { spaceById } from "@/data/spaces";
import type { MonthAvailability } from "@/data/availability";
import { eur } from "@/lib/money";
import { isCalendarConfigured } from "@/lib/gcal/auth";
import { hasAllCalendars } from "@/lib/gcal/calendars";
import { readMonthAvailability } from "@/lib/gcal/availability";
import { createTentativeBooking } from "@/lib/gcal/events";
import { CONFIRM_LIMIT, rateLimited, wrongOrigin } from "@/lib/guard";

/** First item whose requested quantity exceeds what is left that day, if any. */
function equipmentShortage(
  fresh: MonthAvailability,
  date: string,
  quote: Quote
): string | null {
  if (fresh.degraded) return null;
  const remaining = fresh.equipmentRemaining[date];
  if (!remaining) return null;
  for (const line of quote.equipment) {
    const left = remaining[line.id];
    if (left !== undefined && line.qty > left) {
      return left === 0
        ? `${line.label} is no longer available on ${formatDateHuman(date)}.`
        : `Only ${left} × ${line.label} left on ${formatDateHuman(date)}.`;
    }
  }
  return null;
}

export async function POST(req: NextRequest) {
  try {
    // This endpoint writes to a real calendar — see src/lib/guard.ts.
    if (wrongOrigin(req)) {
      return NextResponse.json({ error: "Rejected" }, { status: 403 });
    }
    if (rateLimited(req, "confirm", CONFIRM_LIMIT)) {
      return NextResponse.json(
        { error: "Too many booking attempts. Try again in a little while." },
        { status: 429 }
      );
    }

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
     * Calendar write.
     *
     * Reads fail OPEN (see /api/availability), writes fail SOFT: on any Google
     * problem we still take the booking and still email the studio, but we
     * never claim the slot is held. Only a genuine conflict is a hard failure,
     * because that is the one case where proceeding would double-book.
     */
    let calendarBlocked = false;
    if (isCalendarConfigured() && hasAllCalendars()) {
      try {
        // Re-check immediately before writing. This does not close the race —
        // the window is a few hundred ms — but it catches the overwhelmingly
        // common case of a stale tab confirming a slot taken minutes ago.
        const fresh = await readMonthAvailability(r.spaceId, r.date.slice(0, 7));
        if (!fresh.degraded && fresh.days[r.date]?.slots[r.slotId] === "busy") {
          return NextResponse.json(
            {
              error: "SLOT_TAKEN",
              message: `${slot?.label ?? "That slot"} on ${formatDateHuman(r.date)} was just taken.`,
            },
            { status: 409 }
          );
        }

        const shortage = equipmentShortage(fresh, r.date, quote);
        if (shortage) {
          return NextResponse.json(
            { error: "EQUIPMENT_TAKEN", message: shortage },
            { status: 409 }
          );
        }

        const written = await createTentativeBooking({
          ref,
          idempotencyKey: r.idempotencyKey,
          date: r.date,
          slotId: r.slotId,
          spaceId: r.spaceId,
          name: r.name,
          email: r.email,
          company: r.company,
          crewSize: r.crewSize,
          brief: r.brief,
          quote,
        });

        // A repeated submission returns the original reference rather than
        // creating a second hold on the same slot.
        if (written.duplicateOfRef) {
          return NextResponse.json({
            ok: true,
            ref: written.duplicateOfRef,
            total: quote.total,
            calendarBlocked: true,
          });
        }
        calendarBlocked = written.ok;
      } catch (err) {
        // Do NOT fail the booking: losing an enquiry is worse than losing the
        // hold, and the email below carries a warning so nobody assumes the
        // slot is blocked.
        console.error("[GCAL] booking write failed", err);
        calendarBlocked = false;
      }
    }

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
