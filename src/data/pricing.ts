/**
 * Studio rental pricing — Phase 1 "Soft Launch".
 *
 * HAND-AUTHORED. This file is NOT part of the Notion equipment sync: the Notion
 * page covers equipment rental only. A sync must never overwrite these rates.
 * See src/data/equipment.ts for the synced side.
 *
 * EVERY AMOUNT HERE EXCLUDES VAT. The rate card quotes "€180 + IVA", so the
 * numbers are stored exactly as the studio wrote them and VAT is added at the
 * edge — see withVat() below and the booking summary. Storing VAT-inclusive
 * numbers would mean rounding twice and drifting from the studio's own sheet.
 */

import type {
  Addon,
  Duration,
  DurationId,
  Euros,
  PackageId,
  StudioPackage,
} from "./types";

/** Portugal, standard rate. */
export const VAT_RATE = 0.23;

/**
 * Standard studio hours. Anything before `open` or after `close` bills at the
 * off-hours overtime rate, whatever the day — which is why every TIME_SLOT in
 * booking.ts sits inside this window.
 */
export const STUDIO_DAY = { open: "09:00", close: "19:00" } as const;

/**
 * Charged after the fact, never booked in advance: overtime is "any time
 * extending past the agreed wrap time", which nobody can select up front.
 * Euros per hour, excluding VAT.
 */
export const OVERTIME = {
  /** Past the agreed wrap, inside standard hours. */
  standard: 35,
  /** Before STUDIO_DAY.open or after STUDIO_DAY.close, any day. */
  offHours: 55,
} as const;

/** Weekend and public-holiday surcharge. */
export const WEEKEND_MULTIPLIER = 1.2;

/** "+20% APPLIED" — derived so the badge can never contradict the maths. */
export const WEEKEND_BADGE = `+${Math.round(
  (WEEKEND_MULTIPLIER - 1) * 100
)}% APPLIED`;

export const DURATIONS: readonly Duration[] = [
  { id: "hd", label: "HALF DAY", hours: 4 },
  { id: "fd", label: "FULL DAY", hours: 10 },
];

export const DURATION_BY_ID: Record<DurationId, Duration> = Object.fromEntries(
  DURATIONS.map((d) => [d.id, d])
) as Record<DurationId, Duration>;

export const PACKAGES: readonly StudioPackage[] = [
  {
    id: "base",
    name: "BASE HIRE",
    tag: "PACKAGE 1",
    rates: { fd: 180, hd: 110 },
    includes: [
      "The studio space",
      "Heavy grip package — stands, sandbags, apple boxes",
      "3× Amaran Pano 120s, rigged to wash the background",
      "WiFi · coffee · sound",
    ],
    equipmentListUrl:
      "https://lightroom.adobe.com/shares/52db7e420609440fa469d6087a7dd491",
    cta: "BOOK BASE HIRE",
    homeBlurb: "Space, grip and background wash.",
  },
  {
    id: "full",
    name: "FULL HOUSE",
    tag: "PACKAGE 2",
    featured: true,
    rates: { fd: 260, hd: 160 },
    includes: [
      "Everything in Base Hire",
      "Aputure Storm 400 — key light",
      "Amaran 200 Bi — fill / hair light",
      "Our softboxes",
    ],
    equipmentListUrl:
      "https://lightroom.adobe.com/shares/b45c45161cc34b3f802b33105aafc053",
    cta: "BOOK FULL HOUSE",
    homeBlurb: "The full lighting kit, ready to shoot.",
  },
];

export const PACKAGE_BY_ID: Record<PackageId, StudioPackage> = Object.fromEntries(
  PACKAGES.map((p) => [p.id, p])
) as Record<PackageId, StudioPackage>;

/**
 * The package quoted before one is picked, and the duration quoted before a
 * slot is picked. The summary panel has always shown a price on an empty
 * selection; naming the defaults here stops them being re-invented as ternaries
 * somewhere else.
 */
