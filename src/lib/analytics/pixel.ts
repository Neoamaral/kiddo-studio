/**
 * Firing a Meta event from the browser, safely.
 *
 * Three guards, and all three matter:
 *
 *   1. fbq may not exist. TagLoaders only creates it after marketing consent,
 *      so on most page loads it is simply absent.
 *   2. The consent may have been WITHDRAWN since the page loaded. fbq survives
 *      in memory until the reload, so checking for its existence is not enough.
 *   3. This runs in event handlers inside try-less call sites, so it must
 *      never throw. A booking must not fail because an advertising pixel did.
 *
 * eventId is the booking ref, and the server sends the SAME value as event_id
 * through the Conversions API. Meta collapses the pair into one event. Without
 * it the studio sees two leads per booking and a cost-per-lead that reads half
 * of what it really is.
 */

import { allowsMarketing } from "./consent";

export function pixelLead(eventId: string, valueEuros: number): void {
  try {
    if (typeof window === "undefined") return;
    if (!allowsMarketing()) return;
    const fbq = window.fbq;
    if (typeof fbq !== "function") return;
    fbq("track", "Lead", { currency: "EUR", value: valueEuros }, { eventID: eventId });
  } catch {
    // Deliberately silent. Nothing a visitor does should be affected by this.
  }
}
