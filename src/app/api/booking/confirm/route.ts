import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { TokenError, verifyBookingToken } from "@/lib/booking-token";
import { isDbConfigured } from "@/lib/db/client";
import { confirmBooking, releaseBooking } from "@/lib/db/holds";
import { getRequest, setStatus, type RequestDetail } from "@/lib/db/requests";
import { slotById, slotTimeLabel } from "@/data/booking";
import { spaceById } from "@/data/spaces";
import { formatDateHuman } from "@/lib/date";
import { eur } from "@/lib/money";
import { wrongOrigin } from "@/lib/guard";
import { getContact } from "@/lib/data-source";

export const runtime = "nodejs";

/**
 * The studio confirming or declining, from the emailed link.
 *
 * The panel does the same job at /admin/requests. This exists so a request can
 * be answered from a phone, in the inbox, without signing in — which for a
 * one-person studio is the difference between answering in a minute and
 * answering that evening.
 *
 * POST, never GET. Mail clients and security scanners routinely prefetch links
 * in an email; a GET that confirmed would confirm every booking the moment the
 * message arrived. The emailed link opens a page, and the page posts here.
 *
 * DECLINING NO LONGER DESTROYS THE REQUEST. It used to delete the calendar
 * event, so a refused enquiry evaporated and nobody could see what had been
 * turned away. It becomes a LOST card now, with the reason recorded.
 */
export async function POST(req: NextRequest) {
  try {
    if (wrongOrigin(req)) {
      return NextResponse.json({ error: "Rejected" }, { status: 403 });
    }

    const form = await req.formData();
    const token = String(form.get("t") ?? "");
    const action = String(form.get("action") ?? "");

    if (action !== "confirm" && action !== "decline") {
      return NextResponse.json({ error: "Unknown action" }, { status: 400 });
    }

    let payload;
    try {
      payload = verifyBookingToken(token);
    } catch (err) {
      const message = err instanceof TokenError ? err.message : "Invalid link";
      return redirect(req, `/booking/confirm?error=${encodeURIComponent(message)}`);
    }

    if (!isDbConfigured()) {
      return redirect(
        req,
        `/booking/confirm?error=${encodeURIComponent("The database is not connected")}`
      );
    }

    const booking = await getRequest(payload.r);
    if (!booking) {
      return redirect(
        req,
        `/booking/confirm?error=${encodeURIComponent(
          "That request is no longer on the board — it may have been erased."
        )}`
      );
    }

    if (action === "decline") {
      // The room goes back, and the card keeps the history.
      await releaseBooking(booking.ref);
      await setStatus(booking.ref, "lost", "Declined from the email link");
      return redirect(req, `/booking/confirm?done=declined&ref=${booking.ref}`);
    }

    const result = await confirmBooking(booking.ref);

    if (!result.ok) {
      if (result.reason === "clash") {
        const who = result.clashes
          .map((c) => c.ref ?? c.label ?? "another booking")
          .filter((v, i, a) => a.indexOf(v) === i)
          .join(", ");
        return redirect(
          req,
          `/booking/confirm?error=${encodeURIComponent(
            `That slot is already taken by ${who}. Nothing was changed.`
          )}`
        );
      }
      return redirect(
        req,
        `/booking/confirm?error=${encodeURIComponent("That request cannot be confirmed.")}`
      );
    }

    // Only on the first confirmation. A second click must not email the client
    // twice — the studio clicking again is not news to them.
    if (!result.alreadyConfirmed) {
      await notifyClient(booking);
    }
    return redirect(req, `/booking/confirm?done=confirmed&ref=${booking.ref}`);
  } catch (err) {
    console.error("[CONFIRM] failed", err);
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

function redirect(req: NextRequest, path: string) {
  return NextResponse.redirect(new URL(path, req.url), { status: 303 });
}

/**
 * Tell the client their booking is on. Best effort: a failed email must not
 * undo a confirmation that has already happened.
 */
async function notifyClient(booking: RequestDetail): Promise<void> {
  if (!process.env.RESEND_API_KEY || !booking.email) {
    console.error(`[CONFIRM ${booking.ref}] client not emailed`);
    return;
  }
  const slot = booking.slotId ? slotById(booking.slotId) : null;
  const space = booking.spaceId ? spaceById(booking.spaceId) : null;

  /*
   * The gear list comes off the FROZEN quote, not from re-pricing the booking.
   * It used to be scraped out of the calendar event's prose with a string
   * split that looked for "TOTAL:" while the writer emitted "TOTAL INCL.
   * IVA:" — so it never matched and the block ran to the end of the text.
   */
  const gear = [
    ...(booking.quote?.bundles ?? []).map((b) => `  ${b.label}`),
    ...(booking.quote?.equipment ?? []).map(
      (e) => `  ${e.label}${e.qty > 1 ? ` ×${e.qty}` : ""}`
    ),
  ];

  const text = [
    `Hi ${(booking.name ?? "").split(" ")[0] || "there"},`,
    "",
    "Your booking at Kiddo Studio is confirmed.",
    "",
    `Ref:    ${booking.ref}`,
    `Date:   ${booking.date ? formatDateHuman(booking.date) : "—"}`,
    `Time:   ${slot ? `${slot.label} · ${slotTimeLabel(slot)}` : (booking.slotId ?? "—")}`,
    `Space:  ${space?.label ?? booking.spaceId ?? "—"}`,
    ...(gear.length ? ["", "Equipment:", ...gear] : []),
    "",
    `Total:  ${eur((booking.totalCents ?? 0) / 100)} (incl. IVA, invoiced after)`,
    "",
    "Anything to change, just reply to this email.",
    "",
    "See you in the studio,",
    "Kiddo Studio",
  ].join("\n");

  const sent = await new Resend(process.env.RESEND_API_KEY).emails.send({
    from: "Kiddo Studio <noreply@kiddostudio.pt>",
    to: [booking.email],
    // Replies go to the studio, not into the noreply void.
    replyTo: (await getContact()).email,
    subject: `Booking confirmed — ${
      booking.date ? formatDateHuman(booking.date) : ""
    } · ${space?.label ?? ""} (${booking.ref})`,
    text,
  });
  if (sent.error) {
    console.error(`[CONFIRM ${booking.ref}] client email FAILED`, sent.error);
  }
}
