/**
 * The event vocabulary. A closed set, shared by the browser and the server.
 *
 * Closed on purpose. An open `track(anything)` becomes forty names with three
 * spellings of the same idea inside a month, and a dashboard that cannot be
 * trusted because nobody knows which spelling is current. Adding an event
 * means adding a line here, and the server refuses any name this file does not
 * list.
 *
 * NO PII, EVER. Enforced in four places and this is the first: the prop keys
 * each event may carry are declared, and the sanitiser drops everything else.
 * The others are the sanitiser's own deny-list, the 1KB column constraint, and
 * the rule that a path never carries a query string.
 */

/** The seven booking steps, in the order src/components/booking/steps.ts defines. */
export const FUNNEL_STEPS = [
  "space",
  "package",
  "date",
  "slot",
  "addons",
  "equipment",
  "details",
] as const;

export type FunnelStep = (typeof FUNNEL_STEPS)[number];

export const EVENT_NAMES = [
  "page_view",
  "cta_click",
  "outbound_click",
  "modal_open",
  "equipment_detail_open",
  "package_tour_open",
  "booking_step_view",
  "booking_step_back",
  "booking_step_complete",
  "booking_option",
  "booking_calendar_nav",
  "booking_submit_attempt",
  "booking_submitted",
  "booking_conflict",
  "booking_error",
  "contact_submit_attempt",
  "contact_submitted",
  "contact_error",
  "consent_decision",
] as const;

export type EventName = (typeof EVENT_NAMES)[number];

const NAMES = new Set<string>(EVENT_NAMES);

export function isEventName(v: unknown): v is EventName {
  return typeof v === "string" && NAMES.has(v);
}

/**
 * Prop keys that are allowed through, per event. Anything else is dropped
 * silently — a typo should cost one missing column on a chart, never a
 * rejected batch and never an unexpected value in the database.
 */
const ALLOWED: Record<EventName, readonly string[]> = {
  page_view: ["device"],
  cta_click: ["to", "label", "location"],
  outbound_click: ["kind", "host"],
  modal_open: ["name", "id"],
  equipment_detail_open: ["code", "category"],
  package_tour_open: ["package_id"],
  booking_step_view: [],
  booking_step_back: ["from_index"],
  booking_step_complete: ["choice"],
  booking_option: ["kind", "id", "action", "qty"],
  booking_calendar_nav: ["direction"],
  booking_submit_attempt: ["total_cents", "addon_count", "gear_count"],
  booking_submitted: ["total_cents"],
  booking_conflict: ["kind"],
  booking_error: ["status"],
  contact_submit_attempt: ["enquiry_type"],
  contact_submitted: ["enquiry_type"],
  contact_error: ["status"],
  consent_decision: ["analytics", "marketing"],
};

/**
 * Keys that must never appear, whatever the event.
 *
 * The allow-list above already excludes them, so this is a second lock on the
 * same door — and it is the one that holds if someone adds a key to ALLOWED
 * without thinking. A dashboard is not worth a name and an email address in a
 * table that was promised to hold neither.
 */
const FORBIDDEN = /email|e_mail|mail|phone|tel|name$|^name|first|last|surname|address|postcode|brief|message|password|token|ip\b/i;

export const MAX_PROP_CHARS = 120;

/**
 * Keeps the declared keys, drops the rest, and bounds what survives.
 *
 * Pure, so scripts/check-pulse.ts covers it without a browser or a database.
 */
export function sanitiseProps(
  name: EventName,
  props: unknown
): Record<string, string | number | boolean> {
  const out: Record<string, string | number | boolean> = {};
  if (!props || typeof props !== "object" || Array.isArray(props)) return out;

  const allowed = ALLOWED[name] ?? [];
  for (const [k, v] of Object.entries(props as Record<string, unknown>)) {
    if (!allowed.includes(k)) continue;
    if (FORBIDDEN.test(k)) continue;
    if (typeof v === "boolean") out[k] = v;
    else if (typeof v === "number" && Number.isFinite(v)) out[k] = v;
    else if (typeof v === "string" && v) out[k] = v.slice(0, MAX_PROP_CHARS);
  }
  return out;
}

/**
 * A path with no query string and no fragment, ever.
 *
 * /booking/confirm arrives from an email with a secret token in its query
 * string. One rule applied everywhere — paths only — is the only version of
 * that rule nobody forgets to apply.
 */
export function safePath(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const path = raw.split("?")[0].split("#")[0];
  if (!path.startsWith("/")) return null;
  return path.slice(0, 200);
}

/** A referrer reduced to its host. The rest can carry click ids and addresses. */
export function referrerHost(raw: string | null | undefined): string | null {
  if (!raw) return null;
  try {
    const h = new URL(raw).hostname.replace(/^www\./, "");
    return h ? h.slice(0, 120) : null;
  } catch {
    return null;
  }
}