export const DEFAULT_PACKAGE_ID: PackageId = "base";
export const DEFAULT_DURATION_ID: DurationId = "hd";

export function packageById(id: string | null | undefined): StudioPackage | undefined {
  return id ? PACKAGES.find((p) => p.id === id) : undefined;
}

/** Base studio price, EXCLUDING VAT. */
export function packagePrice(pkg: StudioPackage, durationId: DurationId): Euros {
  return pkg.rates[durationId];
}

/** Cheapest way into the studio — drives the pricing hero and "FROM" copy. */
export function entryPrice(): Euros {
  return Math.min(...PACKAGES.flatMap((p) => Object.values(p.rates)));
}

/** Cheapest full day, before any space upcharge. */
export function cheapestFullDay(): Euros {
  return Math.min(...PACKAGES.map((p) => p.rates.fd));
}

/* ── VAT ──────────────────────────────────────────────────────────────────
 * Rounded to whole euros, because the site has never rendered cents. Both
 * helpers round the SAME way so vatOf(n) + n always equals withVat(n) — if
 * they rounded independently the summary could show 180 + 41 = 222 next to a
 * total of 221.
 */

export function withVat(net: Euros): Euros {
  return Math.round(net * (1 + VAT_RATE));
}

export function vatOf(net: Euros): Euros {
  return withVat(net) - Math.round(net);
}

export const ADDONS: readonly Addon[] = [
  {
    id: "repaint",
    label: "EXTRA CYCLORAMA REPAINT",
    rate: { kind: "fixed", amount: 80, per: "unit" },
  },
  {
    id: "coord",
    label: "PRODUCTION COORDINATOR",
    rate: { kind: "fixed", amount: 180, per: "day" },
  },
  {
    id: "mu",
    label: "MAKEUP STATION + MIRROR",
    rate: { kind: "fixed", amount: 30, per: "day" },
  },
  { id: "greenroom", label: "GREEN ROOM RESET", rate: { kind: "free" } },
  {
    id: "bundle",
    label: "EQUIPMENT BUNDLE",
    // Entry price for gear packages; the concrete bundles live in equipment.ts.
    rate: { kind: "from", amount: 200, per: "unit" },
  },
  {
    id: "hold",
    label: "OVERNIGHT SET HOLD",
    rate: { kind: "fixed", amount: 100, per: "unit" },
  },
];

/**
 * Homepage CTA rows — a teaser, not the full table; "SEE ALL PRICING" carries
 * the rest. One row per package, quoting the full day.
 */
export const HOME_PRICING_ROWS = PACKAGES.map((p) => ({
  title: p.name,
  duration: DURATION_BY_ID.fd.label,
  price: `${p.rates.fd}€`,
  desc: p.homeBlurb,
  highlight: !!p.featured,
}));

export const FAQ = [
  {
    q: "What's included in studio rental?",
    a: "WiFi, coffee, sound, climate control, the heavy grip package, and a friendly human on call. Lighting depends on the package you pick.",
  },
  {
    q: "Do you offer crew?",
    a: "Yes. We have a roster of trusted DPs, gaffers, makeup artists and stylists.",
  },
  {
    q: "What happens if we run over?",
    a: `Overtime is billed automatically at ${OVERTIME.standard}€/h + IVA past the agreed wrap time. Before ${STUDIO_DAY.open} or after ${STUDIO_DAY.close} it is ${OVERTIME.offHours}€/h + IVA, whatever the day.`,
  },
  {
    q: "Do weekends cost more?",
    a: `Yes. Saturdays, Sundays and public holidays carry a +${Math.round(
      (WEEKEND_MULTIPLIER - 1) * 100
    )}% surcharge on studio time.`,
  },
  {
    q: "Can I store gear overnight?",
    a: "Overnight set hold is an add-on. Ask us if you need several days — we'll quote it.",
  },
  {
    q: "Cancellation policy?",
    a: "Full refund up to 7 days before. 50% within 7 days. We're reasonable — talk to us.",
  },
] as const;
