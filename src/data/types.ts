/**
 * Shared data types for pricing, equipment and spaces.
 *
 * OWNERSHIP BOUNDARY
 *   - The equipment catalogue (src/data/equipment.source.json) and the studio
 *     rate card (src/data/pricing.source.json) are written by the admin panel.
 *     Edit them there, not by hand — a hand edit is fine but will be overwritten
 *     by the next save from the panel.
 *   - The quick bundles live inside the equipment document, so they are
 *     written by the panel too. They used to be a const in equipment.ts; a
 *     bundle names catalogue codes, and only one document can keep those two
 *     in step without a race.
 *   - Everything else here — spaces, category metadata, helper functions — is
 *     code, and changes in code.
 *
 * Notion is no longer upstream of the equipment catalogue. The sync never ran
 * (_meta.syncedAt was always empty) and the panel is the source of truth now.
 */

/** Whole euros. The site has never rendered cents; keep it that way. */
export type Euros = number;

export type RatePeriod = "hour" | "halfDay" | "day" | "week" | "unit";

/**
 * A price as meaning, not as text. Display strings are derived in
 * src/lib/money.ts so the "€ suffix, no space" convention lives in one place.
 */
export type Rate =
  | { kind: "fixed"; amount: Euros; per: RatePeriod }
  | { kind: "from"; amount: Euros; per: RatePeriod }
  | { kind: "free" }
  | { kind: "onRequest" };

/* ── Equipment ───────────────────────────────────────────────────────────── */

/**
 * One equipment photo.
 *
 * This used to say the src is ALWAYS in the repository and never hot-linked,
 * on the grounds that an upload URL is signed and expires. In practice the
 * studio uploads through the panel and the catalogue now holds PUBLIC Vercel
 * Blob URLs — which are not signed and do not expire, so the reasoning did not
 * apply to them. Nothing enforced the rule anyway.
 *
 * Both shapes are live and both work, for one reason worth keeping in mind:
 * the gallery renders a plain <img>, not next/image. next.config declares no
 * images.remotePatterns, so switching to next/image would make the optimiser
 * reject every blob URL and blank the photos on /equipment and /booking alike.
 */
export interface EquipmentPhoto {
  /** A repo path ("/images/…") or a public blob URL. Never a signed one. */
  src: string;
  /** Required and non-empty. Describes the gear, not the file. */
  alt: string;
  /**
   * Intrinsic pixels. Optional — the gallery stage is ratio-fixed, so these
   * are not needed to prevent layout shift. Populate when known.
   */
  width?: number;
  height?: number;
  /** Optional mono caption, house style: "FIG. 02 — REAR I/O". */
  caption?: string;
}

export interface EquipmentItem {
  /** User-visible SKU, e.g. "CAM-01". Stable; the photo folder derives from it. */
  code: string;
  name: string;
  spec: string;
  rate: Rate;
  /** Units physically available. Stock bars clamp to STOCK_BAR_MAX. */
  inStock: number;
  hot?: boolean;
  /** Display order IS array order; index 0 is the cover. Absent means none. */
  photos?: readonly EquipmentPhoto[];
  /** Long-form copy for the detail modal. Falls back to `spec` when absent. */
  description?: string;
}

export interface EquipmentCategory {
  /** 3-letter code; also the filter-tab label. */
  code: string;
  /** Ledger heading, e.g. "CAMERA · BODIES". */
  cat: string;
  /** Hero details-bar label, e.g. "CAMERAS". */
  shortLabel: string;
  /** Hero details-bar noun: "bodies" renders as "5 bodies". */
  unitNoun: string;
  items: readonly EquipmentItem[];
  // NOTE: no `count` field — it is items.length.
}

/** A named gear bundle sold as an add-on; members are item codes. */
export interface EquipmentBundle {
  id: string;
  label: string;
  memberCodes: readonly string[];
  /** Explicit price. If absent, derived as the sum of member rates. */
  rate?: Rate;
}

/** One flat row of the catalogue. Flat so the shape survives re-grouping. */
export interface EquipmentSourceRow {
  code: string;
  category: string;
  name: string;
  spec: string;
  rate: Rate;
  inStock: number;
  hot?: boolean;
  /** Original imported text, when a row came from elsewhere. Kept for audit. */
  sourceRaw?: string;
  photos?: EquipmentPhoto[];
  description?: string;
}

export interface EquipmentSource {
  _meta: {
    source: string;
    notionPageId: string;
    syncedAt: string;
    rowCount: number;
    vatIncluded: boolean;
    notes?: string;
    /** Total photos across all rows. Cross-checked by validate-equipment.ts. */
    photoCount?: number;
    /** Last photo download. Separate from syncedAt — prices change far more often. */
    photosSyncedAt?: string;
    /** How many bundles. Cross-checked, like rowCount and photoCount. */
    bundleCount?: number;
  };
  rows: EquipmentSourceRow[];
  /**
   * The quick bundles, editable in the admin panel.
   *
   * OPTIONAL because documents written before bundles moved out of code have
   * no such key. readEquipment() fills it from the seed in that case — see the
   * note there, and why an explicit empty array must NOT be overwritten.
   */
  bundles?: EquipmentBundle[];
}

