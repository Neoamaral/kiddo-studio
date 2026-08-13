/**
 * Studio rental pricing — tiers, add-ons and FAQ.
 *
 * HAND-AUTHORED. This file is NOT part of the Notion equipment sync: the Notion
 * page covers equipment rental only. A sync must never overwrite these rates.
 * See src/data/equipment.ts for the synced side.
 */

import type { Addon, PricingTier, Rate, TierId } from "./types";
import { rateAmount } from "@/lib/money";

/** Weekend surcharge applied to every scalable tier. */
export const WEEKEND_MULTIPLIER = 1.2;

/** "+20% APPLIED" — derived so the badge can never contradict the maths. */
export const WEEKEND_BADGE = `+${Math.round(
  (WEEKEND_MULTIPLIER - 1) * 100
)}% APPLIED`;

export const PRICING_TIERS: readonly PricingTier[] = [
  {
    id: "h",
    name: "HOURLY",
    rate: { kind: "fixed", amount: 40, per: "hour" },
    min: "MIN. 2H",
    tag: "QUICK PLAY",
    scalable: true,
    hours: null,
    bullets: [
      "Full access to the space",
      "Basic lighting kit included",
      "WiFi · coffee · sound",
      "+1 free prep hour",
    ],
    cta: "BOOK BY THE HOUR",
    homeBlurb: "Need less time?",
  },
  {
    id: "hd",
    name: "HALF DAY",
    rate: { kind: "fixed", amount: 140, per: "halfDay" },
    min: "4 HOURS",
    tag: "MOST FLEXIBLE",
    scalable: true,
    hours: 4,
    bullets: [
      "Everything in Hourly",
      "Cyclorama OR Black Box",
      "Free parking spot",
      "Light setup support",
    ],
    cta: "BOOK HALF DAY",
    homeBlurb: "Perfect for quick shoots.",
  },
  {
    id: "fd",
    name: "FULL DAY",
    rate: { kind: "fixed", amount: 280, per: "day" },
    min: "8 HOURS",
    tag: "MOST POPULAR",
    featured: true,
    scalable: true,
    hours: 8,
    bullets: [
      "Both spaces · all day",
      "Prop room access",
      "Lunch arranged on request",
      "Late checkout possible",
    ],
    cta: "BOOK FULL DAY",
    homeBlurb: "Time to create.",
  },
  {
    id: "md",
    name: "MULTI-DAY",
    rate: { kind: "from", amount: 700, per: "day" },
    min: "3+ DAYS",
    tag: "BIG BUILDS",
    /** Quoted custom, so the weekend multiplier does not apply. */
    scalable: false,
    hours: null,
    bullets: [
      "Custom rates",
      "Dedicated coordinator",
      "Equipment included",
      "Build days available",
    ],
    cta: "ASK FOR QUOTE",
    homeBlurb: "Big builds and multi-day productions.",
  },
];

export const TIER_BY_ID: Record<TierId, PricingTier> = Object.fromEntries(
  PRICING_TIERS.map((t) => [t.id, t])
) as Record<TierId, PricingTier>;

/**
 * The unit shown beside the giant price on a ticket: "€/h" · "€" · "€+".
 *
 * Studio tiers quote the day and half-day rates BARE ("280€", not "280€/day") —
 * only the hourly rate carries a period. That differs from the equipment ledger,
 * which always shows "/day", so this does not reuse periodSuffix().
 */
export function tierUnit(rate: Rate): string {
  const per = rate.kind === "fixed" || rate.kind === "from" ? rate.per : "unit";
  return `€${per === "hour" ? "/h" : ""}${rate.kind === "from" ? "+" : ""}`;
}

/** Ticket price after the weekend multiplier. Non-scalable tiers pass through. */
export function tierDisplayPrice(tier: PricingTier, multiplier: number): number {
  const base = rateAmount(tier.rate) ?? 0;
  return tier.scalable ? Math.round(base * multiplier) : base;
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
 * Homepage CTA rows. Order is intentional (half day, full day, hourly) and
 * differs from the ticket order. `duration` is blank for hourly — the homepage
 * hides the parenthetical when it is empty.
 */
export const HOME_PRICING_ROWS = (["hd", "fd", "h"] as const).map((id) => {
  const t = TIER_BY_ID[id];
  return {
    title: t.name,
    duration: t.hours ? `${t.hours} HOURS` : "",
    price: `${rateAmount(t.rate) ?? 0}${tierUnit(t.rate)}`,
    desc: t.homeBlurb,
    highlight: !!t.featured,
  };
});

export const FAQ = [
  {
    q: "What's included in studio rental?",
    a: "WiFi, coffee, basic lighting, sound system, climate control, and a friendly human on call.",
  },
  {
    q: "Do you offer crew?",
    a: "Yes. We have a roster of trusted DPs, gaffers, makeup artists and stylists.",
  },
  {
    q: "Can I store gear overnight?",
    a: "Multi-day bookings include overnight storage. Single-day shoots can lock-up for a small fee.",
  },
  {
    q: "Cancellation policy?",
    a: "Full refund up to 7 days before. 50% within 7 days. We're reasonable — talk to us.",
  },
  { q: "Do you provide catering?", a: "We don't, but we know who to call." },
  {
    q: "How early can I arrive to set up?",
    a: "Pre-shoot prep hour included. Earlier access available at 30€/h.",
  },
] as const;
