/**
 * Studio rental pricing — Phase 1 "Soft Launch".
 *
 * SOURCE OF TRUTH: the admin panel, which stores the rate card in Vercel Blob.
 * ./pricing.source.json is the SEED — what the site serves until the first
 * save, and the fallback if the store cannot be reached.
 *
 * derivePricing() takes the rate card as an ARGUMENT rather than reading the
 * import, because it now arrives at request time. There are deliberately no
 * module-level `export const` prices: a component that kept importing one
 * would render the numbers baked in at build and never update.
 *
 * EVERY AMOUNT EXCLUDES VAT. The rate card quotes "€180 + IVA", so the
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
  PricingSource,
  StudioPackage,
} from "./types";
import source from "./pricing.source.json";

/*
 * The cast mirrors what equipment.ts does with its own source file: a JSON
 * import widens `kind: "fixed"` to `kind: string`, which no longer satisfies
 * the Rate union. Anything actually malformed is caught by the validator on
 * the way in, which is the only place it can be caught at all.
 */
const data = source as unknown as PricingSource;

/** Every number and list the site renders, derived from one rate card. */
export interface PricingView {
  vatRate: number;
  studioDay: PricingSource["studioDay"];
  overtime: PricingSource["overtime"];
  weekendMultiplier: number;
  /** "+20% APPLIED" — derived so the badge can never contradict the maths. */
  weekendBadge: string;
  durations: readonly Duration[];
  durationById: Record<DurationId, Duration>;
  packages: readonly StudioPackage[];
  packageById: Record<PackageId, StudioPackage>;
  addons: readonly Addon[];
  /** Homepage teaser rows, one per package, quoting the full day. */
  homeRows: readonly {
    title: string;
    duration: string;
    price: string;
    desc: string;
    highlight: boolean;
  }[];
  /** Answers computed from the rates above, so they cannot go stale. */
  faq: readonly { q: string; a: string }[];
}

export function derivePricing(data: PricingSource): PricingView {
  const durationById = Object.fromEntries(
    data.durations.map((d) => [d.id, d])
  ) as Record<DurationId, Duration>;

  const packageById = Object.fromEntries(
    data.packages.map((p) => [p.id, p])
  ) as Record<PackageId, StudioPackage>;

  const percent = Math.round((data.weekendMultiplier - 1) * 100);

  return {
    vatRate: data.vatRate,
    studioDay: data.studioDay,
    overtime: data.overtime,
    weekendMultiplier: data.weekendMultiplier,
    weekendBadge: `+${percent}% APPLIED`,
    durations: data.durations,
    durationById,
    packages: data.packages,
    packageById,
    addons: data.addons,
    homeRows: data.packages.map((p) => ({
      title: p.name,
      duration: durationById.fd?.label ?? "FULL DAY",
      price: `${p.rates.fd}€`,
      desc: p.homeBlurb,
      highlight: !!p.featured,
    })),
    faq: buildFaq(data),
  };
}

/** The rate card shipped in the repository. The seed, and the fallback. */
export const SEED_PRICING_SOURCE: PricingSource = data;
export const SEED_PRICING: PricingView = derivePricing(data);

/**
 * The package quoted before one is picked, and the duration quoted before a
 * slot is picked. The summary panel has always shown a price on an empty
 * selection; naming the defaults here stops them being re-invented as ternaries
 * somewhere else.
 */
export const DEFAULT_PACKAGE_ID: PackageId = "base";
export const DEFAULT_DURATION_ID: DurationId = "hd";

export function packageById(
  packages: readonly StudioPackage[],
  id: string | null | undefined
): StudioPackage | undefined {
  return id ? packages.find((p) => p.id === id) : undefined;
}

/** Base studio price, EXCLUDING VAT. */
export function packagePrice(pkg: StudioPackage, durationId: DurationId): Euros {
  return pkg.rates[durationId];
}

/** Cheapest way into the studio — drives the pricing hero and "FROM" copy. */
export function entryPrice(packages: readonly StudioPackage[]): Euros {
  return Math.min(...packages.flatMap((p) => Object.values(p.rates)));
}

/** Cheapest full day, before any space upcharge. */
export function cheapestFullDay(packages: readonly StudioPackage[]): Euros {
  return Math.min(...packages.map((p) => p.rates.fd));
}

/* ── VAT ──────────────────────────────────────────────────────────────────
 * Rounded to whole euros, because the site has never rendered cents. Both
 * helpers round the SAME way so vatOf(n) + n always equals withVat(n) — if
 * they rounded independently the summary could show 180 + 41 = 222 next to a
 * total of 221.
 */

export function withVat(net: Euros, vatRate: number): Euros {
  return Math.round(net * (1 + vatRate));
}

export function vatOf(net: Euros, vatRate: number): Euros {
  return withVat(net, vatRate) - Math.round(net);
}

/**
 * Built from the rate card, not written out: every answer below quotes a
 * number that the panel can change, and a frozen string would start lying the
 * first time someone did.
 */
function buildFaq(d: PricingSource): { q: string; a: string }[] {
  return [
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
      a: `Overtime is billed automatically at ${d.overtime.standard}€/h + IVA past the agreed wrap time. Before ${d.studioDay.open} or after ${d.studioDay.close} it is ${d.overtime.offHours}€/h + IVA, whatever the day.`,
    },
    {
      q: "Do weekends cost more?",
      a: `Yes. Saturdays, Sundays and public holidays carry a +${Math.round(
        (d.weekendMultiplier - 1) * 100
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
  ];
}