/* ── Studio pricing ──────────────────────────────────────────────────────── */

/**
 * Phase 1 "Soft Launch" sells a MATRIX, not a ladder: which kit you get
 * (package) times how long you get it (duration). The old single `TierId` could
 * not express that — 180€ is not "a tier", it is Base Hire for a full day.
 */
export type PackageId = "base" | "full";
export type DurationId = "hd" | "fd";

/** How much studio time a hire buys. */
export interface Duration {
  id: DurationId;
  /** "FULL DAY" */
  label: string;
  hours: number;
}

export interface StudioPackage {
  id: PackageId;
  /** "BASE HIRE" */
  name: string;
  /** "PACKAGE 1" */
  tag: string;
  featured?: boolean;
  /**
   * Euros EXCLUDING VAT, by duration. Every studio price on the site is
   * derived from this — there is no second place a rate is written down.
   */
  rates: Readonly<Record<DurationId, Euros>>;
  /** What the hire includes, one bullet per line. */
  includes: readonly string[];
  /** Lightroom gallery showing the exact kit. */
  equipmentListUrl: string;
  cta: string;
  /** Short copy for the homepage summary rows. */
  homeBlurb: string;
}

export interface Addon {
  id: string;
  label: string;
  rate: Rate;
}

/**
 * The studio rate card as stored on disk.
 *
 * Split out of pricing.ts so the admin panel has something it can safely
 * write: that file also holds helper FUNCTIONS, and no panel should be
 * generating TypeScript.
 */
export interface PricingSource {
  _meta: {
    source: string;
    /** ISO instant of the last save. */
    updatedAt: string;
  };
  /** 0.23 for Portugal's standard rate. */
  vatRate: number;
  /** 1.2 = +20% on weekends and public holidays. */
  weekendMultiplier: number;
  /** Standard hours, "HH:MM". Outside these, off-hours overtime applies. */
  studioDay: { open: string; close: string };
  /** Euros per hour, excluding VAT. */
  overtime: { standard: Euros; offHours: Euros };
  durations: Duration[];
  packages: StudioPackage[];
  addons: Addon[];
}

/* ── Contact ─────────────────────────────────────────────────────────────── */

/** One social profile. `url` is what the link opens; `handle` is what it shows. */
export interface SocialLink {
  id: string;
  /** "INSTAGRAM" */
  label: string;
  /** "@kiddo.studio" */
  handle: string;
  url: string;
}

/**
 * Everything the studio publishes about how to reach it.
 *
 * Written by the admin panel. One record, used by the contact page, the home
 * location band, the footer, the hero coordinates AND the address that booking
 * and contact emails are delivered to — so there is one place to change when
 * the studio moves or the phone number changes.
 */
export interface ContactSource {
  _meta: { source: string; updatedAt: string };
  /** Shown on the site AND where enquiries are delivered. */
  email: string;
  emailNote: string;
  phone: string;
  phoneNote: string;
  address: {
    street: string;
    postcode: string;
    city: string;
    country: string;
  };
  /** e.g. "Free parking" — appended to the coordinates line. */
  addressNote: string;
  coordinates: { lat: number; lon: number };
  whatsapp: { handle: string; url: string; note: string };
  social: SocialLink[];
}

/* ── Spaces ──────────────────────────────────────────────────────────────── */

/** A physical room. `both` is a PRODUCT that occupies two of these. */
export type ResourceId = "room-cyc" | "room-blk";

export interface StudioSpace {
  id: string;
  label: string;
  desc: string;
  img: string;
  /** Euros added to any booking base price. Drives "+40€" AND "FROM 220€/DAY". */
  upcharge: Euros;
  /** Selectable in the booking flow? (prop room / creative area are not) */
  bookable: boolean;
  /**
   * Physical rooms this product occupies. Availability = EVERY listed resource
   * free; booking writes to every one. This is what makes "book the cyclorama
   * blocks BOTH but leaves the black box free" fall out with no special case.
   */
  resourceIds: readonly ResourceId[];
}

/* ── Booking ─────────────────────────────────────────────────────────────── */

export interface TimeSlot {
  id: string;
  label: string;
  /** Local wall clock in Europe/Lisbon, "HH:MM". Machine value. */
  startLocal: string;
  /** Local wall clock, "HH:MM", exclusive. */
  endLocal: string;
  note: string;
  /**
   * How much studio time this slot buys. Combined with the chosen package it
   * gives the base price, so no component ever hardcodes one.
   */
  durationId: DurationId;
}
