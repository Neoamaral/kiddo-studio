/**
 * Shared data types for pricing, equipment and spaces.
 *
 * OWNERSHIP BOUNDARY
 *   - Equipment rental rates come from Notion ("EQUIP RENTAL PRICES — WEB")
 *     via src/data/equipment.source.json. Do not hand-edit those.
 *   - Studio tiers, add-ons and spaces are hand-authored in src/data/pricing.ts
 *     and src/data/spaces.ts. A Notion sync must never clobber them.
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
 * Sourced from Notion but ALWAYS stored locally: Notion file URLs are signed
 * and expire in about an hour, so hotlinking one would break the page
 * silently. See scripts/sync-equipment.md.
 */
export interface EquipmentPhoto {
  /** e.g. "/images/equipment/cam-01/01.jpg". Lowercase; never an http(s) URL. */
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
  /** User-visible SKU, e.g. "CAM-01". Stable across Notion syncs. */
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

/** One flat row as transcribed from Notion. */
export interface EquipmentSourceRow {
  code: string;
  category: string;
  name: string;
  spec: string;
  rate: Rate;
  inStock: number;
  hot?: boolean;
  /** Original Notion cell text — keeps the price parse auditable in review. */
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
  };
  rows: EquipmentSourceRow[];
}

/* ── Studio pricing ──────────────────────────────────────────────────────── */

export type TierId = "h" | "hd" | "fd" | "md";

export interface PricingTier {
  id: TierId;
  name: string;
  rate: Rate;
  /** Minimum commitment copy, e.g. "4 HOURS". */
  min: string;
  tag: string;
  featured?: boolean;
  /** Whether the weekend multiplier applies. Replaces `t.id !== "md"`. */
  scalable: boolean;
  /** Hours of studio access this tier buys; drives the booking base price. */
  hours: number | null;
  bullets: readonly string[];
  cta: string;
  /** Short copy for the homepage 3-row summary. */
  homeBlurb: string;
}

export interface Addon {
  id: string;
  label: string;
  rate: Rate;
}

/* ── Spaces ──────────────────────────────────────────────────────────────── */

export interface StudioSpace {
  id: string;
  label: string;
  desc: string;
  img: string;
  /** Euros added to any booking base price. Drives "+40€" AND "FROM 320€/DAY". */
  upcharge: Euros;
  /** Selectable in the booking flow? (prop room / creative area are not) */
  bookable: boolean;
}

/* ── Booking ─────────────────────────────────────────────────────────────── */

export interface TimeSlot {
  id: string;
  label: string;
  /** Display only, e.g. "08:00 — 12:00". */
  time: string;
  note: string;
  /** Which pricing tier this slot bills at. Kills `slot === "fd" ? 280 : 140`. */
  tierId: TierId;
}
