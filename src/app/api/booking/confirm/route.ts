import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { TokenError, verifyBookingToken } from "@/lib/booking-token";
import { confirmBooking, declineBooking, findBooking } from "@/lib/gcal/events";
import { purgeAvailability } from "@/lib/gcal/availability";
import { isCalendarConfigured } from "@/lib/gcal/auth";
import { hasAllCalendars } from "@/lib/gcal/calendars";
import { slotById, slotTimeLabel } from "@/data/booking";
import { spaceById } from "@/data/spaces";
import { formatDateHuman } from "@/lib/date";
import { eur } from "@/lib/money";
import { wrongOrigin } from "@/lib/guard";

/**
 * The studio confirming or declining a booking request.
 *
 * POST, never GET. Mail clients and security scanners routinely prefetch links
 * in an email; a GET that confirmed would confirm every booking the moment the
 * message arrived. The emailed link opens a page, and the page posts here.
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

    if (!isCalendarConfigured() || !hasAllCalendars()) {
      return redirect(
        req,
        `/booking/confirm?error=${encodeURIComponent("Calendar is not configured")}`
      );
    }

    const booking = await findBooking(payload.r, payload.d);
    if (!booking) {
      return redirect(
        req,
        `/booking/confirm?error=${encodeURIComponent(
          "That request is no longer in the calendar — it may have been declined already."
        )}`
      );
    }

    if (action === "decline") {
      await declineBooking(booking);
      purgeAvailability();
      return redirect(req, `/booking/confirm?done=declined&ref=${booking.ref}`);
    }

    await confirmBooking(booking);
    // Before the redirect, so the page the studio lands on already reflects it.
    purgeAvailability();
    await notifyClient(booking);
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
 * undo a confirmation that already happened in the calendar.
 */
async function notifyClient(booking: {
  ref: string;
  date: string;
  slotId: string;
  spaceId: string;
  name: string;
  email: string;
  total: string;
  description: string;
}): Promise<void> {
  if (!process.env.RESEND_API_KEY || !booking.email) {
    console.error(`[CONFIRM ${booking.ref}] client not emailed`);
    return;
  }
  const slot = slotById(booking.slotId);
  const space = spaceById(booking.spaceId);

  // The gear list already reads well in the calendar description; reuse it
  // rather than re-deriving a second, divergent rendering of the same booking.
  const gear = booking.description.split("Equipment:")[1]?.split("TOTAL:")[0]?.trim();

  const text = [
    `Hi ${booking.name.split(" ")[0] || "there"},`,
    "",
    "Your booking at Kiddo Studio is confirmed.",
    "",
    `Ref:    ${booking.ref}`,
    `Date:   ${formatDateHuman(booking.date)}`,
    `Time:   ${slot ? `${slot.label} · ${slotTimeLabel(slot)}` : booking.slotId}`,
    `Space:  ${space?.label ?? booking.spaceId}`,
    gear ? `\nEquipment:\n${gear}` : "",
    "",
    `Total:  ${eur(Number(booking.total) || 0)} (VAT included, invoiced after)`,
    "",
    "Anything to change, just reply to this email.",
    "",
    "See you in the studio,",
    "Kiddo Studio",
  ]
    .filter((l) => l !== "")
    .join("\n");

  const sent = await new Resend(process.env.RESEND_API_KEY).emails.send({
    from: "Kiddo Studio <noreply@kiddostudio.pt>",
    to: [booking.email],
    replyTo: "studio@kiddostudio.pt",
    subject: `Booking confirmed — ${formatDateHuman(booking.date)} · ${space?.label ?? ""} (${booking.ref})`,
    text,
  });
  if (sent.error) {
    console.error(`[CONFIRM ${booking.ref}] client email FAILED`, sent.error);
  }
}
