import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { parseBookingRequest } from "@/lib/booking-request";
import { computeQuote, type Quote } from "@/lib/quote";
import { bookingRef } from "@/lib/ref";
import { formatDateHuman, todayInLisbon } from "@/lib/date";
import { slotById, slotTimeLabel } from "@/data/booking";
import { spaceById } from "@/data/spaces";
import { packageById } from "@/data/pricing";
import { getCatalogue, getContact, getPricing } from "@/lib/data-source";
import type { MonthAvailability } from "@/data/availability";
import { eur } from "@/lib/money";
import { isDbConfigured } from "@/lib/db/client";
import { insertBooking } from "@/lib/db/requests";
import { readMonthAvailability } from "@/lib/db/availability";
import { deadLetter } from "@/lib/deadletter";
import { CONFIRM_LIMIT, rateLimited, wrongOrigin } from "@/lib/guard";
import { confirmUrl } from "@/lib/booking-token";

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

    // Recompute server-side. The client's number is advisory — and this is
    // the authoritative read of the live rate card, not the build's copy.
    const [pricing, catalogue] = await Promise.all([getPricing(), getCatalogue()]);

    const quote = computeQuote({
      slotId: r.slotId,
      spaceId: r.spaceId,
      packageId: r.packageId,
      date: r.date,
      addonIds: r.addonIds,
      equipment: r.equipment,
      bundleIds: r.bundleIds,
    }, {
      packages: pricing.packages,
      items: catalogue.allItems,
      bundles: catalogue.bundles,
      vatRate: pricing.vatRate,
      weekendMultiplier: pricing.weekendMultiplier,
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
    const pkg = packageById(pricing.packages, r.packageId);

    /*
     * Is the slot already gone?
     *
     * This check is now purely courtesy, not correctness: a request holds
     * nothing until the studio confirms it, so there is genuinely nothing for
     * two pending requests to conflict over. What it prevents is someone
     * filling in a brief for a day that is already confirmed for somebody
     * else. Skipping it when the read is unavailable is therefore safe.
     */
    const fresh = await readMonthAvailability(r.spaceId, r.date.slice(0, 7));
    if (!fresh.degraded) {
      if (fresh.days[r.date]?.slots[r.slotId] === "busy") {
        return NextResponse.json(
          {
            error: "SLOT_TAKEN",
            message: `${slot?.label ?? "That slot"} on ${formatDateHuman(r.date)} is already booked.`,
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
    }

    /*
     * Store the request.
     *
     * "recorded" means we have it, NOT that the slot is held — a request holds
     * nothing until a human approves it. Fails soft: losing an enquiry is far
     * worse than losing the record of one, so a database problem still takes
     * the booking, still emails the studio, and drops the raw payload into the
     * dead-letter store so nothing is unrecoverable.
     */
    let recorded = false;
    let deadLettered = false;

    if (isDbConfigured()) {
      try {
        const written = await insertBooking({
          ref,
          name: r.name,
          email: r.email,
          phone: r.phone,
          company: r.company,
          crewSize: r.crewSize,
          brief: r.brief,
          date: r.date,
          slotId: r.slotId,
          spaceId: r.spaceId,
          packageId: r.packageId,
          addonIds: r.addonIds,
          bundleIds: r.bundleIds,
          equipment: r.equipment,
          quote,
          idempotencyKey: r.idempotencyKey,
        });

        // The same submission arriving twice answers with the ORIGINAL
        // reference, which is what a retrying browser is expecting.
        if (written.duplicate) {
          return NextResponse.json({
            ok: true,
            ref: written.ref,
            total: quote.total,
            recorded: true,
          });
        }
        recorded = true;
      } catch (err) {
        console.error(`[BOOKING ${ref}] database write failed`, err);
        deadLettered = await deadLetter(ref, {
          ref,
          request: r,
          quote,
          at: new Date().toISOString(),
        });
      }
    } else {
      // No database: the payload still lands somewhere it can be replayed
      // from, rather than only in an email written for a human to read.
      deadLettered = await deadLetter(ref, {
        ref,
        request: r,
        quote,
        at: new Date().toISOString(),
        note: "DATABASE_URL was not set",
      });
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
      recorded,
      ts: new Date().toISOString(),
    });

    let emailSent = true;
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
        `Package: ${pkg?.name ?? r.packageId}  (${eur(quote.base.amount)})`,
        `Add-ons: ${addonList}`,
        "",
        gearLines.length ? "Equipment:" : "Equipment: —",
        ...gearLines,
        "",
        // Spelled out because studio rates are quoted ex-VAT: a bare total
        // would be ambiguous on an invoice.
        ...(quote.surcharge
          ? [`${quote.surcharge.label} surcharge: ${eur(quote.surcharge.amount)}`]
          : []),
        `Subtotal: ${eur(quote.subtotal)}`,
        `IVA ${Math.round(pricing.vatRate * 100)}%: ${eur(quote.vat)}`,
        `TOTAL INCL. IVA: ${eur(quote.total)}`,
        "",
        "Brief:",
        r.brief || "—",
        "",
        // So the message is not only readable but reconstructable: the labels
        // above are for a person, this is for whoever has to re-enter it.
        `Raw: ${JSON.stringify({ ref, ...r, serverTotal: quote.total })}`,
        "",
        /*
         * Never says "held": a request holds nothing until it is approved in
         * the panel. What this line reports is whether the studio can find it
         * there at all.
         */
        /*
         * The link, at last.
         *
         * confirmUrl() has been imported by this file since the day it was
         * written and never once called, so the email carried no way to answer
         * the request. Every booking therefore sat waiting forever. One line.
         */
        recorded
          ? `Approve or decline: ${confirmUrl(ref, r.date)}`
          : deadLettered
            ? "⚠ NOT in the panel. The request was saved to the recovery store; replay it from /admin."
            : "⚠ NOT stored anywhere but this email. Copy it somewhere safe.",
        recorded ? "Or open the board: /admin/requests" : "",
      ].join("\n");

      // The SDK RESOLVES with { error } for API failures rather than throwing,
      // so an unverified domain or a bad key would otherwise be invisible: the
      // booking would report success and nobody would ever be told about it.
      const { email: studioEmail } = await getContact();
      const sent = await resend.emails.send({
        from: "Kiddo Studio <noreply@kiddostudio.pt>",
        to: [studioEmail],
        replyTo: r.email,
        subject: `[Booking ${ref}] ${space?.label ?? r.spaceId} — ${formatDateHuman(r.date)} — ${r.name}`,
        text,
      });
      if (sent.error) {
        console.error(`[BOOKING ${ref}] notification email FAILED`, sent.error);
        emailSent = false;
      }
    } else {
      console.error(`[BOOKING ${ref}] RESEND_API_KEY unset — nobody was notified`);
      emailSent = false;
    }

    /*
     * The one combination nobody can recover from: the slot is not held AND no
     * email went out, so the booking exists only in this log line. Say so
     * loudly, and tell the customer honestly rather than showing a success card.
     */
    /*
     * The one combination nobody can recover from. It used to be "no calendar
     * hold and no email"; the dead-letter store is a third, independent place,
     * so all three have to fail at once now.
     */
    if (!recorded && !emailSent && !deadLettered) {
      console.error(`[BOOKING ${ref}] LOST — not stored, not emailed, not dead-lettered`);
      return NextResponse.json(
        {
          error:
            `We couldn't record your booking just now. Please email ${(await getContact()).email} — sorry about this.`,
        },
        { status: 502 }
      );
    }

    return NextResponse.json({ ok: true, ref, total: quote.total, recorded });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
